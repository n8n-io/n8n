import { t as FormatOptions } from "./_chunks/_format.mjs";
import { JSON5ParseOptions, JSON5StringifyOptions, parseJSON5, stringifyJSON5 } from "./json5.mjs";
import { JSONCParseError, JSONCParseOptions, parseJSONC, stringifyJSONC } from "./jsonc.mjs";
import { YAMLParseOptions, YAMLStringifyOptions, parseYAML, stringifyYAML } from "./yaml.mjs";
import { parseTOML, stringifyTOML } from "./toml.mjs";
import { INIParseOptions, INIStringifyOptions, parseINI, stringifyINI } from "./ini.mjs";

//#region src/json.d.ts
/**
 * Converts a [JSON](https://www.json.org/json-en.html) string into an object.
 *
 * Indentation status is auto-detected and preserved when stringifying back using `stringifyJSON`
 */
declare function parseJSON<T = unknown>(text: string, options?: JSONParseOptions): T;
/**
 * Converts a JavaScript value to a [JSON](https://www.json.org/json-en.html) string.
 *
 * Indentation status is auto detected and preserved when using value from parseJSON.
 */
declare function stringifyJSON(value: any, options?: JSONStringifyOptions): string;
interface JSONParseOptions extends FormatOptions {
  /**
   * A function that transforms the results. This function is called for each member of the object.
   */
  reviver?: (this: any, key: string, value: any) => any;
}
interface JSONStringifyOptions extends FormatOptions {
  /**
   * A function that transforms the results. This function is called for each member of the object.
   */
  replacer?: (this: any, key: string, value: any) => any;
}
//#endregion
export { type INIParseOptions, type INIStringifyOptions, type JSON5ParseOptions, type JSON5StringifyOptions, type JSONCParseError, type JSONCParseOptions, type JSONParseOptions, type JSONStringifyOptions, type YAMLParseOptions, type YAMLStringifyOptions, parseINI, parseJSON, parseJSON5, parseJSONC, parseTOML, parseYAML, stringifyINI, stringifyJSON, stringifyJSON5, stringifyJSONC, stringifyTOML, stringifyYAML };