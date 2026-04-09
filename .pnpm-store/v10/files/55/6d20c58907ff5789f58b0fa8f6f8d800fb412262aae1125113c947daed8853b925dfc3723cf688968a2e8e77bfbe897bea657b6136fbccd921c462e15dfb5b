import { SharedV2Headers } from '../../shared';
import { SharedV2ProviderMetadata } from '../../shared/v2/shared-v2-provider-metadata';
import { LanguageModelV2CallOptions } from './language-model-v2-call-options';
import { LanguageModelV2CallWarning } from './language-model-v2-call-warning';
import { LanguageModelV2Content } from './language-model-v2-content';
import { LanguageModelV2FinishReason } from './language-model-v2-finish-reason';
import { LanguageModelV2ResponseMetadata } from './language-model-v2-response-metadata';
import { LanguageModelV2StreamPart } from './language-model-v2-stream-part';
import { LanguageModelV2Usage } from './language-model-v2-usage';

/**
 * Specification for a language model that implements the language model interface version 2.
 */
export type LanguageModelV2 = {
  /**
   * The language model must specify which language model interface version it implements.
   */
  readonly specificationVersion: 'v2';

  /**
   * Name of the provider for logging purposes.
   */
  readonly provider: string;

  /**
   * Provider-specific model ID for logging purposes.
   */
  readonly modelId: string;

  /**
   * Supported URL patterns by media type for the provider.
   *
   * The keys are media type patterns or full media types (e.g. `*\/*` for everything, `audio/*`, `video/*`, or `application/pdf`).
   * and the values are arrays of regular expressions that match the URL paths.
   *
   * The matching should be against lower-case URLs.
   *
   * Matched URLs are supported natively by the model and are not downloaded.
   *
   * @returns A map of supported URL patterns by media type (as a promise or a plain object).
   */
  supportedUrls:
    | PromiseLike<Record<string, RegExp[]>>
    | Record<string, RegExp[]>;

  /**
   * Generates a language model output (non-streaming).
   *
   * Naming: "do" prefix to prevent accidental direct usage of the method
   * by the user.
   */
  doGenerate(options: LanguageModelV2CallOptions): PromiseLike<{
    /**
     * Ordered content that the model has generated.
     */
    content: Array<LanguageModelV2Content>;

    /**
     * Finish reason.
     */
    finishReason: LanguageModelV2FinishReason;

    /**
     * Usage information.
     */
    usage: LanguageModelV2Usage;

    /**
     * Additional provider-specific metadata. They are passed through
     * from the provider to the AI SDK and enable provider-specific
     * results that can be fully encapsulated in the provider.
     */
    providerMetadata?: SharedV2ProviderMetadata;

    /**
     * Optional request information for telemetry and debugging purposes.
     */
    request?: {
      /**
       * Request HTTP body that was sent to the provider API.
       */
      body?: unknown;
    };

    /**
     * Optional response information for telemetry and debugging purposes.
     */
    response?: LanguageModelV2ResponseMetadata & {
      /**
       * Response headers.
       */
      headers?: SharedV2Headers;

      /**
       * Response HTTP body.
       */
      body?: unknown;
    };

    /**
     * Warnings for the call, e.g. unsupported settings.
     */
    warnings: Array<LanguageModelV2CallWarning>;
  }>;

  /**
   * Generates a language model output (streaming).
   *
   * Naming: "do" prefix to prevent accidental direct usage of the method
   * by the user.
   *
   * @return A stream of higher-level language model output parts.
   */
  doStream(options: LanguageModelV2CallOptions): PromiseLike<{
    stream: ReadableStream<LanguageModelV2StreamPart>;

    /**
     * Optional request information for telemetry and debugging purposes.
     */
    request?: {
      /**
       * Request HTTP body that was sent to the provider API.
       */
      body?: unknown;
    };

    /**
     * Optional response data.
     */
    response?: {
      /**
       * Response headers.
       */
      headers?: SharedV2Headers;
    };
  }>;
};
