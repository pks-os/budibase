import { v4 as uuidv4 } from "uuid"
import { testAutomation } from "../../../api/routes/tests/utilities/TestFunctions"
import {} from "../../steps/createRow"
import { BUILTIN_ACTION_DEFINITIONS } from "../../actions"
import { TRIGGER_DEFINITIONS } from "../../triggers"
import {
  LoopStepInputs,
  DeleteRowStepInputs,
  UpdateRowStepInputs,
  CreateRowStepInputs,
  Automation,
  AutomationTrigger,
  AutomationResults,
  SmtpEmailStepInputs,
  ExecuteQueryStepInputs,
  QueryRowsStepInputs,
  AutomationActionStepId,
  AutomationTriggerStepId,
  AutomationStep,
  AutomationTriggerDefinition,
  RowDeletedTriggerInputs,
  RowDeletedTriggerOutputs,
  RowUpdatedTriggerOutputs,
  RowUpdatedTriggerInputs,
  RowCreatedTriggerInputs,
  RowCreatedTriggerOutputs,
  AppActionTriggerOutputs,
  CronTriggerOutputs,
  AppActionTriggerInputs,
  AutomationStepInputs,
  AutomationTriggerInputs,
  ServerLogStepInputs,
} from "@budibase/types"
import {} from "../../steps/loop"
import TestConfiguration from "../../../tests/utilities/TestConfiguration"
import * as setup from "../utilities"

type TriggerOutputs =
  | RowCreatedTriggerOutputs
  | RowUpdatedTriggerOutputs
  | RowDeletedTriggerOutputs
  | AppActionTriggerOutputs
  | CronTriggerOutputs
  | undefined

class AutomationBuilder {
  private automationConfig: Automation = {
    name: "",
    definition: {
      steps: [],
      trigger: {} as AutomationTrigger,
    },
    type: "automation",
    appId: setup.getConfig().getAppId(),
  }
  private config: TestConfiguration = setup.getConfig()
  private triggerOutputs: TriggerOutputs
  private triggerSet: boolean = false

  constructor(options: { name?: string } = {}) {
    this.automationConfig.name = options.name || `Test Automation ${uuidv4()}`
  }

  // TRIGGERS
  rowSaved(inputs: RowCreatedTriggerInputs, outputs: RowCreatedTriggerOutputs) {
    this.triggerOutputs = outputs
    return this.trigger(
      TRIGGER_DEFINITIONS.ROW_SAVED,
      AutomationTriggerStepId.ROW_SAVED,
      inputs,
      outputs
    )
  }

  rowUpdated(
    inputs: RowUpdatedTriggerInputs,
    outputs: RowUpdatedTriggerOutputs
  ) {
    this.triggerOutputs = outputs
    return this.trigger(
      TRIGGER_DEFINITIONS.ROW_UPDATED,
      AutomationTriggerStepId.ROW_UPDATED,
      inputs,
      outputs
    )
  }

  rowDeleted(
    inputs: RowDeletedTriggerInputs,
    outputs: RowDeletedTriggerOutputs
  ) {
    this.triggerOutputs = outputs
    return this.trigger(
      TRIGGER_DEFINITIONS.ROW_DELETED,
      AutomationTriggerStepId.ROW_DELETED,
      inputs,
      outputs
    )
  }

  appAction(outputs: AppActionTriggerOutputs, inputs?: AppActionTriggerInputs) {
    this.triggerOutputs = outputs
    return this.trigger(
      TRIGGER_DEFINITIONS.APP,
      AutomationTriggerStepId.APP,
      inputs,
      outputs
    )
  }

  // STEPS
  createRow(inputs: CreateRowStepInputs): this {
    return this.step(
      AutomationActionStepId.CREATE_ROW,
      BUILTIN_ACTION_DEFINITIONS.CREATE_ROW,
      inputs
    )
  }

  updateRow(inputs: UpdateRowStepInputs): this {
    return this.step(
      AutomationActionStepId.UPDATE_ROW,
      BUILTIN_ACTION_DEFINITIONS.UPDATE_ROW,
      inputs
    )
  }

  deleteRow(inputs: DeleteRowStepInputs): this {
    return this.step(
      AutomationActionStepId.DELETE_ROW,
      BUILTIN_ACTION_DEFINITIONS.DELETE_ROW,
      inputs
    )
  }

  sendSmtpEmail(inputs: SmtpEmailStepInputs): this {
    return this.step(
      AutomationActionStepId.SEND_EMAIL_SMTP,
      BUILTIN_ACTION_DEFINITIONS.SEND_EMAIL_SMTP,
      inputs
    )
  }

  executeQuery(inputs: ExecuteQueryStepInputs): this {
    return this.step(
      AutomationActionStepId.EXECUTE_QUERY,
      BUILTIN_ACTION_DEFINITIONS.EXECUTE_QUERY,
      inputs
    )
  }

  queryRows(inputs: QueryRowsStepInputs): this {
    return this.step(
      AutomationActionStepId.QUERY_ROWS,
      BUILTIN_ACTION_DEFINITIONS.QUERY_ROWS,
      inputs
    )
  }
  loop(inputs: LoopStepInputs): this {
    return this.step(
      AutomationActionStepId.LOOP,
      BUILTIN_ACTION_DEFINITIONS.LOOP,
      inputs
    )
  }

  serverLog(input: ServerLogStepInputs): this {
    return this.step(
      AutomationActionStepId.SERVER_LOG,
      BUILTIN_ACTION_DEFINITIONS.SERVER_LOG,
      input
    )
  }

  private trigger<TStep extends AutomationTriggerStepId>(
    triggerSchema: AutomationTriggerDefinition,
    stepId: TStep,
    inputs?: AutomationTriggerInputs<TStep>,
    outputs?: TriggerOutputs
  ): this {
    if (this.triggerSet) {
      throw new Error("Only one trigger can be set for an automation.")
    }

    this.automationConfig.definition.trigger = {
      ...triggerSchema,
      stepId,
      inputs: inputs || ({} as any),
      id: uuidv4(),
    }
    this.triggerOutputs = outputs
    this.triggerSet = true

    return this
  }

  private step<TStep extends AutomationActionStepId>(
    stepId: TStep,
    stepSchema: Omit<AutomationStep, "id" | "stepId" | "inputs">,
    inputs: AutomationStepInputs<TStep>
  ): this {
    this.automationConfig.definition.steps.push({
      ...stepSchema,
      inputs: inputs as any,
      id: uuidv4(),
      stepId,
    })
    return this
  }

  async run() {
    const automation = await this.config.createAutomation(this.automationConfig)
    const results = await testAutomation(
      this.config,
      automation,
      this.triggerOutputs
    )
    return this.processResults(results)
  }

  private processResults(results: { body: AutomationResults }) {
    results.body.steps.shift()
    return {
      trigger: results.body.trigger,
      steps: results.body.steps,
    }
  }
}

export function createAutomationBuilder(options?: { name?: string }) {
  return new AutomationBuilder(options)
}
