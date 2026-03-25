import { AgentInput } from "../types.cjs";
import { Agent, AgentArgs, AgentRunnableSequence, OutputParserArgs } from "../agent.cjs";
import { Optional } from "../../types/type-utils.cjs";
import { StructuredChatOutputParserWithRetries } from "./outputParser.cjs";
import * as _langchain_core_agents1 from "@langchain/core/agents";
import { AgentStep } from "@langchain/core/agents";
import { BaseMessagePromptTemplate, BasePromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface, ToolDefinition } from "@langchain/core/language_models/base";
import { StructuredToolInterface } from "@langchain/core/tools";

//#region src/agents/structured_chat/index.d.ts

/**
 * Interface for arguments used to create a prompt for a
 * StructuredChatAgent.
 */
interface StructuredChatCreatePromptArgs {
  /** String to put after the list of tools. */
  suffix?: string;
  /** String to put before the list of tools. */
  prefix?: string;
  /** String to use directly as the human message template. */
  humanMessageTemplate?: string;
  /** List of input variables the final prompt will expect. */
  inputVariables?: string[];
  /** List of historical prompts from memory.  */
  memoryPrompts?: BaseMessagePromptTemplate[];
}
/**
 * Type for input data for creating a StructuredChatAgent, with the
 * 'outputParser' property made optional.
 */
type StructuredChatAgentInput = Optional<AgentInput, "outputParser">;
/**
 * Agent that interoperates with Structured Tools using React logic.
 * @augments Agent
 */
declare class StructuredChatAgent extends Agent {
  static lc_name(): string;
  lc_namespace: string[];
  constructor(input: StructuredChatAgentInput);
  _agentType(): "structured-chat-zero-shot-react-description";
  observationPrefix(): string;
  llmPrefix(): string;
  _stop(): string[];
  /**
   * Validates that all provided tools have a description. Throws an error
   * if any tool lacks a description.
   * @param tools Array of StructuredTool instances to validate.
   */
  static validateTools(tools: StructuredToolInterface[]): void;
  /**
   * Returns a default output parser for the StructuredChatAgent. If an LLM
   * is provided, it creates an output parser with retry logic from the LLM.
   * @param fields Optional fields to customize the output parser. Can include an LLM and a list of tool names.
   * @returns An instance of StructuredChatOutputParserWithRetries.
   */
  static getDefaultOutputParser(fields?: OutputParserArgs & {
    toolNames: string[];
  }): StructuredChatOutputParserWithRetries;
  /**
   * Constructs the agent's scratchpad from a list of steps. If the agent's
   * scratchpad is not empty, it prepends a message indicating that the
   * agent has not seen any previous work.
   * @param steps Array of AgentStep instances to construct the scratchpad from.
   * @returns A Promise that resolves to a string representing the agent's scratchpad.
   */
  constructScratchPad(steps: AgentStep[]): Promise<string>;
  /**
   * Creates a string representation of the schemas of the provided tools.
   * @param tools Array of StructuredTool instances to create the schemas string from.
   * @returns A string representing the schemas of the provided tools.
   */
  static createToolSchemasString(tools: StructuredToolInterface[]): string;
  /**
   * Create prompt in the style of the agent.
   *
   * @param tools - List of tools the agent will have access to, used to format the prompt.
   * @param args - Arguments to create the prompt with.
   * @param args.suffix - String to put after the list of tools.
   * @param args.prefix - String to put before the list of tools.
   * @param args.inputVariables List of input variables the final prompt will expect.
   * @param args.memoryPrompts List of historical prompts from memory.
   */
  static createPrompt(tools: StructuredToolInterface[], args?: StructuredChatCreatePromptArgs): ChatPromptTemplate<any, any>;
  /**
   * Creates a StructuredChatAgent from an LLM and a list of tools.
   * Validates the tools, creates a prompt, and sets up an LLM chain for the
   * agent.
   * @param llm BaseLanguageModel instance to create the agent from.
   * @param tools Array of StructuredTool instances to create the agent from.
   * @param args Optional arguments to customize the creation of the agent. Can include arguments for creating the prompt and AgentArgs.
   * @returns A new instance of StructuredChatAgent.
   */
  static fromLLMAndTools(llm: BaseLanguageModelInterface, tools: StructuredToolInterface[], args?: StructuredChatCreatePromptArgs & AgentArgs): StructuredChatAgent;
}
/**
 * Params used by the createStructuredChatAgent function.
 */
type CreateStructuredChatAgentParams = {
  /** LLM to use as the agent. */
  llm: BaseLanguageModelInterface;
  /** Tools this agent has access to. */
  tools: (StructuredToolInterface | ToolDefinition)[];
  /**
   * The prompt to use. Must have input keys for
   * `tools`, `tool_names`, and `agent_scratchpad`.
   */
  prompt: BasePromptTemplate;
  /**
   * Whether to invoke the underlying model in streaming mode,
   * allowing streaming of intermediate steps. Defaults to true.
   */
  streamRunnable?: boolean;
};
/**
 * Create an agent aimed at supporting tools with multiple inputs.
 * @param params Params required to create the agent. Includes an LLM, tools, and prompt.
 * @returns A runnable sequence representing an agent. It takes as input all the same input
 *     variables as the prompt passed in does. It returns as output either an
 *     AgentAction or AgentFinish.
 *
 * @example
 * ```typescript
 * import { AgentExecutor, createStructuredChatAgent } from "langchain/agents";
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
 * // https://smith.langchain.com/hub/hwchase17/structured-chat-agent
 * const prompt = await pull<ChatPromptTemplate>(
 *   "hwchase17/structured-chat-agent"
 * );
 *
 * const llm = new ChatOpenAI({
 *   temperature: 0,
 *   model: "gpt-3.5-turbo-1106",
 * });
 *
 * const agent = await createStructuredChatAgent({
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
declare function createStructuredChatAgent({
  llm,
  tools,
  prompt,
  streamRunnable
}: CreateStructuredChatAgentParams): Promise<AgentRunnableSequence<{
  steps: AgentStep[];
}, _langchain_core_agents1.AgentAction | _langchain_core_agents1.AgentFinish>>;
//#endregion
export { CreateStructuredChatAgentParams, StructuredChatAgent, StructuredChatAgentInput, StructuredChatCreatePromptArgs, createStructuredChatAgent };
//# sourceMappingURL=index.d.cts.map