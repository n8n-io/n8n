import { SharedV3ProviderOptions } from '../../shared';
import { ImageModelV3File } from './image-model-v3-file';

export type ImageModelV3CallOptions = {
  /**
   * Prompt for the image generation. Some operations, like upscaling, may not require a prompt.
   */
  prompt: string | undefined;

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
   * Array of images for image editing or variation generation.
   * The images should be provided as base64 encoded strings or binary data.
   */
  files: ImageModelV3File[] | undefined;

  /**
   * Mask image for inpainting operations.
   * The mask should be provided as base64 encoded strings or binary data.
   */
  mask: ImageModelV3File | undefined;

  /**
   * Additional provider-specific options that are passed through to the provider
   * as body parameters.
   *
   * The outer record is keyed by the provider name, and the inner
   * record is keyed by the provider-specific metadata key.
   *
   * ```ts
   * {
   *   "openai": {
   *     "style": "vivid"
   *   }
   * }
   * ```
   */
  providerOptions: SharedV3ProviderOptions;

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
