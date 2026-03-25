import { AsyncCaller, AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { DocumentInterface } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/turbopuffer.d.ts

/**
 * @deprecated Use `TurbopufferDistanceMetric` from `@langchain/turbopuffer` instead.
 */
type TurbopufferDistanceMetric = "cosine_distance" | "euclidean_squared";
/**
 * @deprecated Use `TurbopufferFilter` from `@langchain/turbopuffer` instead.
 */
type TurbopufferFilterType = Record<string, Array<[string, string[] | string]>>;
/**
 * @deprecated Use `TurbopufferParams` from `@langchain/turbopuffer` instead.
 */
interface TurbopufferParams extends AsyncCallerParams {
  apiKey?: string;
  namespace?: string;
  distanceMetric?: TurbopufferDistanceMetric;
  apiUrl?: string;
  batchSize?: number;
}
/**
 * @deprecated Use `@langchain/turbopuffer` instead.
 */
interface TurbopufferQueryResult {
  dist: number;
  id: number;
  vector?: number[];
  attributes: Record<string, string>;
}
/**
 * @deprecated Use `TurbopufferVectorStore` from `@langchain/turbopuffer` instead.
 * The new package uses the official SDK and supports document deletion, region
 * configuration, and returns document IDs in search results.
 */
declare class TurbopufferVectorStore extends VectorStore {
  FilterType: TurbopufferFilterType;
  get lc_secrets(): {
    [key: string]: string;
  };
  get lc_aliases(): {
    [key: string]: string;
  };
  static lc_name(): string;
  protected distanceMetric: TurbopufferDistanceMetric;
  protected apiKey: string;
  protected namespace: string;
  protected apiUrl: string;
  caller: AsyncCaller;
  batchSize: number;
  _vectorstoreType(): string;
  constructor(embeddings: EmbeddingsInterface, args: TurbopufferParams);
  defaultHeaders(): {
    Authorization: string;
    "Content-Type": string;
  };
  callWithRetry(fetchUrl: string, stringifiedBody: string | undefined, method?: string): Promise<any>;
  addVectors(vectors: number[][], documents: DocumentInterface[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  delete(params: {
    deleteIndex?: boolean;
  }): Promise<void>;
  addDocuments(documents: DocumentInterface[], options?: {
    ids?: string[];
  }): Promise<string[]>;
  protected queryVectors(query: number[], k: number, includeVector?: boolean, filter?: this["FilterType"]): Promise<TurbopufferQueryResult[]>;
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[DocumentInterface, number][]>;
  static fromDocuments(docs: DocumentInterface[], embeddings: EmbeddingsInterface, dbConfig: TurbopufferParams): Promise<TurbopufferVectorStore>;
}
//#endregion
export { TurbopufferDistanceMetric, TurbopufferFilterType, TurbopufferParams, TurbopufferQueryResult, TurbopufferVectorStore };
//# sourceMappingURL=turbopuffer.d.ts.map