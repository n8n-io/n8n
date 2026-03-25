import { BaseMessage } from "@langchain/core/messages";
import { BaseTransformOutputParser } from "@langchain/core/output_parsers";

//#region src/output_parsers/http_response.d.ts
type HttpResponseOutputParserInput = {
  outputParser?: BaseTransformOutputParser;
  contentType?: "text/plain" | "text/event-stream";
};
/**
 * OutputParser that formats chunks emitted from an LLM for different HTTP content types.
 */
declare class HttpResponseOutputParser extends BaseTransformOutputParser<Uint8Array> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  outputParser: BaseTransformOutputParser;
  contentType: "text/plain" | "text/event-stream";
  constructor(fields?: HttpResponseOutputParserInput);
  _transform(inputGenerator: AsyncGenerator<string | BaseMessage>): AsyncGenerator<Uint8Array>;
  /**
   * Parses a string output from an LLM call. This method is meant to be
   * implemented by subclasses to define how a string output from an LLM
   * should be parsed.
   * @param text The string output from an LLM call.
   * @param callbacks Optional callbacks.
   * @returns A promise of the parsed output.
   */
  parse(text: string): Promise<Uint8Array>;
  getFormatInstructions(): string;
}
//#endregion
export { HttpResponseOutputParser, HttpResponseOutputParserInput };
//# sourceMappingURL=http_response.d.cts.map