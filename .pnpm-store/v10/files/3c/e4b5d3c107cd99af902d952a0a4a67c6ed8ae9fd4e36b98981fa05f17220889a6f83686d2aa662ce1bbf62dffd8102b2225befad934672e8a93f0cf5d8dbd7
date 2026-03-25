import { GoogleVertexAIBaseLLMInput, GoogleVertexAIBasePrediction } from "../../types/googlevertexai-types.js";
import { GoogleVertexAILLMResponse } from "../../utils/googlevertexai-connection.js";
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";
import { GoogleAuthOptions } from "google-auth-library";

//#region src/experimental/multimodal_embeddings/googlevertexai.d.ts

/**
 * Parameters for the GoogleVertexAIMultimodalEmbeddings class, extending
 * both EmbeddingsParams and GoogleVertexAIConnectionParams.
 */
interface GoogleVertexAIMultimodalEmbeddingsParams extends EmbeddingsParams, GoogleVertexAIBaseLLMInput<GoogleAuthOptions> {}
/**
 * An instance of media (text or image) that can be used for generating
 * embeddings.
 */
interface GoogleVertexAIMultimodalEmbeddingsInstance {
  text?: string;
  image?: {
    bytesBase64Encoded: string;
  };
}
/**
 * The results of generating embeddings, extending
 * GoogleVertexAIBasePrediction. It includes text and image embeddings.
 */
interface GoogleVertexAIMultimodalEmbeddingsResults extends GoogleVertexAIBasePrediction {
  textEmbedding?: number[];
  imageEmbedding?: number[];
}
/**
 * The media should have a text property, an image property, or both.
 */
type GoogleVertexAIMedia = {
  text: string;
  image?: Buffer;
} | {
  text?: string;
  image: Buffer;
};
type MediaEmbeddings = {
  text?: number[];
  image?: number[];
};
/**
 * Class for generating embeddings for text and images using Google's
 * Vertex AI. It extends the Embeddings base class and implements the
 * GoogleVertexAIMultimodalEmbeddingsParams interface.
 */
declare class GoogleVertexAIMultimodalEmbeddings extends Embeddings implements GoogleVertexAIMultimodalEmbeddingsParams {
  model: string;
  private connection;
  constructor(fields?: GoogleVertexAIMultimodalEmbeddingsParams);
  /**
   * Converts media (text or image) to an instance that can be used for
   * generating embeddings.
   * @param media The media (text or image) to be converted.
   * @returns An instance of media that can be used for generating embeddings.
   */
  mediaToInstance(media: GoogleVertexAIMedia): GoogleVertexAIMultimodalEmbeddingsInstance;
  /**
   * Converts the response from Google Vertex AI to embeddings.
   * @param response The response from Google Vertex AI.
   * @returns An array of media embeddings.
   */
  responseToEmbeddings(response: GoogleVertexAILLMResponse<GoogleVertexAIMultimodalEmbeddingsResults>): MediaEmbeddings[];
  /**
   * Generates embeddings for multiple media instances.
   * @param media An array of media instances.
   * @returns A promise that resolves to an array of media embeddings.
   */
  embedMedia(media: GoogleVertexAIMedia[]): Promise<MediaEmbeddings[]>;
  /**
   * Generates embeddings for a single media instance.
   * @param media A single media instance.
   * @returns A promise that resolves to a media embedding.
   */
  embedMediaQuery(media: GoogleVertexAIMedia): Promise<MediaEmbeddings>;
  /**
   * Generates embeddings for multiple images.
   * @param images An array of images.
   * @returns A promise that resolves to an array of image embeddings.
   */
  embedImage(images: Buffer[]): Promise<number[][]>;
  /**
   * Generates embeddings for a single image.
   * @param image A single image.
   * @returns A promise that resolves to an image embedding.
   */
  embedImageQuery(image: Buffer): Promise<number[]>;
  /**
   * Generates embeddings for multiple text documents.
   * @param documents An array of text documents.
   * @returns A promise that resolves to an array of text document embeddings.
   */
  embedDocuments(documents: string[]): Promise<number[][]>;
  /**
   * Generates embeddings for a single text document.
   * @param document A single text document.
   * @returns A promise that resolves to a text document embedding.
   */
  embedQuery(document: string): Promise<number[]>;
}
//#endregion
export { GoogleVertexAIMedia, GoogleVertexAIMultimodalEmbeddings, GoogleVertexAIMultimodalEmbeddingsParams, MediaEmbeddings };
//# sourceMappingURL=googlevertexai.d.ts.map