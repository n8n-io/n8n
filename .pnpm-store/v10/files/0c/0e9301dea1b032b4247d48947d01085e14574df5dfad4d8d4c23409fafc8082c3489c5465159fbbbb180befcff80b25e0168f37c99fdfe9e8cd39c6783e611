import { ToolsAgentStep } from "./output_parser.cjs";
import { AgentRunnableSequence } from "../agent.cjs";
import { AgentAction, AgentFinish } from "../index.cjs";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { LanguageModelLike, ToolDefinition } from "@langchain/core/language_models/base";
import { StructuredToolInterface } from "@langchain/core/tools";

//#region src/agents/tool_calling/index.d.ts
/**
 * Params used by the createOpenAIToolsAgent function.
 */
type CreateToolCallingAgentParams = {
  /**
   * LLM to use as the agent. Should work with OpenAI tool calling,
   * so must either be an OpenAI model that supports that or a wrapper of
   * a different model that adds in equivalent support.
   */
  llm: LanguageModelLike;
  /** Tools this agent has access to. */
  tools: StructuredToolInterface[] | ToolDefinition[];
  /** The prompt to use, must have an input key of `agent_scratchpad`. */
  prompt: ChatPromptTemplate;
  /**
   * Whether to invoke the underlying model in streaming mode,
   * allowing streaming of intermediate steps. Defaults to true.
   */
  streamRunnable?: boolean;
};
/**
 * Create an agent that uses tools.
 * @param params Params required to create the agent. Includes an LLM, tools, and prompt.
 * @returns A runnable sequence representing an agent. It takes as input all the same input
 *     variables as the prompt passed in does. It returns as output either an
 *     AgentAction or AgentFinish.
 * @example
 * ```typescript
 * import { ChatAnthropic } from "@langchain/anthropic";
 * import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
 * import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
 *
 * const prompt = ChatPromptTemplate.fromMessages(
 *   [
 *     ["system", "You are a helpful assistant"],
 *     ["placeholder", "{chat_history}"],
 *     ["human", "{input}"],
 *     ["placeholder", "{agent_scratchpad}"],
 *   ]
 * );
 *
 *
 * const llm = new ChatAnthropic({
 *   modelName: "claude-3-opus-20240229",
 *   temperature: 0,
 * });
 *
 * // Define the tools the agent will have access to.
 * const tools = [...];
 *
 * const agent = createToolCallingAgent({ llm, tools, prompt });
 *
 * const agentExecutor = new AgentExecutor({ agent, tools });
 *
 * const result = await agentExecutor.invoke({input: "what is LangChain?"});
 *
 * // Using with chat history
 * import { AIMessage, HumanMessage } from "@langchain/core/messages";
 *
 * const result2 = await agentExecutor.invoke(
 *   {
 *     input: "what's my name?",
 *     chat_history: [
 *       new HumanMessage({content: "hi! my name is bob"}),
 *       new AIMessage({content: "Hello Bob! How can I assist you today?"}),
 *     ],
 *   }
 * );
 * ```
 */
declare function createToolCallingAgent({
  llm,
  tools,
  prompt,
  streamRunnable
}: CreateToolCallingAgentParams): AgentRunnableSequence<{
  steps: ToolsAgentStep[];
}, AgentFinish | AgentAction[]>;
//#endregion
export { CreateToolCallingAgentParams, createToolCallingAgent };
//# sourceMappingURL=index.d.cts.map