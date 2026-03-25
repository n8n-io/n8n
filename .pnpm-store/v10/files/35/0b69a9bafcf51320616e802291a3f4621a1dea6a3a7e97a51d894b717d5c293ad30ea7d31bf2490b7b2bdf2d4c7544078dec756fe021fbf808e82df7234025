import { Optional } from "../types/type-utils.cjs";
import { ChatGeneration, Generation } from "@langchain/core/outputs";
import { BaseCumulativeTransformOutputParser, BaseCumulativeTransformOutputParserInput, BaseLLMOutputParser } from "@langchain/core/output_parsers";
import { JsonSchema7ObjectType } from "@langchain/core/utils/json_schema";
import { Operation } from "@langchain/core/utils/json_patch";

//#region src/output_parsers/openai_functions.d.ts

/**
 * Represents optional parameters for a function in a JSON Schema.
 */
type FunctionParameters = Optional<JsonSchema7ObjectType, "additionalProperties">;
/**
 * Class for parsing the output of an LLM. Can be configured to return
 * only the arguments of the function call in the output.
 */
declare class OutputFunctionsParser extends BaseLLMOutputParser<string> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  argsOnly: boolean;
  constructor(config?: {
    argsOnly?: boolean;
  });
  /**
   * Parses the output and returns a string representation of the function
   * call or its arguments.
   * @param generations The output of the LLM to parse.
   * @returns A string representation of the function call or its arguments.
   */
  parseResult(generations: Generation[] | ChatGeneration[]): Promise<string>;
}
/**
 * Class for parsing the output of an LLM into a JSON object. Uses an
 * instance of `OutputFunctionsParser` to parse the output.
 */
declare class JsonOutputFunctionsParser<Output extends object = object> extends BaseCumulativeTransformOutputParser<Output> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  outputParser: OutputFunctionsParser;
  argsOnly: boolean;
  constructor(config?: {
    argsOnly?: boolean;
  } & BaseCumulativeTransformOutputParserInput);
  protected _diff(prev: unknown | undefined, next: unknown): Operation[] | undefined;
  parsePartialResult(generations: ChatGeneration[]): Promise<Output | undefined>;
  /**
   * Parses the output and returns a JSON object. If `argsOnly` is true,
   * only the arguments of the function call are returned.
   * @param generations The output of the LLM to parse.
   * @returns A JSON object representation of the function call or its arguments.
   */
  parseResult(generations: Generation[] | ChatGeneration[]): Promise<Output>;
  parse(text: string): Promise<Output>;
  getFormatInstructions(): string;
}
/**
 * Class for parsing the output of an LLM into a JSON object and returning
 * a specific attribute. Uses an instance of `JsonOutputFunctionsParser`
 * to parse the output.
 */
declare class JsonKeyOutputFunctionsParser<T = object> extends BaseLLMOutputParser<T> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  outputParser: JsonOutputFunctionsParser<object>;
  attrName: string;
  get lc_aliases(): {
    attrName: string;
  };
  constructor(fields: {
    attrName: string;
  });
  /**
   * Parses the output and returns a specific attribute of the parsed JSON
   * object.
   * @param generations The output of the LLM to parse.
   * @returns The value of a specific attribute of the parsed JSON object.
   */
  parseResult(generations: Generation[] | ChatGeneration[]): Promise<T>;
}
//#endregion
export { FunctionParameters, JsonKeyOutputFunctionsParser, JsonOutputFunctionsParser, OutputFunctionsParser };
//# sourceMappingURL=openai_functions.d.cts.map