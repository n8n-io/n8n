import { ChatGeneration } from "@langchain/core/outputs";
import { BaseLLMOutputParser } from "@langchain/core/output_parsers";

//#region src/output_parsers/openai_tools.d.ts

/**
 * @deprecated Import from "@langchain/core/output_parsers/openai_tools"
 */
type ParsedToolCall = {
  id?: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>;
  /** @deprecated Use `type` instead. Will be removed in 0.2.0. */
  name: string;
  /** @deprecated Use `args` instead. Will be removed in 0.2.0. */
  arguments: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
};
/**
 * @deprecated Import from "@langchain/core/output_parsers/openai_tools"
 */
type JsonOutputToolsParserParams = {
  /** Whether to return the tool call id. */
  returnId?: boolean;
};
/**
 * @deprecated Import from "@langchain/core/output_parsers/openai_tools"
 */
declare class JsonOutputToolsParser extends BaseLLMOutputParser<ParsedToolCall[]> {
  static lc_name(): string;
  returnId: boolean;
  lc_namespace: string[];
  lc_serializable: boolean;
  constructor(fields?: JsonOutputToolsParserParams);
  /**
   * Parses the output and returns a JSON object. If `argsOnly` is true,
   * only the arguments of the function call are returned.
   * @param generations The output of the LLM to parse.
   * @returns A JSON object representation of the function call or its arguments.
   */
  parseResult(generations: ChatGeneration[]): Promise<ParsedToolCall[]>;
}
type JsonOutputKeyToolsParserParams = {
  keyName: string;
  returnSingle?: boolean;
  /** Whether to return the tool call id. */
  returnId?: boolean;
};
/**
 * @deprecated Import from "@langchain/core/output_parsers/openai_tools"
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare class JsonOutputKeyToolsParser extends BaseLLMOutputParser<any> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  returnId: boolean;
  /** The type of tool calls to return. */
  keyName: string;
  /** Whether to return only the first tool call. */
  returnSingle: boolean;
  initialParser: JsonOutputToolsParser;
  constructor(params: JsonOutputKeyToolsParserParams);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseResult(generations: ChatGeneration[]): Promise<any>;
}
//#endregion
export { JsonOutputKeyToolsParser, JsonOutputKeyToolsParserParams, JsonOutputToolsParser, JsonOutputToolsParserParams, ParsedToolCall };
//# sourceMappingURL=openai_tools.d.cts.map