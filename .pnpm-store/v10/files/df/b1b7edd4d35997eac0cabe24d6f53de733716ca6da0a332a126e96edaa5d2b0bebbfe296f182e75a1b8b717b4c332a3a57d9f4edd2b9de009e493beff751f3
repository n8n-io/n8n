import { InvalidToolCall, ToolCall } from "../../messages/tool.cjs";
import { ChatGeneration, ChatGenerationChunk } from "../../outputs.cjs";
import { SerializableSchema } from "../../utils/standard_schema.cjs";
import { InteropZodType } from "../../utils/types/zod.cjs";
import { BaseCumulativeTransformOutputParser, BaseCumulativeTransformOutputParserInput } from "../transform.cjs";
import * as z3 from "zod/v3";
import * as z4 from "zod/v4/core";

//#region src/output_parsers/openai_tools/json_output_tools_parsers.d.ts
type ParsedToolCall = {
  id?: string;
  type: string;
  args: Record<string, any>;
};
type JsonOutputToolsParserParams = {
  /** Whether to return the tool call id. */returnId?: boolean;
} & BaseCumulativeTransformOutputParserInput;
declare function parseToolCall(rawToolCall: Record<string, any>, options: {
  returnId?: boolean;
  partial: true;
}): ToolCall | undefined;
declare function parseToolCall(rawToolCall: Record<string, any>, options?: {
  returnId?: boolean;
  partial?: false;
}): ToolCall;
declare function parseToolCall(rawToolCall: Record<string, any>, options?: {
  returnId?: boolean;
  partial?: boolean;
}): ToolCall | undefined;
declare function convertLangChainToolCallToOpenAI(toolCall: ToolCall): {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
};
declare function makeInvalidToolCall(rawToolCall: Record<string, any>, errorMsg?: string): InvalidToolCall;
/**
 * Class for parsing the output of a tool-calling LLM into a JSON object.
 */
declare class JsonOutputToolsParser<T> extends BaseCumulativeTransformOutputParser<T> {
  static lc_name(): string;
  returnId: boolean;
  lc_namespace: string[];
  lc_serializable: boolean;
  constructor(fields?: JsonOutputToolsParserParams);
  protected _diff(): void;
  parse(): Promise<T>;
  parseResult(generations: ChatGeneration[]): Promise<T>;
  /**
   * Parses the output and returns a JSON object. If `argsOnly` is true,
   * only the arguments of the function call are returned.
   * @param generations The output of the LLM to parse.
   * @returns A JSON object representation of the function call or its arguments.
   */
  parsePartialResult(generations: ChatGenerationChunk[] | ChatGeneration[], partial?: boolean): Promise<any>;
}
type JsonOutputKeyToolsParserParamsBase = {
  keyName: string;
  returnSingle?: boolean;
} & JsonOutputToolsParserParams;
type JsonOutputKeyToolsParserParamsV3<T extends Record<string, any> = Record<string, any>> = {
  zodSchema?: z3.ZodType<T>;
} & JsonOutputKeyToolsParserParamsBase;
type JsonOutputKeyToolsParserParamsV4<T extends Record<string, any> = Record<string, any>> = {
  zodSchema?: z4.$ZodType<T, T>;
} & JsonOutputKeyToolsParserParamsBase;
type JsonOutputKeyToolsParserParamsInterop<T extends Record<string, any> = Record<string, any>> = {
  zodSchema?: InteropZodType<T>;
} & JsonOutputKeyToolsParserParamsBase;
type JsonOutputKeyToolsParserParamsSerializable<T extends Record<string, any> = Record<string, any>> = {
  serializableSchema?: SerializableSchema<T>;
} & JsonOutputKeyToolsParserParamsBase;
type JsonOutputKeyToolsParserParams<T extends Record<string, any> = Record<string, any>> = JsonOutputKeyToolsParserParamsV3<T>;
/**
 * Class for parsing the output of a tool-calling LLM into a JSON object if you are
 * expecting only a single tool to be called.
 */
declare class JsonOutputKeyToolsParser<T extends Record<string, any> = Record<string, any>> extends JsonOutputToolsParser<T> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  returnId: boolean;
  /** The type of tool calls to return. */
  keyName: string;
  /** Whether to return only the first tool call. */
  returnSingle: boolean;
  zodSchema?: InteropZodType<T>;
  serializableSchema?: SerializableSchema<T>;
  constructor(params: JsonOutputKeyToolsParserParamsV3<T>);
  constructor(params: JsonOutputKeyToolsParserParamsV4<T>);
  constructor(params: JsonOutputKeyToolsParserParamsInterop<T>);
  protected _validateResult(result: unknown): Promise<T>;
  parsePartialResult(generations: ChatGeneration[]): Promise<any>;
  parseResult(generations: ChatGeneration[]): Promise<any>;
}
//#endregion
export { JsonOutputKeyToolsParser, JsonOutputKeyToolsParserParams, JsonOutputKeyToolsParserParamsInterop, JsonOutputKeyToolsParserParamsSerializable, JsonOutputToolsParser, JsonOutputToolsParserParams, ParsedToolCall, convertLangChainToolCallToOpenAI, makeInvalidToolCall, parseToolCall };
//# sourceMappingURL=json_output_tools_parsers.d.cts.map