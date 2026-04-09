import { JSONArray, JSONValue } from '../../json-value';
import { ImageModelV3Usage } from './image-model-v3-usage';
import { ImageModelV3CallOptions } from './image-model-v3-call-options';
import { SharedV3Warning } from '../../shared/v3/shared-v3-warning';

export type ImageModelV3ProviderMetadata = Record<
  string,
  {
    images: JSONArray;
  } & JSONValue
>;

type GetMaxImagesPerCallFunction = (options: {
  modelId: string;
}) => PromiseLike<number | undefined> | number | undefined;

/**
 * Image generation model specification version 3.
 */
export type ImageModelV3 = {
  /**
   * The image model must specify which image model interface
   * version it implements. This will allow us to evolve the image
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
   * Limit of how many images can be generated in a single API call.
   * Can be set to a number for a fixed limit, to undefined to use
   * the global limit, or a function that returns a number or undefined,
   * optionally as a promise.
   */
  readonly maxImagesPerCall: number | undefined | GetMaxImagesPerCallFunction;

  /**
   * Generates an array of images.
   */
  doGenerate(options: ImageModelV3CallOptions): PromiseLike<{
    /**
     * Generated images as base64 encoded strings or binary data.
     * The images should be returned without any unnecessary conversion.
     * If the API returns base64 encoded strings, the images should be returned
     * as base64 encoded strings. If the API returns binary data, the images should
     * be returned as binary data.
     */
    images: Array<string> | Array<Uint8Array>;

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
     * record is provider-specific metadata. It always includes an
     * `images` key with image-specific metadata
     *
     * ```ts
     * {
     * "openai": {
     * "images": ["revisedPrompt": "Revised prompt here."]
     * }
     * }
     * ```
     */
    providerMetadata?: ImageModelV3ProviderMetadata;

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

    /**
     * Optional token usage for the image generation call (if the provider reports it).
     */
    usage?: ImageModelV3Usage;
  }>;
};
