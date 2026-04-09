import { JSONValue } from '../../json-value';
import { SharedV2Headers } from '../../shared';
import { TranscriptionModelV2CallOptions } from './transcription-model-v2-call-options';
import { TranscriptionModelV2CallWarning } from './transcription-model-v2-call-warning';

/**
 * Transcription model specification version 2.
 */
export type TranscriptionModelV2 = {
  /**
   * The transcription model must specify which transcription model interface
   * version it implements. This will allow us to evolve the transcription
   * model interface and retain backwards compatibility. The different
   * implementation versions can be handled as a discriminated union
   * on our side.
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
   * Generates a transcript.
   */
  doGenerate(options: TranscriptionModelV2CallOptions): PromiseLike<{
    /**
     * The complete transcribed text from the audio.
     */
    text: string;

    /**
     * Array of transcript segments with timing information.
     * Each segment represents a portion of the transcribed text with start and end times.
     */
    segments: Array<{
      /**
       * The text content of this segment.
       */
      text: string;
      /**
       * The start time of this segment in seconds.
       */
      startSecond: number;
      /**
       * The end time of this segment in seconds.
       */
      endSecond: number;
    }>;

    /**
     * The detected language of the audio content, as an ISO-639-1 code (e.g., 'en' for English).
     * May be undefined if the language couldn't be detected.
     */
    language: string | undefined;

    /**
     * The total duration of the audio file in seconds.
     * May be undefined if the duration couldn't be determined.
     */
    durationInSeconds: number | undefined;

    /**
     * Warnings for the call, e.g. unsupported settings.
     */
    warnings: Array<TranscriptionModelV2CallWarning>;

    /**
     * Optional request information for telemetry and debugging purposes.
     */
    request?: {
      /**
       * Raw request HTTP body that was sent to the provider API as a string (JSON should be stringified).
       * Non-HTTP(s) providers should not set this.
       */
      body?: string;
    };

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
      headers?: SharedV2Headers;

      /**
       * Response body.
       */
      body?: unknown;
    };

    /**
     * Additional provider-specific metadata. They are passed through
     * from the provider to the AI SDK and enable provider-specific
     * results that can be fully encapsulated in the provider.
     */
    providerMetadata?: Record<string, Record<string, JSONValue>>;
  }>;
};
