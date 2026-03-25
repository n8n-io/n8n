import { AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { Client } from "typesense";
import { MultiSearchRequestSchema } from "typesense/lib/Typesense/MultiSearch.js";

//#region src/vectorstores/typesense.d.ts

/**
 * Typesense vector store configuration.
 */
interface TypesenseConfig extends AsyncCallerParams {
  /**
   * Typesense client.
   */
  typesenseClient: Client;
  /**
   * Typesense schema name in which documents will be stored and searched.
   */
  schemaName: string;
  /**
   * Typesense search parameters.
   * @default { q: '*', per_page: 5, query_by: '' }
   */
  searchParams?: MultiSearchRequestSchema;
  /**
   * Column names.
   */
  columnNames?: {
    /**
     * Vector column name.
     * @default 'vec'
     */
    vector?: string;
    /**
     * Page content column name.
     * @default 'text'
     */
    pageContent?: string;
    /**
     * Metadata column names.
     * @default []
     */
    metadataColumnNames?: string[];
  };
  /**
   * Replace default import function.
   * Default import function will update documents if there is a document with the same id.
   * @param data
   * @param collectionName
   */
  import?<T extends Record<string, unknown> = Record<string, unknown>>(data: T[], collectionName: string): Promise<void>;
}
/**
 * Typesense vector store.
 */
declare class Typesense extends VectorStore {
  FilterType: Partial<MultiSearchRequestSchema>;
  private client;
  private schemaName;
  private searchParams;
  private vectorColumnName;
  private pageContentColumnName;
  private metadataColumnNames;
  private caller;
  private import;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, config: TypesenseConfig);
  private importToTypesense;
  /**
   * Transform documents to Typesense records.
   * @param documents
   * @returns Typesense records.
   */
  _documentsToTypesenseRecords(documents: Document[], vectors: number[][]): Record<string, unknown>[];
  /**
   * Transform the Typesense records to documents.
   * @param typesenseRecords
   * @returns documents
   */
  _typesenseRecordsToDocuments(typesenseRecords: {
    document?: Record<string, unknown>;
    vector_distance: number;
  }[] | undefined): [Document, number][];
  /**
   * Add documents to the vector store.
   * Will be updated if in the metadata there is a document with the same id if is using the default import function.
   * Metadata will be added in the columns of the schema based on metadataColumnNames.
   * @param documents Documents to add.
   */
  addDocuments(documents: Document[]): Promise<void>;
  /**
   * Adds vectors to the vector store.
   * @param vectors Vectors to add.
   * @param documents Documents associated with the vectors.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  /**
   * Search for similar documents with their similarity score.
   * @param vectorPrompt vector to search for
   * @param k amount of results to return
   * @returns similar documents with their similarity score
   */
  similaritySearchVectorWithScore(vectorPrompt: number[], k?: number, filter?: this["FilterType"]): Promise<[Document<Record<string, any>>, number][]>;
  /**
   * Delete documents from the vector store.
   * @param documentIds ids of the documents to delete
   */
  deleteDocuments(documentIds: string[]): Promise<void>;
  /**
   * Create a vector store from documents.
   * @param docs documents
   * @param embeddings embeddings
   * @param config Typesense configuration
   * @returns Typesense vector store
   * @warning You can omit this method, and only use the constructor and addDocuments.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, config: TypesenseConfig): Promise<Typesense>;
  /**
   * Create a vector store from texts.
   * @param texts
   * @param metadatas
   * @param embeddings
   * @param config
   * @returns Typesense vector store
   */
  static fromTexts(texts: string[], metadatas: object[], embeddings: EmbeddingsInterface, config: TypesenseConfig): Promise<Typesense>;
}
//#endregion
export { Typesense, TypesenseConfig };
//# sourceMappingURL=typesense.d.ts.map