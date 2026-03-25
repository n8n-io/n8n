import { Pinecone, PineconeConfiguration } from "@pinecone-database/pinecone";
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings.d.ts

/* PineconeEmbeddingsParams holds the optional fields a user can pass to a Pinecone embedding model.
 * @param model - Model to use to generate embeddings. Default is "multilingual-e5-large".
 * @param params - Additional parameters to pass to the embedding model. Note: parameters are model-specific. Read
 *  more about model-specific parameters in the [Pinecone
 *  documentation](https://docs.pinecone.io/guides/inference/understanding-inference#model-specific-parameters).
 * */
interface PineconeEmbeddingsParams extends EmbeddingsParams {
  model?: string; // Model to use to generate embeddings
  params?: Record<string, string>; // Additional parameters to pass to the embedding model
}
/* PineconeEmbeddings generates embeddings using the Pinecone Inference API. */
declare class PineconeEmbeddings extends Embeddings implements PineconeEmbeddingsParams {
  client: Pinecone;
  model: string;
  params: Record<string, string>;
  constructor(fields?: Partial<PineconeEmbeddingsParams> & Partial<PineconeConfiguration>);
  /* Generate embeddings for a list of input strings using a specified embedding model.
   *
   * @param texts - List of input strings for which to generate embeddings.
   * */
  embedDocuments(texts: string[]): Promise<number[][]>;
  /* Generate embeddings for a given query string using a specified embedding model.
   * @param text - Query string for which to generate embeddings.
   * */
  embedQuery(text: string): Promise<number[]>;
}
//#endregion
export { PineconeEmbeddings, PineconeEmbeddingsParams };
//# sourceMappingURL=embeddings.d.ts.map