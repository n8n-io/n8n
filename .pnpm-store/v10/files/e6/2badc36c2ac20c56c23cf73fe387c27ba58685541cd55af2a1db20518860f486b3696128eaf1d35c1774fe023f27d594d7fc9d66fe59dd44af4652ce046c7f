import type { LanguageModelV3 } from '@ai-sdk/provider';

export interface GatewayLanguageModelEntry {
  /**
   * The model id used by the remote provider in model settings and for specifying the
   * intended model for text generation.
   */
  id: string;

  /**
   * The display name of the model for presentation in user-facing contexts.
   */
  name: string;

  /**
   * Optional description of the model.
   */
  description?: string | null;

  /**
   * Optional pricing information for the model.
   */
  pricing?: {
    /**
     * Cost per input token in USD.
     */
    input: string;
    /**
     * Cost per output token in USD.
     */
    output: string;
    /**
     * Cost per cached input token in USD.
     * Only present for providers/models that support prompt caching.
     */
    cachedInputTokens?: string;
    /**
     * Cost per input token to create/write cache entries in USD.
     * Only present for providers/models that support prompt caching.
     */
    cacheCreationInputTokens?: string;
  } | null;

  /**
   * Additional AI SDK language model specifications for the model.
   */
  specification: GatewayLanguageModelSpecification;

  /**
   * Optional field to differentiate between model types.
   */
  modelType?: 'language' | 'embedding' | 'image' | 'video' | null;
}

export type GatewayLanguageModelSpecification = Pick<
  LanguageModelV3,
  'specificationVersion' | 'provider' | 'modelId'
>;
