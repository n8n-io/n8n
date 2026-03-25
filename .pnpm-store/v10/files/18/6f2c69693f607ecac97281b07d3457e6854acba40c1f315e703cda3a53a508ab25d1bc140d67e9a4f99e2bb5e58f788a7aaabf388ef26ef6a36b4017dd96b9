import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings/jina.d.ts
interface JinaEmbeddingsParams extends EmbeddingsParams {
  /** Model name to use */
  model: "jina-clip-v2" | "jina-embeddings-v3" | "jina-colbert-v2" | "jina-clip-v1" | "jina-colbert-v1-en" | "jina-embeddings-v2-base-es" | "jina-embeddings-v2-base-code" | "jina-embeddings-v2-base-de" | "jina-embeddings-v2-base-zh" | "jina-embeddings-v2-base-en" | string;
  baseUrl?: string;
  /**
   * Timeout to use when making requests to Jina.
   */
  timeout?: number;
  /**
   * The maximum number of documents to embed in a single request.
   */
  batchSize?: number;
  /**
   * Whether to strip new lines from the input text.
   */
  stripNewLines?: boolean;
  /**
   * The dimensions of the embedding.
   */
  dimensions?: number;
  /**
   * Scales the embedding so its Euclidean (L2) norm becomes 1, preserving direction. Useful when downstream involves dot-product, classification, visualization..
   */
  normalized?: boolean;
}
type JinaMultiModelInput = {
  text: string;
  image?: never;
} | {
  image: string;
  text?: never;
};
type JinaEmbeddingsInput = string | JinaMultiModelInput;
declare class JinaEmbeddings extends Embeddings implements JinaEmbeddingsParams {
  model: JinaEmbeddingsParams["model"];
  batchSize: number;
  baseUrl: string;
  stripNewLines: boolean;
  dimensions: number;
  apiKey: string;
  normalized: boolean;
  constructor(fields?: Partial<JinaEmbeddingsParams> & {
    apiKey?: string;
  });
  private doStripNewLines;
  embedDocuments(input: JinaEmbeddingsInput[]): Promise<number[][]>;
  embedQuery(input: JinaEmbeddingsInput): Promise<number[]>;
  private getParams;
  private embeddingWithRetry;
}
//#endregion
export { JinaEmbeddings, JinaEmbeddingsInput, JinaEmbeddingsParams };
//# sourceMappingURL=jina.d.ts.map