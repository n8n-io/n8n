import { SerializedLLMChain } from "../../chains/serde.cjs";
import { BaseChain, ChainInputs } from "../../chains/base.cjs";
import { BasePlanner, BaseStepContainer, BaseStepExecutor, ChainStepExecutor, LLMPlanner } from "./base.cjs";
import { ChainValues } from "@langchain/core/utils/types";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { DynamicStructuredTool, Tool } from "@langchain/core/tools";

//#region src/experimental/plan_and_execute/agent_executor.d.ts

/**
 * Interface for the input to the PlanAndExecuteAgentExecutor class. It
 * extends ChainInputs and includes additional properties for the planner,
 * step executor, step container, and input and output keys.
 */
interface PlanAndExecuteAgentExecutorInput extends ChainInputs {
  planner: BasePlanner;
  stepExecutor: BaseStepExecutor;
  stepContainer?: BaseStepContainer;
  inputKey?: string;
  outputKey?: string;
}
/**
 * Class representing a plan-and-execute agent executor. This agent
 * decides on the full sequence of actions upfront, then executes them all
 * without updating the plan. This is suitable for complex or long-running
 * tasks that require maintaining long-term objectives and focus.
 */
declare class PlanAndExecuteAgentExecutor extends BaseChain {
  static lc_name(): string;
  private planner;
  private stepExecutor;
  private stepContainer;
  private inputKey;
  private outputKey;
  constructor(input: PlanAndExecuteAgentExecutorInput);
  get inputKeys(): string[];
  get outputKeys(): string[];
  /**
   * Static method that returns a default planner for the agent. It creates
   * a new LLMChain with a given LLM and a fixed prompt, and uses it to
   * create a new LLMPlanner with a PlanOutputParser.
   * @param llm The Large Language Model (LLM) used to generate responses.
   * @returns A new LLMPlanner instance.
   */
  static getDefaultPlanner({
    llm,
    tools
  }: {
    llm: BaseLanguageModelInterface;
    tools: Tool[] | DynamicStructuredTool[];
  }): Promise<LLMPlanner>;
  /**
   * Static method that returns a default step executor for the agent. It
   * creates a new ChatAgent from a given LLM and a set of tools, and uses
   * it to create a new ChainStepExecutor.
   * @param llm The Large Language Model (LLM) used to generate responses.
   * @param tools The set of tools used by the agent.
   * @param humanMessageTemplate The template for human messages. If not provided, a default template is used.
   * @returns A new ChainStepExecutor instance.
   */
  static getDefaultStepExecutor({
    llm,
    tools,
    humanMessageTemplate
  }: {
    llm: BaseLanguageModelInterface;
    tools: Tool[] | DynamicStructuredTool[];
    humanMessageTemplate?: string;
  }): ChainStepExecutor;
  /**
   * Static method that creates a new PlanAndExecuteAgentExecutor from a
   * given LLM, a set of tools, and optionally a human message template. It
   * uses the getDefaultPlanner and getDefaultStepExecutor methods to create
   * the planner and step executor for the new agent executor.
   * @param llm The Large Language Model (LLM) used to generate responses.
   * @param tools The set of tools used by the agent.
   * @param humanMessageTemplate The template for human messages. If not provided, a default template is used.
   * @returns A new PlanAndExecuteAgentExecutor instance.
   */
  static fromLLMAndTools({
    llm,
    tools,
    humanMessageTemplate
  }: {
    llm: BaseLanguageModelInterface;
    tools: Tool[] | DynamicStructuredTool[];
    humanMessageTemplate?: string;
  } & Omit<PlanAndExecuteAgentExecutorInput, "planner" | "stepExecutor">): Promise<PlanAndExecuteAgentExecutor>;
  /** @ignore */
  _call(inputs: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  _chainType(): "agent_executor";
  serialize(): SerializedLLMChain;
}
//#endregion
export { PlanAndExecuteAgentExecutor };
//# sourceMappingURL=agent_executor.d.cts.map