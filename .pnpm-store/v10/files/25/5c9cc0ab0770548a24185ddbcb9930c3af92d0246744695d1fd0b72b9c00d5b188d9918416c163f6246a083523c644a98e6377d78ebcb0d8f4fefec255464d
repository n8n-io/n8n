import { AIStudioEmbeddingsResponse, BaseGoogleEmbeddingsParams, GoogleConnectionParams, GoogleEmbeddingsResponse, VertexEmbeddingsParameters, VertexEmbeddingsResponse } from "./types.cjs";
import { GoogleAbstractedClient } from "./auth.cjs";
import { Embeddings } from "@langchain/core/embeddings";

//#region src/embeddings.d.ts
/**
 * Enables calls to Google APIs for generating
 * text embeddings.
 */
declare abstract class BaseGoogleEmbeddings<AuthOptions> extends Embeddings implements BaseGoogleEmbeddingsParams<AuthOptions> {
  model: string;
  dimensions?: number;
  private connection;
  constructor(fields: BaseGoogleEmbeddingsParams<AuthOptions>);
  abstract buildAbstractedClient(fields?: GoogleConnectionParams<AuthOptions>): GoogleAbstractedClient;
  buildApiKeyClient(apiKey: string): GoogleAbstractedClient;
  buildApiKey(fields?: GoogleConnectionParams<AuthOptions>): string | undefined;
  buildClient(fields?: GoogleConnectionParams<AuthOptions>): GoogleAbstractedClient;
  buildParameters(): VertexEmbeddingsParameters;
  vertexResponseToValues(response: VertexEmbeddingsResponse): number[][];
  aiStudioResponseToValues(response: AIStudioEmbeddingsResponse): number[][];
  responseToValues(response: GoogleEmbeddingsResponse): number[][];
  /**
   * Takes an array of documents as input and returns a promise that
   * resolves to a 2D array of embeddings for each document. It splits the
   * documents into chunks and makes requests to the Google Vertex AI API to
   * generate embeddings.
   * @param documents An array of documents to be embedded.
   * @returns A promise that resolves to a 2D array of embeddings for each document.
   */
  embedDocuments(documents: string[]): Promise<number[][]>;
  /**
   * Takes a document as input and returns a promise that resolves to an
   * embedding for the document. It calls the embedDocuments method with the
   * document as the input.
   * @param document A document to be embedded.
   * @returns A promise that resolves to an embedding for the document.
   */
  embedQuery(document: string): Promise<number[]>;
}
//#endregion
export { BaseGoogleEmbeddings };
//# sourceMappingURL=embeddings.d.cts.map