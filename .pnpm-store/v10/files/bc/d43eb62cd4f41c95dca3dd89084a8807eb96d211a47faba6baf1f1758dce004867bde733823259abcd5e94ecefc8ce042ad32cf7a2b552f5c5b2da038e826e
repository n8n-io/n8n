import { AgentActionOutputParser, AgentInput } from "../types.js";
import { Agent, AgentArgs, OutputParserArgs } from "../agent.js";
import { Optional } from "../../types/type-utils.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ToolInterface } from "@langchain/core/tools";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { BaseMessage } from "@langchain/core/messages";
import { AgentStep } from "@langchain/core/agents";

//#region src/agents/chat_convo/index.d.ts

/**
 * Interface defining the structure of arguments used to create a prompt
 * for the ChatConversationalAgent class.
 */
interface ChatConversationalCreatePromptArgs {
  /** String to put after the list of tools. */
  systemMessage?: string;
  /** String to put before the list of tools. */
  humanMessage?: string;
  /** List of input variables the final prompt will expect. */
  inputVariables?: string[];
  /** Output parser to use for formatting. */
  outputParser?: AgentActionOutputParser;
}
/**
 * Type that extends the AgentInput interface for the
 * ChatConversationalAgent class, making the outputParser property
 * optional.
 */
type ChatConversationalAgentInput = Optional<AgentInput, "outputParser">;
/**
 * Agent for the MRKL chain.
 * @augments Agent
 */
declare class ChatConversationalAgent extends Agent {
  static lc_name(): string;
  lc_namespace: string[];
  ToolType: ToolInterface;
  constructor(input: ChatConversationalAgentInput);
  _agentType(): "chat-conversational-react-description";
  observationPrefix(): string;
  llmPrefix(): string;
  _stop(): string[];
  static validateTools(tools: ToolInterface[]): void;
  /**
   * Constructs the agent scratchpad based on the agent steps. It returns an
   * array of base messages representing the thoughts of the agent.
   * @param steps The agent steps to construct the scratchpad from.
   * @returns An array of base messages representing the thoughts of the agent.
   */
  constructScratchPad(steps: AgentStep[]): Promise<BaseMessage[]>;
  /**
   * Returns the default output parser for the ChatConversationalAgent
   * class. It takes optional fields as arguments to customize the output
   * parser.
   * @param fields Optional fields to customize the output parser.
   * @returns The default output parser for the ChatConversationalAgent class.
   */
  static getDefaultOutputParser(fields?: OutputParserArgs & {
    toolNames: string[];
  }): AgentActionOutputParser;
  /**
   * Create prompt in the style of the ChatConversationAgent.
   *
   * @param tools - List of tools the agent will have access to, used to format the prompt.
   * @param args - Arguments to create the prompt with.
   * @param args.systemMessage - String to put before the list of tools.
   * @param args.humanMessage - String to put after the list of tools.
   * @param args.outputParser - Output parser to use for formatting.
   */
  static createPrompt(tools: ToolInterface[], args?: ChatConversationalCreatePromptArgs): ChatPromptTemplate<any, any>;
  /**
   * Creates an instance of the ChatConversationalAgent class from a
   * BaseLanguageModel and a set of tools. It takes optional arguments to
   * customize the agent.
   * @param llm The BaseLanguageModel to create the agent from.
   * @param tools The set of tools to create the agent from.
   * @param args Optional arguments to customize the agent.
   * @returns An instance of the ChatConversationalAgent class.
   */
  static fromLLMAndTools(llm: BaseLanguageModelInterface, tools: ToolInterface[], args?: ChatConversationalCreatePromptArgs & AgentArgs): ChatConversationalAgent;
}
//#endregion
export { ChatConversationalAgent, ChatConversationalAgentInput, ChatConversationalCreatePromptArgs };
//# sourceMappingURL=index.d.ts.map