import { BaseMessage } from "../messages/base.js";
import { ChatGeneration, Generation } from "../outputs.js";
import { Operation } from "../utils/fast-json-patch/src/core.js";
import { BaseCumulativeTransformOutputParser } from "./transform.js";
import { parseJsonMarkdown, parsePartialJson } from "../utils/json.js";

//#region src/output_parsers/json.d.ts
/**
 * Class for parsing the output of an LLM into a JSON object.
 */
declare class JsonOutputParser<T extends Record<string, any> = Record<string, any>> extends BaseCumulativeTransformOutputParser<T> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  /** @internal */
  _concatOutputChunks<T>(first: T, second: T): T;
  protected _diff(prev: unknown | undefined, next: unknown): Operation[] | undefined;
  parsePartialResult(generations: ChatGeneration[] | Generation[]): Promise<T | undefined>;
  parse(text: string): Promise<T>;
  getFormatInstructions(): string;
  /**
   * Extracts text content from a message for JSON parsing.
   * Uses the message's `.text` accessor which properly handles both
   * string content and ContentBlock[] arrays (extracting text from text blocks).
   * @param message The message to extract text from
   * @returns The text content of the message
   */
  protected _baseMessageToString(message: BaseMessage): string;
}
//#endregion
export { JsonOutputParser };
//# sourceMappingURL=json.d.ts.map