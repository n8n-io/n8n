import { EmbeddingModelV3 } from '../../embedding-model/v3/embedding-model-v3';
import { ImageModelV3 } from '../../image-model/v3/image-model-v3';
import { LanguageModelV3 } from '../../language-model/v3/language-model-v3';
import { RerankingModelV3 } from '../../reranking-model/v3/reranking-model-v3';
import { SpeechModelV3 } from '../../speech-model/v3/speech-model-v3';
import { TranscriptionModelV3 } from '../../transcription-model/v3/transcription-model-v3';

/**
 * Provider for language, text embedding, and image generation models.
 */
export interface ProviderV3 {
  readonly specificationVersion: 'v3';

  /**
   * Returns the language model with the given id.
   * The model id is then passed to the provider function to get the model.
   *
   * @param {string} modelId - The id of the model to return.
   *
   * @returns {LanguageModel} The language model associated with the id
   *
   * @throws {NoSuchModelError} If no such model exists.
   */
  languageModel(modelId: string): LanguageModelV3;

  /**
   * Returns the text embedding model with the given id.
   * The model id is then passed to the provider function to get the model.
   *
   * @param {string} modelId - The id of the model to return.
   *
   * @returns {LanguageModel} The language model associated with the id
   *
   * @throws {NoSuchModelError} If no such model exists.
   */
  embeddingModel(modelId: string): EmbeddingModelV3;

  /**
   * Returns the text embedding model with the given id.
   * The model id is then passed to the provider function to get the model.
   *
   * @param {string} modelId - The id of the model to return.
   *
   * @returns {EmbeddingModel} The embedding model associated with the id
   *
   * @throws {NoSuchModelError} If no such model exists.
   *
   * @deprecated Use `embeddingModel` instead.
   */
  textEmbeddingModel?(modelId: string): EmbeddingModelV3;

  /**
   * Returns the image model with the given id.
   * The model id is then passed to the provider function to get the model.
   *
   * @param {string} modelId - The id of the model to return.
   *
   * @returns {ImageModel} The image model associated with the id
   */
  imageModel(modelId: string): ImageModelV3;

  /**
   * Returns the transcription model with the given id.
   * The model id is then passed to the provider function to get the model.
   *
   * @param {string} modelId - The id of the model to return.
   *
   * @returns {TranscriptionModel} The transcription model associated with the id
   */
  transcriptionModel?(modelId: string): TranscriptionModelV3;

  /**
   * Returns the speech model with the given id.
   * The model id is then passed to the provider function to get the model.
   *
   * @param {string} modelId - The id of the model to return.
   *
   * @returns {SpeechModel} The speech model associated with the id
   */
  speechModel?(modelId: string): SpeechModelV3;

  /**
   * Returns the reranking model with the given id.
   * The model id is then passed to the provider function to get the model.
   *
   * @param {string} modelId - The id of the model to return.
   *
   * @returns {RerankingModel} The reranking model associated with the id
   *
   * @throws {NoSuchModelError} If no such model exists.
   */
  rerankingModel?(modelId: string): RerankingModelV3;
}
