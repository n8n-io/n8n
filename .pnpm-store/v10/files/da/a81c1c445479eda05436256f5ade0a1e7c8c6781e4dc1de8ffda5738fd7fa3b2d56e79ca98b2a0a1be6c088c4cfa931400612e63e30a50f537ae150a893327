import { SerializedLLMChain } from "../chains/serde.js";
import { BaseChain, ChainInputs } from "../chains/base.js";
import { StoppingMethod } from "./types.js";
import { BaseMultiActionAgent, BaseSingleActionAgent } from "./agent.js";
import { Serializable } from "@langchain/core/load/serializable";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { StructuredToolInterface, Tool, ToolInputParsingException, ToolInterface } from "@langchain/core/tools";
import { CallbackManagerForChainRun, Callbacks } from "@langchain/core/callbacks/manager";
import { OutputParserException } from "@langchain/core/output_parsers";
import { ChainValues } from "@langchain/core/utils/types";
import { AgentAction, AgentFinish, AgentStep } from "@langchain/core/agents";

//#region src/agents/executor.d.ts

type ExtractToolType<T> = T extends {
  ToolType: infer ToolInterface;
} ? ToolInterface : StructuredToolInterface;
/**
 * Interface defining the structure of input data for creating an
 * AgentExecutor. It extends ChainInputs and includes additional
 * properties specific to agent execution.
 */
interface AgentExecutorInput extends ChainInputs {
  agent: BaseSingleActionAgent | BaseMultiActionAgent | Runnable<ChainValues & {
    steps?: AgentStep[];
  }, AgentAction[] | AgentAction | AgentFinish>;
  tools: ExtractToolType<this["agent"]>[];
  returnIntermediateSteps?: boolean;
  maxIterations?: number;
  earlyStoppingMethod?: StoppingMethod;
  handleParsingErrors?: boolean | string | ((e: OutputParserException | ToolInputParsingException) => string);
  handleToolRuntimeErrors?: (e: Error) => string;
}
// TODO: Type properly with { intermediateSteps?: AgentStep[] };
type AgentExecutorOutput = ChainValues;
/**
 * A chain managing an agent using tools.
 * @augments BaseChain
 * @example
 * ```typescript
 *
 * const executor = AgentExecutor.fromAgentAndTools({
 *   agent: async () => loadAgentFromLangchainHub(),
 *   tools: [new SerpAPI(), new Calculator()],
 *   returnIntermediateSteps: true,
 * });
 *
 * const result = await executor.invoke({
 *   input: `Who is Olivia Wilde's boyfriend? What is his current age raised to the 0.23 power?`,
 * });
 *
 * ```
 */
declare class AgentExecutor extends BaseChain<ChainValues, AgentExecutorOutput> {
  static lc_name(): string;
  get lc_namespace(): string[];
  agent: BaseSingleActionAgent | BaseMultiActionAgent;
  tools: this["agent"]["ToolType"][];
  returnIntermediateSteps: boolean;
  maxIterations?: number;
  earlyStoppingMethod: StoppingMethod;
  // TODO: Update BaseChain implementation on breaking change to include this
  returnOnlyOutputs: boolean;
  /**
   * How to handle errors raised by the agent's output parser.
    Defaults to `False`, which raises the error.
       If `true`, the error will be sent back to the LLM as an observation.
    If a string, the string itself will be sent to the LLM as an observation.
    If a callable function, the function will be called with the exception
    as an argument, and the result of that function will be passed to the agent
    as an observation.
   */
  handleParsingErrors: boolean | string | ((e: OutputParserException | ToolInputParsingException) => string);
  handleToolRuntimeErrors?: (e: Error) => string;
  get inputKeys(): string[];
  get outputKeys(): string[];
  constructor(input: AgentExecutorInput);
  /** Create from agent and a list of tools. */
  static fromAgentAndTools(fields: AgentExecutorInput): AgentExecutor;
  get shouldContinueGetter(): (iterations: number) => boolean;
  /**
   * Method that checks if the agent execution should continue based on the
   * number of iterations.
   * @param iterations The current number of iterations.
   * @returns A boolean indicating whether the agent execution should continue.
   */
  private shouldContinue;
  /** @ignore */
  _call(inputs: ChainValues, runManager?: CallbackManagerForChainRun, config?: RunnableConfig): Promise<AgentExecutorOutput>;
  _takeNextStep(nameToolMap: Record<string, ToolInterface>, inputs: ChainValues, intermediateSteps: AgentStep[], runManager?: CallbackManagerForChainRun, config?: RunnableConfig): Promise<AgentFinish | AgentStep[]>;
  _return(output: AgentFinish, intermediateSteps: AgentStep[], runManager?: CallbackManagerForChainRun): Promise<AgentExecutorOutput>;
  _getToolReturn(nextStepOutput: AgentStep): Promise<AgentFinish | null>;
  _returnStoppedResponse(earlyStoppingMethod: StoppingMethod): AgentFinish;
  _streamIterator(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: Record<string, any>, options?: Partial<RunnableConfig>): AsyncGenerator<ChainValues>;
  _chainType(): "agent_executor";
  serialize(): SerializedLLMChain;
}
//#endregion
export { AgentExecutor, AgentExecutorInput };
//# sourceMappingURL=executor.d.ts.map