import {
  SharedV3Headers,
  SharedV3ProviderMetadata,
  SharedV3Warning,
} from '../../shared';
import { EmbeddingModelV3Embedding } from './embedding-model-v3-embedding';

/**
 * The result of a embedding model doEmbed call.
 */
export type EmbeddingModelV3Result = {
  /**
   * Generated embeddings. They are in the same order as the input values.
   */
  embeddings: Array<EmbeddingModelV3Embedding>;

  /**
   * Token usage. We only have input tokens for embeddings.
   */
  usage?: { tokens: number };

  /**
   * Additional provider-specific metadata. They are passed through
   * from the provider to the AI SDK and enable provider-specific
   * results that can be fully encapsulated in the provider.
   */
  providerMetadata?: SharedV3ProviderMetadata;

  /**
   * Optional response information for debugging purposes.
   */
  response?: {
    /**
     * Response headers.
     */
    headers?: SharedV3Headers;

    /**
     * The response body.
     */
    body?: unknown;
  };

  /**
   * Warnings for the call, e.g. unsupported settings.
   */
  warnings: Array<SharedV3Warning>;
};
