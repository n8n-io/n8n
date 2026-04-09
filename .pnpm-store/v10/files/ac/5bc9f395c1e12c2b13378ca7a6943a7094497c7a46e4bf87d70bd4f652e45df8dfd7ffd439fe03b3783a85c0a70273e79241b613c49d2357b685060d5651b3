import { SharedV2ProviderOptions } from '../../shared';

export type ImageModelV2CallOptions = {
  /**
   * Prompt for the image generation.
   */
  prompt: string;

  /**
   * Number of images to generate.
   */
  n: number;

  /**
   * Size of the images to generate.
   * Must have the format `{width}x{height}`.
   * `undefined` will use the provider's default size.
   */
  size: `${number}x${number}` | undefined;

  /**
   * Aspect ratio of the images to generate.
   * Must have the format `{width}:{height}`.
   * `undefined` will use the provider's default aspect ratio.
   */
  aspectRatio: `${number}:${number}` | undefined;

  /**
   * Seed for the image generation.
   * `undefined` will use the provider's default seed.
   */
  seed: number | undefined;

  /**
   * Additional provider-specific options that are passed through to the provider
   * as body parameters.
   *
   * The outer record is keyed by the provider name, and the inner
   * record is keyed by the provider-specific metadata key.
   * ```ts
   * {
   * "openai": {
   * "style": "vivid"
   * }
   * }
   * ```
   */
  providerOptions: SharedV2ProviderOptions;

  /**
   * Abort signal for cancelling the operation.
   */
  abortSignal?: AbortSignal;

  /**
   * Additional HTTP headers to be sent with the request.
   * Only applicable for HTTP-based providers.
   */
  headers?: Record<string, string | undefined>;
};
