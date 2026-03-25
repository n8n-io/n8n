import { AgentActionOutputParser } from "../types.cjs";
import { OutputFixingParser } from "../../output_parsers/fix.cjs";
import { AgentAction, AgentFinish } from "@langchain/core/agents";
import { FormatInstructionsOptions } from "@langchain/core/output_parsers";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";

//#region src/agents/chat_convo/outputParser.d.ts
type ChatConversationalAgentOutputParserFormatInstructionsOptions = FormatInstructionsOptions & {
  toolNames: string[];
  raw?: boolean;
};
/**
 * Class that represents an output parser for the ChatConversationalAgent
 * class. It extends the AgentActionOutputParser class and provides
 * methods for parsing the output of the MRKL chain into agent actions.
 */
declare class ChatConversationalAgentOutputParser extends AgentActionOutputParser {
  lc_namespace: string[];
  private toolNames;
  constructor(fields: {
    toolNames: string[];
  });
  /**
   * Parses the given text into an AgentAction or AgentFinish object. If an
   * output fixing parser is defined, uses it to parse the text.
   * @param text Text to parse.
   * @returns Promise that resolves to an AgentAction or AgentFinish object.
   */
  parse(text: string): Promise<AgentAction | AgentFinish>;
  /**
   * Returns the format instructions as a string. If the 'raw' option is
   * true, returns the raw FORMAT_INSTRUCTIONS.
   * @param options Options for getting the format instructions.
   * @returns Format instructions as a string.
   */
  getFormatInstructions(): string;
}
type ChatConversationalAgentOutputParserArgs = {
  baseParser?: ChatConversationalAgentOutputParser;
  outputFixingParser?: OutputFixingParser<AgentAction | AgentFinish>;
  toolNames?: string[];
};
/**
 * Class that represents an output parser with retries for the
 * ChatConversationalAgent class. It extends the AgentActionOutputParser
 * class and provides methods for parsing the output of the MRKL chain
 * into agent actions with retry functionality.
 */
declare class ChatConversationalAgentOutputParserWithRetries extends AgentActionOutputParser {
  lc_namespace: string[];
  private baseParser;
  private outputFixingParser?;
  private toolNames;
  constructor(fields: ChatConversationalAgentOutputParserArgs);
  /**
   * Returns the format instructions as a string.
   * @returns Format instructions as a string.
   */
  getFormatInstructions(options: ChatConversationalAgentOutputParserFormatInstructionsOptions): string;
  /**
   * Parses the given text into an AgentAction or AgentFinish object.
   * @param text Text to parse.
   * @returns Promise that resolves to an AgentAction or AgentFinish object.
   */
  parse(text: string): Promise<AgentAction | AgentFinish>;
  /**
   * Static method to create a new
   * ChatConversationalAgentOutputParserWithRetries from a BaseLanguageModelInterface
   * and options. If no base parser is provided in the options, a new
   * ChatConversationalAgentOutputParser is created. An OutputFixingParser
   * is also created from the BaseLanguageModelInterface and the base parser.
   * @param llm BaseLanguageModelInterface instance used to create the OutputFixingParser.
   * @param options Options for creating the ChatConversationalAgentOutputParserWithRetries instance.
   * @returns A new instance of ChatConversationalAgentOutputParserWithRetries.
   */
  static fromLLM(llm: BaseLanguageModelInterface, options: Omit<ChatConversationalAgentOutputParserArgs, "outputFixingParser">): ChatConversationalAgentOutputParserWithRetries;
}
//#endregion
export { ChatConversationalAgentOutputParser, ChatConversationalAgentOutputParserArgs, ChatConversationalAgentOutputParserFormatInstructionsOptions, ChatConversationalAgentOutputParserWithRetries };
//# sourceMappingURL=outputParser.d.cts.map