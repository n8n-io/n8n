import { Embedding } from '../types';
import { EmbeddingModelUsage } from '../types/usage';
import { ProviderMetadata } from '../types';
import { Warning } from '../types/warning';

/**
 * The result of an `embedMany` call.
 * It contains the embeddings, the values, and additional information.
 */
export interface EmbedManyResult {
  /**
   * The values that were embedded.
   */
  readonly values: Array<string>;

  /**
   * The embeddings. They are in the same order as the values.
   */
  readonly embeddings: Array<Embedding>;

  /**
   * The embedding token usage.
   */
  readonly usage: EmbeddingModelUsage;

  /**
   * Warnings for the call, e.g. unsupported settings.
   */
  readonly warnings: Array<Warning>;

  /**
   * Optional provider-specific metadata.
   */
  readonly providerMetadata?: ProviderMetadata;

  /**
   * Optional raw response data.
   */
  readonly responses?: Array<
    | {
        /**
         * Response headers.
         */
        headers?: Record<string, string>;

        /**
         * The response body.
         */
        body?: unknown;
      }
    | undefined
  >;
}
