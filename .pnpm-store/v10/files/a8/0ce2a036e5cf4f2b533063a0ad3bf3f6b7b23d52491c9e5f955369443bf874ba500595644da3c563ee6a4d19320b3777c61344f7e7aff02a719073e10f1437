import { LLMChain } from "../../chains/llm_chain.js";
import { AgentArgs, AgentRunnableSequence, BaseSingleActionAgent } from "../agent.js";
import { XMLAgentOutputParser } from "./output_parser.js";
import { BasePromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";
import { ToolInterface } from "@langchain/core/tools";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { ChainValues } from "@langchain/core/utils/types";
import { AgentAction, AgentFinish, AgentStep } from "@langchain/core/agents";

//#region src/agents/xml/index.d.ts

/**
 * Interface for the input to the XMLAgent class.
 */
interface XMLAgentInput {
  tools: ToolInterface[];
  llmChain: LLMChain;
}
/**
 * Class that represents an agent that uses XML tags.
 */
declare class XMLAgent extends BaseSingleActionAgent implements XMLAgentInput {
  static lc_name(): string;
  lc_namespace: string[];
  tools: ToolInterface[];
  llmChain: LLMChain;
  outputParser: XMLAgentOutputParser;
  _agentType(): "xml";
  constructor(fields: XMLAgentInput);
  get inputKeys(): string[];
  static createPrompt(): ChatPromptTemplate<any, any>;
  /**
   * Plans the next action or finish state of the agent based on the
   * provided steps, inputs, and optional callback manager.
   * @param steps The steps to consider in planning.
   * @param inputs The inputs to consider in planning.
   * @param callbackManager Optional CallbackManager to use in planning.
   * @returns A Promise that resolves to an AgentAction or AgentFinish object representing the planned action or finish state.
   */
  plan(steps: AgentStep[], inputs: ChainValues, callbackManager?: CallbackManager): Promise<AgentAction | AgentFinish>;
  /**
   * Creates an XMLAgent from a BaseLanguageModel and a list of tools.
   * @param llm The BaseLanguageModel to use.
   * @param tools The tools to be used by the agent.
   * @param args Optional arguments for creating the agent.
   * @returns An instance of XMLAgent.
   */
  static fromLLMAndTools(llm: BaseLanguageModelInterface, tools: ToolInterface[], args?: XMLAgentInput & Pick<AgentArgs, "callbacks">): XMLAgent;
}
/**
 * Params used by the createXmlAgent function.
 */
type CreateXmlAgentParams = {
  /** LLM to use for the agent. */
  llm: BaseLanguageModelInterface;
  /** Tools this agent has access to. */
  tools: ToolInterface[];
  /**
   * The prompt to use. Must have input keys for
   * `tools` and `agent_scratchpad`.
   */
  prompt: BasePromptTemplate;
  /**
   * Whether to invoke the underlying model in streaming mode,
   * allowing streaming of intermediate steps. Defaults to true.
   */
  streamRunnable?: boolean;
};
/**
 * Create an agent that uses XML to format its logic.
 * @param params Params required to create the agent. Includes an LLM, tools, and prompt.
 * @returns A runnable sequence representing an agent. It takes as input all the same input
 *     variables as the prompt passed in does. It returns as output either an
 *     AgentAction or AgentFinish.
 *
 * @example
 * ```typescript
 * import { AgentExecutor, createXmlAgent } from "langchain/agents";
 * import { pull } from "langchain/hub";
 * import type { PromptTemplate } from "@langchain/core/prompts";
 *
 * import { ChatAnthropic } from "@langchain/anthropic";
 *
 * // Define the tools the agent will have access to.
 * const tools = [...];
 *
 * // Get the prompt to use - you can modify this!
 * // If you want to see the prompt in full, you can at:
 * // https://smith.langchain.com/hub/hwchase17/xml-agent-convo
 * const prompt = await pull<PromptTemplate>("hwchase17/xml-agent-convo");
 *
 * const llm = new ChatAnthropic({
 *   temperature: 0,
 * });
 *
 * const agent = await createXmlAgent({
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
 *   // Notice that chat_history is a string, since this prompt is aimed at LLMs, not chat models
 *   chat_history: "Human: Hi! My name is Cob\nAI: Hello Cob! Nice to meet you",
 * });
 * ```
 */
declare function createXmlAgent({
  llm,
  tools,
  prompt,
  streamRunnable
}: CreateXmlAgentParams): Promise<AgentRunnableSequence<{
  steps: AgentStep[];
}, AgentAction | AgentFinish>>;
//#endregion
export { CreateXmlAgentParams, XMLAgent, XMLAgentInput, createXmlAgent };
//# sourceMappingURL=index.d.ts.map