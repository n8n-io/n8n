import type { VideoModelV3CallOptions } from './video-model-v3-call-options';
import type { SharedV3ProviderMetadata } from '../../shared/v3/shared-v3-provider-metadata';
import type { SharedV3Warning } from '../../shared/v3/shared-v3-warning';

type GetMaxVideosPerCallFunction = (options: {
  modelId: string;
}) => PromiseLike<number | undefined> | number | undefined;

/**
 * Generated video data. Can be a URL, base64-encoded string, or binary data.
 */
export type VideoModelV3VideoData =
  | {
      /**
       * Video available as a URL (most common for video providers).
       */
      type: 'url';
      url: string;
      mediaType: string;
    }
  | {
      /**
       * Video as base64-encoded string.
       */
      type: 'base64';
      data: string;
      mediaType: string;
    }
  | {
      /**
       * Video as binary data.
       */
      type: 'binary';
      data: Uint8Array;
      mediaType: string;
    };

/**
 * Video generation model specification version 3.
 */
export type VideoModelV3 = {
  /**
   * The video model must specify which video model interface
   * version it implements. This will allow us to evolve the video
   * model interface and retain backwards compatibility. The different
   * implementation versions can be handled as a discriminated union
   * on our side.
   */
  readonly specificationVersion: 'v3';

  /**
   * Name of the provider for logging purposes.
   */
  readonly provider: string;

  /**
   * Provider-specific model ID for logging purposes.
   */
  readonly modelId: string;

  /**
   * Limit of how many videos can be generated in a single API call.
   * Can be set to a number for a fixed limit, to undefined to use
   * the global limit, or a function that returns a number or undefined,
   * optionally as a promise.
   *
   * Most video models only support generating 1 video at a time due to
   * computational cost. Default is typically 1.
   */
  readonly maxVideosPerCall: number | undefined | GetMaxVideosPerCallFunction;

  /**
   * Generates an array of videos.
   */
  doGenerate(options: VideoModelV3CallOptions): PromiseLike<{
    /**
     * Generated videos as URLs, base64 strings, or binary data.
     *
     * Most providers return URLs to video files (MP4, WebM) due to large file sizes.
     * Use the discriminated union to indicate the type of video data being returned.
     */
    videos: Array<VideoModelV3VideoData>;

    /**
     * Warnings for the call, e.g. unsupported features.
     */
    warnings: Array<SharedV3Warning>;

    /**
     * Additional provider-specific metadata. They are passed through
     * from the provider to the AI SDK and enable provider-specific
     * results that can be fully encapsulated in the provider.
     *
     * The outer record is keyed by the provider name, and the inner
     * record is provider-specific metadata.
     *
     * ```ts
     * {
     *   "fal": {
     *     "videos": [{
     *       "duration": 5.0,
     *       "fps": 24,
     *       "width": 1280,
     *       "height": 720
     *     }]
     *   }
     * }
     * ```
     */
    providerMetadata?: SharedV3ProviderMetadata;

    /**
     * Response information for telemetry and debugging purposes.
     */
    response: {
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
      headers: Record<string, string> | undefined;
    };
  }>;
};
