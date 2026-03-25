import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { Metadata } from "@opensearch-project/opensearch/api/types.js";
import { DataSource, DataSourceOptions, EntitySchema } from "typeorm";

//#region src/vectorstores/typeorm.d.ts

/**
 * Interface that defines the arguments required to create a
 * `TypeORMVectorStore` instance. It includes Postgres connection options,
 * table name, filter, and verbosity level.
 */
interface TypeORMVectorStoreArgs {
  postgresConnectionOptions: DataSourceOptions;
  tableName?: string;
  schemaName?: string;
  filter?: Metadata;
  verbose?: boolean;
}
/**
 * Class that extends the `Document` base class and adds an `embedding`
 * property. It represents a document in the vector store.
 */
declare class TypeORMVectorStoreDocument extends Document {
  embedding: string;
}
/**
 * Class that provides an interface to a Postgres vector database. It
 * extends the `VectorStore` base class and implements methods for adding
 * documents and vectors, performing similarity searches, and ensuring the
 * existence of a table in the database.
 */
declare class TypeORMVectorStore extends VectorStore {
  FilterType: Metadata;
  tableName: string;
  schemaName?: string;
  documentEntity: EntitySchema;
  filter?: Metadata;
  appDataSource: DataSource;
  _verbose?: boolean;
  _vectorstoreType(): string;
  private constructor();
  /**
   * Static method to create a new `TypeORMVectorStore` instance from a
   * `DataSource`. It initializes the `DataSource` if it is not already
   * initialized.
   * @param embeddings Embeddings instance.
   * @param fields `TypeORMVectorStoreArgs` instance.
   * @returns A new instance of `TypeORMVectorStore`.
   */
  static fromDataSource(embeddings: EmbeddingsInterface, fields: TypeORMVectorStoreArgs): Promise<TypeORMVectorStore>;
  /**
   * Method to add documents to the vector store. It ensures the existence
   * of the table in the database, converts the documents into vectors, and
   * adds them to the store.
   * @param documents Array of `Document` instances.
   * @returns Promise that resolves when the documents have been added.
   */
  addDocuments(documents: Document[]): Promise<void>;
  /**
   * Method to add vectors to the vector store. It converts the vectors into
   * rows and inserts them into the database.
   * @param vectors Array of vectors.
   * @param documents Array of `Document` instances.
   * @returns Promise that resolves when the vectors have been added.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  /**
   * Method to perform a similarity search in the vector store. It returns
   * the `k` most similar documents to the query vector, along with their
   * similarity scores.
   * @param query Query vector.
   * @param k Number of most similar documents to return.
   * @param filter Optional filter to apply to the search.
   * @returns Promise that resolves with an array of tuples, each containing a `TypeORMVectorStoreDocument` and its similarity score.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[TypeORMVectorStoreDocument, number][]>;
  /**
   * Method to ensure the existence of the table in the database. It creates
   * the table if it does not already exist.
   * @returns Promise that resolves when the table has been ensured.
   */
  ensureTableInDatabase(): Promise<void>;
  private getTablePath;
  /**
   * Static method to create a new `TypeORMVectorStore` instance from an
   * array of texts and their metadata. It converts the texts into
   * `Document` instances and adds them to the store.
   * @param texts Array of texts.
   * @param metadatas Array of metadata objects or a single metadata object.
   * @param embeddings Embeddings instance.
   * @param dbConfig `TypeORMVectorStoreArgs` instance.
   * @returns Promise that resolves with a new instance of `TypeORMVectorStore`.
   */
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: TypeORMVectorStoreArgs): Promise<TypeORMVectorStore>;
  /**
   * Static method to create a new `TypeORMVectorStore` instance from an
   * array of `Document` instances. It adds the documents to the store.
   * @param docs Array of `Document` instances.
   * @param embeddings Embeddings instance.
   * @param dbConfig `TypeORMVectorStoreArgs` instance.
   * @returns Promise that resolves with a new instance of `TypeORMVectorStore`.
   */
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: TypeORMVectorStoreArgs): Promise<TypeORMVectorStore>;
  /**
   * Static method to create a new `TypeORMVectorStore` instance from an
   * existing index.
   * @param embeddings Embeddings instance.
   * @param dbConfig `TypeORMVectorStoreArgs` instance.
   * @returns Promise that resolves with a new instance of `TypeORMVectorStore`.
   */
  static fromExistingIndex(embeddings: EmbeddingsInterface, dbConfig: TypeORMVectorStoreArgs): Promise<TypeORMVectorStore>;
}
//#endregion
export { TypeORMVectorStore, TypeORMVectorStoreArgs, TypeORMVectorStoreDocument };
//# sourceMappingURL=typeorm.d.cts.map