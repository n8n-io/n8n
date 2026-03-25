import { BaseCallbackConfig, Callbacks } from "@langchain/core/callbacks/manager";
import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/vectara.d.ts

/**
 * Interface for the arguments required to initialize a VectaraStore
 * instance.
 */
interface VectaraLibArgs {
  customerId: number;
  corpusId: number | number[];
  apiKey: string;
  verbose?: boolean;
  source?: string;
}
/**
 * Interface for the headers required for Vectara API calls.
 */
interface VectaraCallHeader {
  headers: {
    "x-api-key": string;
    "Content-Type": string;
    "customer-id": string;
    "X-Source": string;
  };
}
/**
 * Interface for the file objects to be uploaded to Vectara.
 */
interface VectaraFile {
  blob: Blob;
  fileName: string;
}
/**
 * Interface for the context configuration used in Vectara API calls.
 */
interface VectaraContextConfig {
  charsBefore?: number;
  charsAfter?: number;
  sentencesBefore?: number;
  sentencesAfter?: number;
  startTag?: string;
  endTag?: string;
}
interface MMRConfig {
  enabled?: boolean;
  mmrTopK?: number;
  diversityBias?: number;
}
interface VectaraSummary {
  enabled: boolean;
  summarizerPromptName?: string;
  maxSummarizedResults: number;
  responseLang: string;
}
interface VectaraFilter extends BaseCallbackConfig {
  start?: number;
  filter?: string;
  lambda?: number;
  contextConfig?: VectaraContextConfig;
  mmrConfig?: MMRConfig;
}
declare const DEFAULT_FILTER: VectaraFilter;
interface SummaryResult {
  documents: Document[];
  scores: number[];
  summary: string;
}
interface VectaraRetrieverInput {
  vectara: VectaraStore;
  topK: number;
  summaryConfig?: VectaraSummary;
  callbacks?: Callbacks;
  tags?: string[];
  metadata?: Record<string, unknown>;
  verbose?: boolean;
}
/**
 * Class for interacting with the Vectara API. Extends the VectorStore
 * class.
 */
declare class VectaraStore extends VectorStore {
  get lc_secrets(): {
    [key: string]: string;
  };
  get lc_aliases(): {
    [key: string]: string;
  };
  FilterType: VectaraFilter;
  private apiEndpoint;
  private apiKey;
  private corpusId;
  private customerId;
  private verbose;
  private source;
  private vectaraApiTimeoutSeconds;
  _vectorstoreType(): string;
  constructor(args: VectaraLibArgs);
  /**
   * Returns a header for Vectara API calls.
   * @returns A Promise that resolves to a VectaraCallHeader object.
   */
  getJsonHeader(): Promise<VectaraCallHeader>;
  /**
   * Throws an error, as this method is not implemented. Use addDocuments
   * instead.
   * @param _vectors Not used.
   * @param _documents Not used.
   * @returns Does not return a value.
   */
  addVectors(_vectors: number[][], _documents: Document[]): Promise<void>;
  /**
   * Method to delete data from the Vectara corpus.
   * @param params an array of document IDs to be deleted
   * @returns Promise that resolves when the deletion is complete.
   */
  deleteDocuments(ids: string[]): Promise<void>;
  /**
   * Adds documents to the Vectara store.
   * @param documents An array of Document objects to add to the Vectara store.
   * @returns A Promise that resolves to an array of document IDs indexed in Vectara.
   */
  addDocuments(documents: Document[]): Promise<string[]>;
  /**
   * Vectara provides a way to add documents directly via their API. This API handles
   * pre-processing and chunking internally in an optimal manner. This method is a wrapper
   * to utilize that API within LangChain.
   *
   * @param files An array of VectaraFile objects representing the files and their respective file names to be uploaded to Vectara.
   * @param metadata Optional. An array of metadata objects corresponding to each file in the `filePaths` array.
   * @returns A Promise that resolves to the number of successfully uploaded files.
   */
  addFiles(files: VectaraFile[], metadatas?: Record<string, unknown> | undefined): Promise<string[]>;
  /**
   * Performs a Vectara API call based on the arguments provided.
   * @param query The query string for the similarity search.
   * @param k Optional. The number of results to return. Default is 10.
   * @param filter Optional. A VectaraFilter object to refine the search results.
   * @returns A Promise that resolves to an array of tuples, each containing a Document and its score.
   */
  vectaraQuery(query: string, k: number, vectaraFilterObject: VectaraFilter, summary?: VectaraSummary): Promise<SummaryResult>;
  /**
   * Performs a similarity search and returns documents along with their
   * scores.
   * @param query The query string for the similarity search.
   * @param k Optional. The number of results to return. Default is 10.
   * @param filter Optional. A VectaraFilter object to refine the search results.
   * @returns A Promise that resolves to an array of tuples, each containing a Document and its score.
   */
  similaritySearchWithScore(query: string, k?: number, filter?: VectaraFilter): Promise<[Document, number][]>;
  /**
   * Performs a similarity search and returns documents.
   * @param query The query string for the similarity search.
   * @param k Optional. The number of results to return. Default is 10.
   * @param filter Optional. A VectaraFilter object to refine the search results.
   * @returns A Promise that resolves to an array of Document objects.
   */
  similaritySearch(query: string, k?: number, filter?: VectaraFilter): Promise<Document[]>;
  /**
   * Throws an error, as this method is not implemented. Use
   * similaritySearch or similaritySearchWithScore instead.
   * @param _query Not used.
   * @param _k Not used.
   * @param _filter Not used.
   * @returns Does not return a value.
   */
  similaritySearchVectorWithScore(_query: number[], _k: number, _filter?: VectaraFilter | undefined): Promise<[Document, number][]>;
  /**
   * Creates a VectaraStore instance from texts.
   * @param texts An array of text strings.
   * @param metadatas Metadata for the texts. Can be a single object or an array of objects.
   * @param _embeddings Not used.
   * @param args A VectaraLibArgs object for initializing the VectaraStore instance.
   * @returns A Promise that resolves to a VectaraStore instance.
   */
  static fromTexts(texts: string[], metadatas: object | object[], _embeddings: EmbeddingsInterface, args: VectaraLibArgs): Promise<VectaraStore>;
  /**
   * Creates a VectaraStore instance from documents.
   * @param docs An array of Document objects.
   * @param _embeddings Not used.
   * @param args A VectaraLibArgs object for initializing the VectaraStore instance.
   * @returns A Promise that resolves to a VectaraStore instance.
   */
  static fromDocuments(docs: Document[], _embeddings: EmbeddingsInterface, args: VectaraLibArgs): Promise<VectaraStore>;
}
//#endregion
export { DEFAULT_FILTER, MMRConfig, VectaraContextConfig, VectaraFile, VectaraFilter, VectaraLibArgs, VectaraRetrieverInput, VectaraStore, VectaraSummary };
//# sourceMappingURL=vectara.d.cts.map