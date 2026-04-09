import { Embedding } from '../types';
import { EmbeddingModelUsage } from '../types/usage';
import { ProviderMetadata } from '../types';
import { Warning } from '../types/warning';

/**
 * The result of an `embed` call.
 * It contains the embedding, the value, and additional information.
 */
export interface EmbedResult {
  /**
   * The value that was embedded.
   */
  readonly value: string;

  /**
   * The embedding of the value.
   */
  readonly embedding: Embedding;

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
   * Optional response data.
   */
  readonly response?: {
    /**
     * Response headers.
     */
    headers?: Record<string, string>;

    /**
     * The response body.
     */
    body?: unknown;
  };
}
