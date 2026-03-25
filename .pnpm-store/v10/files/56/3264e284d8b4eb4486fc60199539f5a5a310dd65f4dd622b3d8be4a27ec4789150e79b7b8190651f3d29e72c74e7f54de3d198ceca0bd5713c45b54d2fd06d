import { BaseChain } from "../../chains/base.cjs";
import { LLMChain } from "../../chains/llm_chain.cjs";
import { BaseOutputParser } from "@langchain/core/output_parsers";
import { ChainValues } from "@langchain/core/utils/types";
import { CallbackManager } from "@langchain/core/callbacks/manager";

//#region src/experimental/plan_and_execute/base.d.ts

/**
 * Represents an action to be performed in a step.
 */
type StepAction = {
  text: string;
};
/**
 * Represents the result of a step.
 */
type StepResult = {
  response: string;
};
/**
 * Represents a step, which includes an action and its result.
 */
type Step = {
  action: StepAction;
  result: StepResult;
};
/**
 * Represents a plan, which is a sequence of step actions.
 */
type Plan = {
  steps: StepAction[];
};
/**
 * Abstract class that defines the structure for a planner. Planners are
 * responsible for generating a plan based on inputs.
 */
declare abstract class BasePlanner {
  abstract plan(inputs: ChainValues, runManager?: CallbackManager): Promise<Plan>;
}
/**
 * Abstract class that defines the structure for a step executor. Step
 * executors are responsible for executing a step based on inputs.
 */
declare abstract class BaseStepExecutor {
  abstract step(inputs: ChainValues, runManager?: CallbackManager): Promise<StepResult>;
}
/**
 * Abstract class that defines the structure for a step container. Step
 * containers are responsible for managing steps.
 */
declare abstract class BaseStepContainer {
  abstract addStep(action: StepAction, result: StepResult): void;
  abstract getSteps(): Step[];
  abstract getFinalResponse(): string;
}
/**
 * Class that extends BaseStepContainer and provides an implementation for
 * its methods. It maintains a list of steps and provides methods to add a
 * step, get all steps, and get the final response.
 */
declare class ListStepContainer extends BaseStepContainer {
  private steps;
  addStep(action: StepAction, result: StepResult): void;
  getSteps(): Step[];
  getFinalResponse(): string;
}
/**
 * Class that extends BasePlanner and provides an implementation for the
 * plan method. It uses an instance of LLMChain and an output parser to
 * generate a plan.
 */
declare class LLMPlanner extends BasePlanner {
  private llmChain;
  private outputParser;
  constructor(llmChain: LLMChain, outputParser: BaseOutputParser<Plan>);
  plan(inputs: ChainValues, runManager?: CallbackManager): Promise<Plan>;
}
/**
 * Class that extends BaseStepExecutor and provides an implementation for
 * the step method. It uses an instance of BaseChain to execute a step.
 */
declare class ChainStepExecutor extends BaseStepExecutor {
  private chain;
  constructor(chain: BaseChain);
  step(inputs: ChainValues, runManager?: CallbackManager): Promise<StepResult>;
}
//#endregion
export { BasePlanner, BaseStepContainer, BaseStepExecutor, ChainStepExecutor, LLMPlanner, ListStepContainer, Plan, Step, StepAction, StepResult };
//# sourceMappingURL=base.d.cts.map