import { AutoGPTAction } from "./schema.js";
import { BaseOutputParser } from "@langchain/core/output_parsers";

//#region src/experimental/autogpt/output_parser.d.ts

/**
 * Utility function used to preprocess a string to be parsed as JSON.
 * It replaces single backslashes with double backslashes, while leaving
 * already escaped ones intact.
 * It also extracts the json code if it is inside a code block
 */
declare function preprocessJsonInput(inputStr: string): string;
/**
 * Class responsible for parsing the output of AutoGPT. It extends the
 * BaseOutputParser class.
 */
declare class AutoGPTOutputParser extends BaseOutputParser<AutoGPTAction> {
  lc_namespace: string[];
  /**
   * Method not implemented in the class and will throw an error if called.
   * It is likely meant to be overridden in subclasses to provide specific
   * format instructions.
   * @returns Throws an error.
   */
  getFormatInstructions(): string;
  /**
   * Asynchronous method that takes a string as input and attempts to parse
   * it into an AutoGPTAction object. If the input string cannot be parsed
   * directly, the method tries to preprocess the string using the
   * preprocessJsonInput function and parse it again. If parsing fails
   * again, it returns an AutoGPTAction object with an error message.
   * @param text The string to be parsed.
   * @returns A Promise that resolves to an AutoGPTAction object.
   */
  parse(text: string): Promise<AutoGPTAction>;
}
//#endregion
export { AutoGPTOutputParser, preprocessJsonInput };
//# sourceMappingURL=output_parser.d.ts.map