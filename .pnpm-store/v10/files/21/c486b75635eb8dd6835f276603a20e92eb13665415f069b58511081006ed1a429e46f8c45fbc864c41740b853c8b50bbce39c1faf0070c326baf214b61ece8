import * as tiktoken from "js-tiktoken";
import { BaseDocumentTransformer, Document } from "@langchain/core/documents";

//#region src/text_splitter.d.ts
interface TextSplitterParams {
  chunkSize: number;
  chunkOverlap: number;
  keepSeparator: boolean;
  lengthFunction?: ((text: string) => number) | ((text: string) => Promise<number>);
}
type TextSplitterChunkHeaderOptions = {
  chunkHeader?: string;
  chunkOverlapHeader?: string;
  appendChunkOverlapHeader?: boolean;
};
declare abstract class TextSplitter extends BaseDocumentTransformer implements TextSplitterParams {
  lc_namespace: string[];
  chunkSize: number;
  chunkOverlap: number;
  keepSeparator: boolean;
  lengthFunction: ((text: string) => number) | ((text: string) => Promise<number>);
  constructor(fields?: Partial<TextSplitterParams>);
  transformDocuments(documents: Document[], chunkHeaderOptions?: TextSplitterChunkHeaderOptions): Promise<Document[]>;
  abstract splitText(text: string): Promise<string[]>;
  protected splitOnSeparator(text: string, separator: string): string[];
  createDocuments(texts: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadatas?: Record<string, any>[], chunkHeaderOptions?: TextSplitterChunkHeaderOptions): Promise<Document[]>;
  private numberOfNewLines;
  splitDocuments(documents: Document[], chunkHeaderOptions?: TextSplitterChunkHeaderOptions): Promise<Document[]>;
  private joinDocs;
  mergeSplits(splits: string[], separator: string): Promise<string[]>;
}
interface CharacterTextSplitterParams extends TextSplitterParams {
  separator: string;
}
declare class CharacterTextSplitter extends TextSplitter implements CharacterTextSplitterParams {
  static lc_name(): string;
  separator: string;
  constructor(fields?: Partial<CharacterTextSplitterParams>);
  splitText(text: string): Promise<string[]>;
}
interface RecursiveCharacterTextSplitterParams extends TextSplitterParams {
  separators: string[];
}
declare const SupportedTextSplitterLanguages: readonly ["cpp", "go", "java", "js", "php", "proto", "python", "rst", "ruby", "rust", "scala", "swift", "markdown", "latex", "html", "sol"];
type SupportedTextSplitterLanguage = (typeof SupportedTextSplitterLanguages)[number];
declare class RecursiveCharacterTextSplitter extends TextSplitter implements RecursiveCharacterTextSplitterParams {
  static lc_name(): string;
  separators: string[];
  constructor(fields?: Partial<RecursiveCharacterTextSplitterParams>);
  private _splitText;
  splitText(text: string): Promise<string[]>;
  static fromLanguage(language: SupportedTextSplitterLanguage, options?: Partial<RecursiveCharacterTextSplitterParams>): RecursiveCharacterTextSplitter;
  static getSeparatorsForLanguage(language: SupportedTextSplitterLanguage): string[];
}
interface TokenTextSplitterParams extends TextSplitterParams {
  encodingName: tiktoken.TiktokenEncoding;
  allowedSpecial: "all" | Array<string>;
  disallowedSpecial: "all" | Array<string>;
}
/**
 * Implementation of splitter which looks at tokens.
 */
declare class TokenTextSplitter extends TextSplitter implements TokenTextSplitterParams {
  static lc_name(): string;
  encodingName: tiktoken.TiktokenEncoding;
  allowedSpecial: "all" | Array<string>;
  disallowedSpecial: "all" | Array<string>;
  private tokenizer;
  constructor(fields?: Partial<TokenTextSplitterParams>);
  splitText(text: string): Promise<string[]>;
}
type MarkdownTextSplitterParams = TextSplitterParams;
declare class MarkdownTextSplitter extends RecursiveCharacterTextSplitter implements MarkdownTextSplitterParams {
  constructor(fields?: Partial<MarkdownTextSplitterParams>);
}
type LatexTextSplitterParams = TextSplitterParams;
declare class LatexTextSplitter extends RecursiveCharacterTextSplitter implements LatexTextSplitterParams {
  constructor(fields?: Partial<LatexTextSplitterParams>);
}
//#endregion
export { CharacterTextSplitter, CharacterTextSplitterParams, LatexTextSplitter, LatexTextSplitterParams, MarkdownTextSplitter, MarkdownTextSplitterParams, RecursiveCharacterTextSplitter, RecursiveCharacterTextSplitterParams, SupportedTextSplitterLanguage, SupportedTextSplitterLanguages, TextSplitter, TextSplitterChunkHeaderOptions, TextSplitterParams, TokenTextSplitter, TokenTextSplitterParams };
//# sourceMappingURL=text_splitter.d.cts.map