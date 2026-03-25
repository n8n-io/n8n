import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";
import { load } from "@tensorflow-models/universal-sentence-encoder";

//#region src/embeddings/tensorflow.d.ts

/**
 * Interface that extends EmbeddingsParams and defines additional
 * parameters specific to the TensorFlowEmbeddings class.
 */
interface TensorFlowEmbeddingsParams extends EmbeddingsParams {}
/**
 * Class that extends the Embeddings class and provides methods for
 * generating embeddings using the Universal Sentence Encoder model from
 * TensorFlow.js.
 * @example
 * ```typescript
 * const embeddings = new TensorFlowEmbeddings();
 * const store = new MemoryVectorStore(embeddings);
 *
 * const documents = [
 *   "A document",
 *   "Some other piece of text",
 *   "One more",
 *   "And another",
 * ];
 *
 * await store.addDocuments(
 *   documents.map((pageContent) => new Document({ pageContent }))
 * );
 * ```
 */
declare class TensorFlowEmbeddings extends Embeddings {
  constructor(fields?: TensorFlowEmbeddingsParams);
  _cached: ReturnType<typeof load>;
  private load;
  private _embed;
  /**
   * Method that takes a document as input and returns a promise that
   * resolves to an embedding for the document. It calls the _embed method
   * with the document as the input and processes the result to return a
   * single embedding.
   * @param document Document to generate an embedding for.
   * @returns Promise that resolves to an embedding for the input document.
   */
  embedQuery(document: string): Promise<number[]>;
  /**
   * Method that takes an array of documents as input and returns a promise
   * that resolves to a 2D array of embeddings for each document. It calls
   * the _embed method with the documents as the input and processes the
   * result to return the embeddings.
   * @param documents Array of documents to generate embeddings for.
   * @returns Promise that resolves to a 2D array of embeddings for each input document.
   */
  embedDocuments(documents: string[]): Promise<number[][]>;
}
//#endregion
export { TensorFlowEmbeddings, TensorFlowEmbeddingsParams };
//# sourceMappingURL=tensorflow.d.cts.map