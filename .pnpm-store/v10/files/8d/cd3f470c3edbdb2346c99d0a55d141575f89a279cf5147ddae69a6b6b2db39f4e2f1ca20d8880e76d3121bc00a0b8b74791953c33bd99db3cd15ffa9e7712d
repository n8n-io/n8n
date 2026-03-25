import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";
import { DocumentByInfo, FieldPaths, FilterExpression, FunctionReference, GenericActionCtx, GenericDataModel, GenericTableInfo, NamedTableInfo, NamedVectorIndex, TableNamesInDataModel, VectorFilterBuilder, VectorIndexNames } from "convex/server";

//#region src/vectorstores/convex.d.ts

/**
 * Type that defines the config required to initialize the
 * ConvexVectorStore class. It includes the table name,
 * index name, text field name, and embedding field name.
 */
type ConvexVectorStoreConfig<DataModel extends GenericDataModel, TableName extends TableNamesInDataModel<DataModel>, IndexName extends VectorIndexNames<NamedTableInfo<DataModel, TableName>>, TextFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, EmbeddingFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, MetadataFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, InsertMutation extends FunctionReference<"mutation", "internal", {
  table: string;
  document: object;
}>, GetQuery extends FunctionReference<"query", "internal", {
  id: string;
}, object | null>> = {
  readonly ctx: GenericActionCtx<DataModel>;
  /**
   * Defaults to "documents"
   */
  readonly table?: TableName;
  /**
   * Defaults to "byEmbedding"
   */
  readonly index?: IndexName;
  /**
   * Defaults to "text"
   */
  readonly textField?: TextFieldName;
  /**
   * Defaults to "embedding"
   */
  readonly embeddingField?: EmbeddingFieldName;
  /**
   * Defaults to "metadata"
   */
  readonly metadataField?: MetadataFieldName;
  /**
   * Defaults to `internal.langchain.db.insert`
   */
  readonly insert?: InsertMutation;
  /**
   * Defaults to `internal.langchain.db.get`
   */
  readonly get?: GetQuery;
};
/**
 * Class that is a wrapper around Convex storage and vector search. It is used
 * to insert embeddings in Convex documents with a vector search index,
 * and perform a vector search on them.
 *
 * ConvexVectorStore does NOT implement maxMarginalRelevanceSearch.
 */
declare class ConvexVectorStore<DataModel extends GenericDataModel, TableName extends TableNamesInDataModel<DataModel>, IndexName extends VectorIndexNames<NamedTableInfo<DataModel, TableName>>, TextFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, EmbeddingFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, MetadataFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, InsertMutation extends FunctionReference<"mutation", "internal", {
  table: string;
  document: object;
}>, GetQuery extends FunctionReference<"query", "internal", {
  id: string;
}, object | null>> extends VectorStore {
  /**
   * Type that defines the filter used in the
   * similaritySearchVectorWithScore and maxMarginalRelevanceSearch methods.
   * It includes limit, filter and a flag to include embeddings.
   */
  FilterType: {
    filter?: (q: VectorFilterBuilder<DocumentByInfo<GenericTableInfo>, NamedVectorIndex<NamedTableInfo<DataModel, TableName>, IndexName>>) => FilterExpression<boolean>;
    includeEmbeddings?: boolean;
  };
  private readonly ctx;
  private readonly table;
  private readonly index;
  private readonly textField;
  private readonly embeddingField;
  private readonly metadataField;
  private readonly insert;
  private readonly get;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, config: ConvexVectorStoreConfig<DataModel, TableName, IndexName, TextFieldName, EmbeddingFieldName, MetadataFieldName, InsertMutation, GetQuery>);
  /**
   * Add vectors and their corresponding documents to the Convex table.
   * @param vectors Vectors to be added.
   * @param documents Corresponding documents to be added.
   * @returns Promise that resolves when the vectors and documents have been added.
   */
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  /**
   * Add documents to the Convex table. It first converts
   * the documents to vectors using the embeddings and then calls the
   * addVectors method.
   * @param documents Documents to be added.
   * @returns Promise that resolves when the documents have been added.
   */
  addDocuments(documents: Document[]): Promise<void>;
  /**
   * Similarity search on the vectors stored in the
   * Convex table. It returns a list of documents and their
   * corresponding similarity scores.
   * @param query Query vector for the similarity search.
   * @param k Number of nearest neighbors to return.
   * @param filter Optional filter to be applied.
   * @returns Promise that resolves to a list of documents and their corresponding similarity scores.
   */
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
  /**
   * Static method to create an instance of ConvexVectorStore from a
   * list of texts. It first converts the texts to vectors and then adds
   * them to the Convex table.
   * @param texts List of texts to be converted to vectors.
   * @param metadatas Metadata for the texts.
   * @param embeddings Embeddings to be used for conversion.
   * @param dbConfig Database configuration for Convex.
   * @returns Promise that resolves to a new instance of ConvexVectorStore.
   */
  static fromTexts<DataModel extends GenericDataModel, TableName extends TableNamesInDataModel<DataModel>, IndexName extends VectorIndexNames<NamedTableInfo<DataModel, TableName>>, TextFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, EmbeddingFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, MetadataFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, InsertMutation extends FunctionReference<"mutation", "internal", {
    table: string;
    document: object;
  }>, GetQuery extends FunctionReference<"query", "internal", {
    id: string;
  }, object | null>>(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: ConvexVectorStoreConfig<DataModel, TableName, IndexName, TextFieldName, EmbeddingFieldName, MetadataFieldName, InsertMutation, GetQuery>): Promise<ConvexVectorStore<DataModel, TableName, IndexName, TextFieldName, EmbeddingFieldName, MetadataFieldName, InsertMutation, GetQuery>>;
  /**
   * Static method to create an instance of ConvexVectorStore from a
   * list of documents. It first converts the documents to vectors and then
   * adds them to the Convex table.
   * @param docs List of documents to be converted to vectors.
   * @param embeddings Embeddings to be used for conversion.
   * @param dbConfig Database configuration for Convex.
   * @returns Promise that resolves to a new instance of ConvexVectorStore.
   */
  static fromDocuments<DataModel extends GenericDataModel, TableName extends TableNamesInDataModel<DataModel>, IndexName extends VectorIndexNames<NamedTableInfo<DataModel, TableName>>, TextFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, EmbeddingFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, MetadataFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, InsertMutation extends FunctionReference<"mutation", "internal", {
    table: string;
    document: object;
  }>, GetQuery extends FunctionReference<"query", "internal", {
    id: string;
  }, object | null>>(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: ConvexVectorStoreConfig<DataModel, TableName, IndexName, TextFieldName, EmbeddingFieldName, MetadataFieldName, InsertMutation, GetQuery>): Promise<ConvexVectorStore<DataModel, TableName, IndexName, TextFieldName, EmbeddingFieldName, MetadataFieldName, InsertMutation, GetQuery>>;
}
//#endregion
export { ConvexVectorStore, ConvexVectorStoreConfig };
//# sourceMappingURL=convex.d.ts.map