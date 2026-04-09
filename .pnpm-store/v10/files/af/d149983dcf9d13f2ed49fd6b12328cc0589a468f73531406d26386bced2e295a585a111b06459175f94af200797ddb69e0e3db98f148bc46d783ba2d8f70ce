import { SharedV3Headers, SharedV3ProviderOptions } from '../../shared';

export type EmbeddingModelV3CallOptions = {
  /**
   * List of text values to generate embeddings for.
   */
  values: Array<string>;

  /**
   * Abort signal for cancelling the operation.
   */
  abortSignal?: AbortSignal;

  /**
   * Additional provider-specific options. They are passed through
   * to the provider from the AI SDK and enable provider-specific
   * functionality that can be fully encapsulated in the provider.
   */
  providerOptions?: SharedV3ProviderOptions;

  /**
   * Additional HTTP headers to be sent with the request.
   * Only applicable for HTTP-based providers.
   */
  headers?: SharedV3Headers;
};
