import { ContentBlock } from "../messages/content/index.cjs";
import { BaseTransformOutputParser } from "./transform.cjs";

//#region src/output_parsers/string.d.ts
/**
 * OutputParser that parses LLMResult into the top likely string.
 * @example
 * ```typescript
 * const promptTemplate = PromptTemplate.fromTemplate(
 *   "Tell me a joke about {topic}",
 * );
 *
 * const chain = RunnableSequence.from([
 *   promptTemplate,
 *   new ChatOpenAI({ model: "gpt-4o-mini" }),
 *   new StringOutputParser(),
 * ]);
 *
 * const result = await chain.invoke({ topic: "bears" });
 * console.log("What do you call a bear with no teeth? A gummy bear!");
 * ```
 */
declare class StringOutputParser extends BaseTransformOutputParser<string> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  /**
   * Parses a string output from an LLM call. This method is meant to be
   * implemented by subclasses to define how a string output from an LLM
   * should be parsed.
   * @param text The string output from an LLM call.
   * @param callbacks Optional callbacks.
   * @returns A promise of the parsed output.
   */
  parse(text: string): Promise<string>;
  getFormatInstructions(): string;
  protected _textContentToString(content: ContentBlock.Text): string;
  protected _imageUrlContentToString(_content: ContentBlock.Data.URLContentBlock): string;
  protected _messageContentToString(content: ContentBlock): string;
  protected _baseMessageContentToString(content: ContentBlock[]): string;
}
//#endregion
export { StringOutputParser };
//# sourceMappingURL=string.d.cts.map