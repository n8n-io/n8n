import { SharedV3ProviderOptions } from '../../shared';
import { VideoModelV3File } from './video-model-v3-file';

export type VideoModelV3CallOptions = {
  /**
   * Text prompt for the video generation.
   */
  prompt: string | undefined;

  /**
   * Number of videos to generate. Default: 1.
   * Most video models only support n=1 due to computational cost.
   */
  n: number;

  /**
   * Aspect ratio of the videos to generate.
   * Must have the format `{width}:{height}`.
   * `undefined` will use the provider's default aspect ratio.
   * Common values: '16:9', '9:16', '1:1', '21:9', '4:3'
   */
  aspectRatio: `${number}:${number}` | undefined;

  /**
   * Resolution of the video to generate.
   * Format: `{width}x{height}` (e.g., '1280x720', '1920x1080')
   * `undefined` will use the provider's default resolution.
   */
  resolution: `${number}x${number}` | undefined;

  /**
   * Duration of the video in seconds.
   * `undefined` will use the provider's default duration.
   * Typically 3-10 seconds for most models.
   */
  duration: number | undefined;

  /**
   * Frames per second (FPS) for the video.
   * `undefined` will use the provider's default FPS.
   * Common values: 24, 30, 60
   */
  fps: number | undefined;

  /**
   * Seed for deterministic video generation.
   * `undefined` will use a random seed.
   */
  seed: number | undefined;

  /**
   * Input image for image-to-video generation.
   * The image serves as the starting frame that the model will animate.
   */
  image: VideoModelV3File | undefined;

  /**
   * Additional provider-specific options that are passed through to the provider
   * as body parameters.
   *
   * Example:
   * {
   *   "fal": {
   *     "loop": true,
   *     "motionStrength": 0.8
   *   }
   * }
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
