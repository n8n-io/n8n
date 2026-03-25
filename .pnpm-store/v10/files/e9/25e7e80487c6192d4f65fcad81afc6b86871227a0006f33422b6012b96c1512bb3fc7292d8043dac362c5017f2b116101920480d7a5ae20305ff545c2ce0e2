import { SerializedFields } from "../load/map_keys.cjs";
import { BaseOutputParser } from "@langchain/core/output_parsers";

//#region src/output_parsers/regex.d.ts
interface RegExpFields {
  pattern: string;
  flags?: string;
}
/**
 * Interface for the fields required to create a RegexParser instance.
 */
interface RegexParserFields {
  regex: string | RegExp | RegExpFields;
  outputKeys: string[];
  defaultOutputKey?: string;
}
/**
 * Class to parse the output of an LLM call into a dictionary.
 * @augments BaseOutputParser
 */
declare class RegexParser extends BaseOutputParser<Record<string, string>> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  get lc_attributes(): SerializedFields | undefined;
  regex: string | RegExp;
  outputKeys: string[];
  defaultOutputKey?: string;
  constructor(fields: RegexParserFields);
  constructor(regex: string | RegExp, outputKeys: string[], defaultOutputKey?: string);
  _type(): string;
  /**
   * Parses the given text using the regex pattern and returns a dictionary
   * with the parsed output. If the regex pattern does not match the text
   * and no defaultOutputKey is provided, throws an OutputParserException.
   * @param text The text to be parsed.
   * @returns A dictionary with the parsed output.
   */
  parse(text: string): Promise<Record<string, string>>;
  /**
   * Returns a string with instructions on how the LLM output should be
   * formatted to match the regex pattern.
   * @returns A string with formatting instructions.
   */
  getFormatInstructions(): string;
}
//#endregion
export { RegexParser };
//# sourceMappingURL=regex.d.cts.map