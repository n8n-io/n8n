import { BaseContentBlock } from "./base.js";
import { Tools } from "./tools.js";
import { Multimodal } from "./multimodal.js";
import { Data } from "./data.js";

//#region ../langchain-core/dist/messages/content/index.d.ts
//#region src/messages/content/index.d.ts
interface ContentBlock extends BaseContentBlock {}
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace ContentBlock {
  /**
   * Annotation for citing data from a document.
   */
  export interface Citation {
    /**
     * Type of the content block
     */
    readonly type: "citation";
    /**
     * Source type for the citation.
     */
    source?: string;
    /**
     * URL of the document source
     */
    url?: string;
    /**
     * Source document title.
     *
     * For example, the page title for a web page or the title of a paper.
     */
    title?: string;
    /**
     * Start index of the **response text** for which the annotation applies.
     *
     * @see {Text}
     */
    startIndex?: number;
    /**
     * End index of the **response text** for which the annotation applies.
     *
     * @see {Text}
     */
    endIndex?: number;
    /**
     * Excerpt of source text being cited.
     */
    citedText?: string;
  }
  /**
   * Text output from a LLM.
   *
   * This typically represents the main text content of a message, such as the response
   * from a language model or the text of a user message.
   */
  export interface Text extends ContentBlock {
    /**
     * Type of the content block
     */
    readonly type: "text";
    /**
     * Block text.
     */
    text: string;
    /**
     * Index of block in aggregate response. Used during streaming.
     */
    index?: number;
    /**
     * Citations and other annotations.
     */
    annotations?: Array<Citation | BaseContentBlock>;
  }
  /**
   * Reasoning output from a LLM.
   */
  export interface Reasoning extends ContentBlock {
    /**
     * Type of the content block
     */
    readonly type: "reasoning";
    /**
     * Reasoning text.
     *
     * Either the thought summary or the raw reasoning text itself.
     * This is often parsed from `<think>` tags in the model's response.
     */
    reasoning: string;
    /**
     * Index of block in aggregate response. Used during streaming.
     */
    index?: number;
  }
  /**
   * Provider-specific content block.
   *
   * This is used to represent content blocks that are not part of the standard LangChain content model.
   * If a provider's non-standard output includes reasoning and tool calls, it should be
   * the adapter's job to parse that payload and emit the corresponding standard reasoning and tool call blocks.
   */
  export interface NonStandard<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TValue extends Record<string, any> = Record<string, any>> extends ContentBlock {
    /**
     * Type of the content block
     */
    type: "non_standard";
    /**
     * Provider-specific data
     */
    value: TValue;
  }
  export { Tools };
  export { Multimodal };
  export { Data };
  export type Standard = Text | Reasoning | NonStandard | Tools.Standard | Multimodal.Standard;
}
//#endregion
//#endregion
export { ContentBlock };
//# sourceMappingURL=index.d.ts.map