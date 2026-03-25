import { AgentInput } from "../types.js";
import { Agent, AgentArgs, AgentRunnableSequence } from "../agent.js";
import { OpenAIFunctionsAgentOutputParser } from "./output_parser.js";
import "../openai/output_parser.js";
import { BasePromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredToolInterface } from "@langchain/core/tools";
import { BaseFunctionCallOptions, BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { BaseMessage, SystemMessage } from "@langchain/core/messages";
import { ChainValues } from "@langchain/core/utils/types";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AgentAction, AgentFinish, AgentStep } from "@langchain/core/agents";

//#region src/agents/openai_functions/index.d.ts

/**
 * Interface for the input data required to create an OpenAIAgent.
 */
interface OpenAIAgentInput extends AgentInput {
  tools: StructuredToolInterface[];
}
/**
 * Interface for the arguments required to create a prompt for an
 * OpenAIAgent.
 */
interface OpenAIAgentCreatePromptArgs {
  prefix?: string;
  systemMessage?: SystemMessage;
}
/**
 * Class representing an agent for the OpenAI chat model in LangChain. It
 * extends the Agent class and provides additional functionality specific
 * to the OpenAIAgent type.
 */
declare class OpenAIAgent extends Agent {
  static lc_name(): string;
  lc_namespace: string[];
  _agentType(): "openai-functions";
  observationPrefix(): string;
  llmPrefix(): string;
  _stop(): string[];
  tools: StructuredToolInterface[];
  outputParser: OpenAIFunctionsAgentOutputParser;
  constructor(input: Omit<OpenAIAgentInput, "outputParser">);
  /**
   * Creates a prompt for the OpenAIAgent using the provided tools and
   * fields.
   * @param _tools The tools to be used in the prompt.
   * @param fields Optional fields for creating the prompt.
   * @returns A BasePromptTemplate object representing the created prompt.
   */
  static createPrompt(_tools: StructuredToolInterface[], fields?: OpenAIAgentCreatePromptArgs): BasePromptTemplate;
  /**
   * Creates an OpenAIAgent from a BaseLanguageModel and a list of tools.
   * @param llm The BaseLanguageModel to use.
   * @param tools The tools to be used by the agent.
   * @param args Optional arguments for creating the agent.
   * @returns An instance of OpenAIAgent.
   */
  static fromLLMAndTools(llm: BaseLanguageModelInterface, tools: StructuredToolInterface[], args?: OpenAIAgentCreatePromptArgs & Pick<AgentArgs, "callbacks">): OpenAIAgent;
  /**
   * Constructs a scratch pad from a list of agent steps.
   * @param steps The steps to include in the scratch pad.
   * @returns A string or a list of BaseMessages representing the constructed scratch pad.
   */
  constructScratchPad(steps: AgentStep[]): Promise<string | BaseMessage[]>;
  /**
   * Plans the next action or finish state of the agent based on the
   * provided steps, inputs, and optional callback manager.
   * @param steps The steps to consider in planning.
   * @param inputs The inputs to consider in planning.
   * @param callbackManager Optional CallbackManager to use in planning.
   * @returns A Promise that resolves to an AgentAction or AgentFinish object representing the planned action or finish state.
   */
  plan(steps: Array<AgentStep>, inputs: ChainValues, callbackManager?: CallbackManager): Promise<AgentAction | AgentFinish>;
}
/**
 * Params used by the createOpenAIFunctionsAgent function.
 */
type CreateOpenAIFunctionsAgentParams = {
  /**
   * LLM to use as the agent. Should work with OpenAI function calling,
   * so must either be an OpenAI model that supports that or a wrapper of
   * a different model that adds in equivalent support.
   */
  llm: BaseChatModel<BaseFunctionCallOptions>;
  /** Tools this agent has access to. */
  tools: StructuredToolInterface[];
  /** The prompt to use, must have an input key for `agent_scratchpad`. */
  prompt: ChatPromptTemplate;
  /**
   * Whether to invoke the underlying model in streaming mode,
   * allowing streaming of intermediate steps. Defaults to true.
   */
  streamRunnable?: boolean;
};
/**
 * Create an agent that uses OpenAI-style function calling.
 * @param params Params required to create the agent. Includes an LLM, tools, and prompt.
 * @returns A runnable sequence representing an agent. It takes as input all the same input
 *     variables as the prompt passed in does. It returns as output either an
 *     AgentAction or AgentFinish.
 *
 * @example
 * ```typescript
 * import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
 * import { pull } from "langchain/hub";
 * import type { ChatPromptTemplate } from "@langchain/core/prompts";
 * import { AIMessage, HumanMessage } from "@langchain/core/messages";
 *
 * import { ChatOpenAI } from "@langchain/openai";
 *
 * // Define the tools the agent will have access to.
 * const tools = [...];
 *
 * // Get the prompt to use - you can modify this!
 * // If you want to see the prompt in full, you can at:
 * // https://smith.langchain.com/hub/hwchase17/openai-functions-agent
 * const prompt = await pull<ChatPromptTemplate>(
 *   "hwchase17/openai-functions-agent"
 * );
 *
 * const llm = new ChatOpenAI({
 *   model: "gpt-4o-mini",
 *   temperature: 0,
 * });
 *
 * const agent = await createOpenAIFunctionsAgent({
 *   llm,
 *   tools,
 *   prompt,
 * });
 *
 * const agentExecutor = new AgentExecutor({
 *   agent,
 *   tools,
 * });
 *
 * const result = await agentExecutor.invoke({
 *   input: "what is LangChain?",
 * });
 *
 * // With chat history
 * const result2 = await agentExecutor.invoke({
 *   input: "what's my name?",
 *   chat_history: [
 *     new HumanMessage("hi! my name is cob"),
 *     new AIMessage("Hello Cob! How can I assist you today?"),
 *   ],
 * });
 * ```
 */
declare function createOpenAIFunctionsAgent({
  llm,
  tools,
  prompt,
  streamRunnable
}: CreateOpenAIFunctionsAgentParams): Promise<AgentRunnableSequence<{
  steps: AgentStep[];
}, AgentAction | AgentFinish>>;
//#endregion
export { CreateOpenAIFunctionsAgentParams, OpenAIAgent, OpenAIAgentCreatePromptArgs, OpenAIAgentInput, createOpenAIFunctionsAgent };
//# sourceMappingURL=index.d.ts.map