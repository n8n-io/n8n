import { WhereCondition } from "../utils/sqlite_where_builder.cjs";
import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { Client, InStatement } from "@libsql/client";

//#region src/vectorstores/libsql.d.ts
type MetadataDefault = Record<string, any>;
/**
 * Interface for LibSQLVectorStore configuration options.
 */
interface LibSQLVectorStoreArgs {
  db: Client;
  /** Name of the table to store vectors. Defaults to "vectors". */
  table?: string;
  /** Name of the column to store embeddings. Defaults to "embedding". */
  column?: string;
}
/**
 * A vector store using LibSQL/Turso for storage and retrieval.
 */
declare class LibSQLVectorStore<Metadata extends MetadataDefault = MetadataDefault> extends VectorStore {
  FilterType: string | InStatement | WhereCondition<Metadata>;
  private db;
  private readonly table;
  private readonly column;
  /**
   * Returns the type of vector store.
   * @returns {string} The string "libsql".
   */
  _vectorstoreType(): string;
  /**
   * Initializes a new instance of the LibSQLVectorStore.
   * @param {EmbeddingsInterface} embeddings - The embeddings interface to use.
   * @param {Client} db - The LibSQL client instance.
   * @param {LibSQLVectorStoreArgs} options - Configuration options for the vector store.
   */
  constructor(embeddings: EmbeddingsInterface, options: LibSQLVectorStoreArgs);
  /**
   * Adds documents to the vector store.
   * @param {Document<Metadata>[]} documents - The documents to add.
   * @returns {Promise<string[]>} The IDs of the added documents.
   */
  addDocuments(documents: Document<Metadata>[]): Promise<string[]>;
  /**
   * Adds vectors to the vector store.
   * @param {number[][]} vectors - The vectors to add.
   * @param {Document<Metadata>[]} documents - The documents associated with the vectors.
   * @returns {Promise<string[]>} The IDs of the added vectors.
   */
  addVectors(vectors: number[][], documents: Document<Metadata>[]): Promise<string[]>;
  /**
   * Performs a similarity search using a vector query and returns documents with their scores.
   * @param {number[]} query - The query vector.
   * @param {number} k - The number of results to return.
   * @returns {Promise<[Document<Metadata>, number][]>} An array of tuples containing the similar documents and their scores.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document<Metadata>, number][]>;
  /**
   * Deletes vectors from the store.
   * @param {Object} params - Delete parameters.
   * @param {string[] | number[]} [params.ids] - The ids of the vectors to delete.
   * @returns {Promise<void>}
   */
  delete(params: {
    ids?: string[] | number[];
    deleteAll?: boolean;
  }): Promise<void>;
  /**
   * Creates a new LibSQLVectorStore instance from texts.
   * @param {string[]} texts - The texts to add to the store.
   * @param {object[] | object} metadatas - The metadata for the texts.
   * @param {EmbeddingsInterface} embeddings - The embeddings interface to use.
   * @param {Client} dbClient - The LibSQL client instance.
   * @param {LibSQLVectorStoreArgs} [options] - Configuration options for the vector store.
   * @returns {Promise<LibSQLVectorStore>} A new LibSQLVectorStore instance.
   */
  static fromTexts<Metadata extends MetadataDefault = MetadataDefault>(texts: string[], metadatas: Metadata[] | Metadata, embeddings: EmbeddingsInterface, options: LibSQLVectorStoreArgs): Promise<LibSQLVectorStore<Metadata>>;
  /**
   * Creates a new LibSQLVectorStore instance from documents.
   * @param {Document[]} docs - The documents to add to the store.
   * @param {EmbeddingsInterface} embeddings - The embeddings interface to use.
   * @param {Client} dbClient - The LibSQL client instance.
   * @param {LibSQLVectorStoreArgs} [options] - Configuration options for the vector store.
   * @returns {Promise<LibSQLVectorStore>} A new LibSQLVectorStore instance.
   */
  static fromDocuments<Metadata extends MetadataDefault = MetadataDefault>(docs: Document<Metadata>[], embeddings: EmbeddingsInterface, options: LibSQLVectorStoreArgs): Promise<LibSQLVectorStore<Metadata>>;
}
//#endregion
export { LibSQLVectorStore, LibSQLVectorStoreArgs };
//# sourceMappingURL=libsql.d.cts.map