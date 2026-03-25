import { StringWithAutocomplete } from "@langchain/core/utils/types";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { DirectoryLoader, UnknownHandling } from "@langchain/classic/document_loaders/fs/directory";
import { basename } from "node:path";
import { readFile } from "node:fs/promises";

//#region src/document_loaders/fs/unstructured.d.ts
declare const UNSTRUCTURED_API_FILETYPES: string[];
/**
 * Represents an element returned by the Unstructured API. It has
 * properties for the element type, text content, and metadata.
 */
type Element = {
  type: string;
  text: string;
  metadata: {
    [key: string]: unknown;
  };
};
/**
 * Represents the available strategies for the UnstructuredLoader. It can
 * be one of "hi_res", "fast", "ocr_only", or "auto".
 */
type UnstructuredLoaderStrategy = "hi_res" | "fast" | "ocr_only" | "auto";
/**
 * Represents the available hi-res models for the UnstructuredLoader. It can
 * be one of "chipper".
 */
type HiResModelName = "chipper";
/**
 * To enable or disable table extraction for file types other than PDF, set
 * the skipInferTableTypes property in the UnstructuredLoaderOptions object.
 * The skipInferTableTypes property is an array of file types for which table
 * extraction is disabled. For example, to disable table extraction for .docx
 * and .doc files, set the skipInferTableTypes property to ["docx", "doc"].
 * You can also disable table extraction for all file types other than PDF by
 * setting the skipInferTableTypes property to [].
 */
type SkipInferTableTypes = "txt" | "text" | "pdf" | "docx" | "doc" | "jpg" | "jpeg" | "eml" | "html" | "htm" | "md" | "pptx" | "ppt" | "msg" | "rtf" | "xlsx" | "xls" | "odt" | "epub";
/**
 * Set the chunking_strategy to chunk text into larger or smaller elements. Defaults to None with optional arg of by_title
 */
type ChunkingStrategy = "None" | "by_title";
type UnstructuredLoaderOptions = {
  apiKey?: string;
  apiUrl?: string;
  strategy?: StringWithAutocomplete<UnstructuredLoaderStrategy>;
  encoding?: string;
  ocrLanguages?: Array<string>;
  coordinates?: boolean;
  pdfInferTableStructure?: boolean;
  xmlKeepTags?: boolean;
  skipInferTableTypes?: Array<StringWithAutocomplete<SkipInferTableTypes>>;
  hiResModelName?: StringWithAutocomplete<HiResModelName>;
  includePageBreaks?: boolean;
  chunkingStrategy?: StringWithAutocomplete<ChunkingStrategy>;
  multiPageSections?: boolean;
  combineUnderNChars?: number;
  newAfterNChars?: number;
  maxCharacters?: number;
  extractImageBlockTypes?: string[];
  overlap?: number;
  overlapAll?: boolean;
};
type UnstructuredDirectoryLoaderOptions = UnstructuredLoaderOptions & {
  recursive?: boolean;
  unknown?: UnknownHandling;
};
type UnstructuredMemoryLoaderOptions = {
  buffer: Buffer;
  fileName: string;
};
/**
 * A document loader that uses the Unstructured API to load unstructured
 * documents. It supports both the new syntax with options object and the
 * legacy syntax for backward compatibility. The load() method sends a
 * partitioning request to the Unstructured API and retrieves the
 * partitioned elements. It creates a Document instance for each element
 * and returns an array of Document instances.
 *
 * It accepts either a filepath or an object containing a buffer and a filename
 * as input.
 */
declare class UnstructuredLoader extends BaseDocumentLoader {
  filePath: string;
  private buffer?;
  private fileName?;
  private apiUrl;
  private apiKey?;
  private strategy;
  private encoding?;
  private ocrLanguages;
  private coordinates?;
  private pdfInferTableStructure?;
  private xmlKeepTags?;
  private skipInferTableTypes?;
  private hiResModelName?;
  private includePageBreaks?;
  private chunkingStrategy?;
  private multiPageSections?;
  private combineUnderNChars?;
  private newAfterNChars?;
  private maxCharacters?;
  private extractImageBlockTypes?;
  private overlap?;
  private overlapAll?;
  constructor(filepathOrBufferOptions: string | UnstructuredMemoryLoaderOptions, unstructuredOptions?: UnstructuredLoaderOptions | string);
  _partition(): Promise<Element[]>;
  load(): Promise<Document[]>;
  imports(): Promise<{
    readFile: typeof readFile;
    basename: typeof basename;
  }>;
}
/**
 * A document loader that loads unstructured documents from a directory
 * using the UnstructuredLoader. It creates a UnstructuredLoader instance
 * for each supported file type and passes it to the DirectoryLoader
 * constructor.
 * @example
 * ```typescript
 * const loader = new UnstructuredDirectoryLoader("path/to/directory", {
 *   apiKey: "MY_API_KEY",
 * });
 * const docs = await loader.load();
 * ```
 */
declare class UnstructuredDirectoryLoader extends DirectoryLoader {
  constructor(directoryPathOrLegacyApiUrl: string, optionsOrLegacyDirectoryPath: UnstructuredDirectoryLoaderOptions | string, legacyOptionRecursive?: boolean, legacyOptionUnknown?: UnknownHandling);
}
//#endregion
export { ChunkingStrategy, HiResModelName, SkipInferTableTypes, UNSTRUCTURED_API_FILETYPES, UnknownHandling, UnstructuredDirectoryLoader, UnstructuredDirectoryLoaderOptions, UnstructuredLoader, UnstructuredLoaderOptions, UnstructuredLoaderStrategy, UnstructuredMemoryLoaderOptions };
//# sourceMappingURL=unstructured.d.cts.map