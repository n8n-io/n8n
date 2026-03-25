import { BasePromptValueInterface } from "../../libs/langchain-core/dist/prompt_values.js";
import { AgentTrajectoryEvaluator, EvalOutputType, ExtractLLMCallOptions, LLMEvalChainInput, LLMTrajectoryEvaluatorArgs } from "../base.js";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { StructuredToolInterface } from "@langchain/core/tools";
import { ChatGeneration, Generation } from "@langchain/core/outputs";
import { BaseCallbackConfig, Callbacks } from "@langchain/core/callbacks/manager";
import { BaseLLMOutputParser } from "@langchain/core/output_parsers";
import { ChainValues } from "@langchain/core/utils/types";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AgentStep } from "@langchain/core/agents";

//#region src/evaluation/agents/trajectory.d.ts
/**
 * A parser for the output of the TrajectoryEvalChain.
 */
declare class TrajectoryOutputParser extends BaseLLMOutputParser<EvalOutputType> {
  static lc_name(): string;
  lc_namespace: string[];
  parseResult(generations: Generation[] | ChatGeneration[], _callbacks: Callbacks | undefined): Promise<EvalOutputType>;
}
/**
 * A chain for evaluating ReAct style agents.
 *
 * This chain is used to evaluate ReAct style agents by reasoning about
 * the sequence of actions taken and their outcomes.
 */
declare class TrajectoryEvalChain extends AgentTrajectoryEvaluator {
  static lc_name(): string;
  criterionName?: string;
  evaluationName?: string;
  requiresInput: boolean;
  requiresReference: boolean;
  outputParser: TrajectoryOutputParser;
  static resolveTrajectoryPrompt(prompt?: BasePromptTemplate | undefined, agentTools?: StructuredToolInterface[]): BasePromptTemplate<any, BasePromptValueInterface, any>;
  /**
   * Get the description of the agent tools.
   *
   * @returns The description of the agent tools.
   */
  static toolsDescription(agentTools: StructuredToolInterface[]): string;
  /**
   * Create a new TrajectoryEvalChain.
   * @param llm
   * @param agentTools - The tools used by the agent.
   * @param chainOptions - The options for the chain.
   */
  static fromLLM(llm: BaseChatModel, agentTools?: StructuredToolInterface[], chainOptions?: Partial<Omit<LLMEvalChainInput, "llm">>): Promise<TrajectoryEvalChain>;
  _prepareOutput(result: ChainValues): any;
  /**
   * Get the agent trajectory as a formatted string.
   *
   * @param steps - The agent trajectory.
   * @returns The formatted agent trajectory.
   */
  getAgentTrajectory(steps: AgentStep[]): string;
  formatReference(reference?: string): string;
  _evaluateAgentTrajectory(args: LLMTrajectoryEvaluatorArgs, callOptions: ExtractLLMCallOptions<this["llm"]>, config?: Callbacks | BaseCallbackConfig): Promise<ChainValues>;
}
//#endregion
export { TrajectoryEvalChain, TrajectoryOutputParser };
//# sourceMappingURL=trajectory.d.ts.map