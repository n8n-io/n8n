import { Tool, ToolParams } from "@langchain/core/tools";
import { Serializable } from "@langchain/core/load/serializable";

//#region src/tools/json.d.ts
type Json = string | number | boolean | null | {
  [key: string]: Json;
} | Json[];
type JsonObject = {
  [key: string]: Json;
};
/**
 * Represents a JSON object in the LangChain framework. Provides methods
 * to get keys and values from the JSON object.
 */
declare class JsonSpec extends Serializable {
  lc_namespace: string[];
  obj: JsonObject;
  maxValueLength: number;
  constructor(obj: JsonObject, max_value_length?: number);
  /**
   * Retrieves all keys at a given path in the JSON object.
   * @param input The path to the keys in the JSON object, provided as a string in JSON pointer syntax.
   * @returns A string containing all keys at the given path, separated by commas.
   */
  getKeys(input: string): string;
  /**
   * Retrieves the value at a given path in the JSON object.
   * @param input The path to the value in the JSON object, provided as a string in JSON pointer syntax.
   * @returns The value at the given path in the JSON object, as a string. If the value is a large dictionary or exceeds the maximum length, a message is returned instead.
   */
  getValue(input: string): string;
}
interface JsonToolFields extends ToolParams {
  jsonSpec: JsonSpec;
}
/**
 * A tool in the LangChain framework that lists all keys at a given path
 * in a JSON object.
 */
declare class JsonListKeysTool extends Tool {
  static lc_name(): string;
  name: string;
  jsonSpec: JsonSpec;
  constructor(jsonSpec: JsonSpec);
  constructor(fields: JsonToolFields);
  /** @ignore */
  _call(input: string): Promise<string>;
  description: string;
}
/**
 * A tool in the LangChain framework that retrieves the value at a given
 * path in a JSON object.
 */
declare class JsonGetValueTool extends Tool {
  jsonSpec: JsonSpec;
  static lc_name(): string;
  name: string;
  constructor(jsonSpec: JsonSpec);
  /** @ignore */
  _call(input: string): Promise<string>;
  description: string;
}
//#endregion
export { Json, JsonGetValueTool, JsonListKeysTool, JsonObject, JsonSpec };
//# sourceMappingURL=json.d.cts.map