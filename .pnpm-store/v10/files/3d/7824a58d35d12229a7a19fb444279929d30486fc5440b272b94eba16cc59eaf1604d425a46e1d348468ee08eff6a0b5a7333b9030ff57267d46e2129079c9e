import type { SharedV3ProviderMetadata } from '@ai-sdk/provider';

/**
 * Response metadata for a video model call.
 */
export type VideoModelResponseMetadata = {
  /**
   * Timestamp for the start of the generated response.
   */
  timestamp: Date;

  /**
   * The ID of the response model that was used to generate the response.
   */
  modelId: string;

  /**
   * Response headers.
   */
  headers?: Record<string, string>;

  /**
   * Provider-specific metadata for this call.
   * When multiple calls are made (n > maxVideosPerCall), each response
   * contains its own providerMetadata, allowing lossless per-call access.
   */
  providerMetadata?: SharedV3ProviderMetadata;
};
