import { BaseMessage } from "../messages/base.cjs";
import { BaseTransformOutputParser } from "./transform.cjs";

//#region src/output_parsers/list.d.ts
/**
 * Class to parse the output of an LLM call to a list.
 * @augments BaseOutputParser
 */
declare abstract class ListOutputParser extends BaseTransformOutputParser<string[]> {
  re?: RegExp;
  _transform(inputGenerator: AsyncGenerator<string | BaseMessage>): AsyncGenerator<string[]>;
}
/**
 * Class to parse the output of an LLM call as a comma-separated list.
 * @augments ListOutputParser
 */
declare class CommaSeparatedListOutputParser extends ListOutputParser {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  /**
   * Parses the given text into an array of strings, using a comma as the
   * separator. If the parsing fails, throws an OutputParserException.
   * @param text The text to parse.
   * @returns An array of strings obtained by splitting the input text at each comma.
   */
  parse(text: string): Promise<string[]>;
  /**
   * Provides instructions on the expected format of the response for the
   * CommaSeparatedListOutputParser.
   * @returns A string containing instructions on the expected format of the response.
   */
  getFormatInstructions(): string;
}
/**
 * Class to parse the output of an LLM call to a list with a specific length and separator.
 * @augments ListOutputParser
 */
declare class CustomListOutputParser extends ListOutputParser {
  lc_namespace: string[];
  private length;
  private separator;
  constructor({
    length,
    separator
  }: {
    length?: number;
    separator?: string;
  });
  /**
   * Parses the given text into an array of strings, using the specified
   * separator. If the parsing fails or the number of items in the list
   * doesn't match the expected length, throws an OutputParserException.
   * @param text The text to parse.
   * @returns An array of strings obtained by splitting the input text at each occurrence of the specified separator.
   */
  parse(text: string): Promise<string[]>;
  /**
   * Provides instructions on the expected format of the response for the
   * CustomListOutputParser, including the number of items and the
   * separator.
   * @returns A string containing instructions on the expected format of the response.
   */
  getFormatInstructions(): string;
}
declare class NumberedListOutputParser extends ListOutputParser {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  getFormatInstructions(): string;
  re: RegExp;
  parse(text: string): Promise<string[]>;
}
declare class MarkdownListOutputParser extends ListOutputParser {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  getFormatInstructions(): string;
  re: RegExp;
  parse(text: string): Promise<string[]>;
}
//#endregion
export { CommaSeparatedListOutputParser, CustomListOutputParser, ListOutputParser, MarkdownListOutputParser, NumberedListOutputParser };
//# sourceMappingURL=list.d.cts.map