import { Document, MappingDocumentTransformer } from "@langchain/core/documents";
import { HtmlToTextOptions } from "html-to-text";

//#region src/document_transformers/html_to_text.d.ts

/**
 * A transformer that converts HTML content to plain text.
 * @example
 * ```typescript
 * const loader = new CheerioWebBaseLoader("https://example.com/some-page");
 * const docs = await loader.load();
 *
 * const splitter = new RecursiveCharacterTextSplitter({
 *  maxCharacterCount: 1000,
 * });
 * const transformer = new HtmlToTextTransformer();
 *
 * // The sequence of text splitting followed by HTML to text transformation
 * const sequence = splitter.pipe(transformer);
 *
 * // Processing the loaded documents through the sequence
 * const newDocuments = await sequence.invoke(docs);
 *
 * console.log(newDocuments);
 * ```
 */
declare class HtmlToTextTransformer extends MappingDocumentTransformer {
  protected options: HtmlToTextOptions;
  static lc_name(): string;
  constructor(options?: HtmlToTextOptions);
  _transformDocument(document: Document): Promise<Document>;
}
//#endregion
export { HtmlToTextTransformer };
//# sourceMappingURL=html_to_text.d.cts.map