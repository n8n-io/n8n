import { JSONObject } from '@ai-sdk/provider';
import { TranscriptionModelResponseMetadata } from '../types/transcription-model-response-metadata';
import { Warning } from '../types/warning';

/**
 * The result of a `transcribe` call.
 * It contains the transcript and additional information.
 */
export interface TranscriptionResult {
  /**
   * The complete transcribed text from the audio.
   */
  readonly text: string;

  /**
   * Array of transcript segments with timing information.
   * Each segment represents a portion of the transcribed text with start and end times.
   */
  readonly segments: Array<{
    /**
     * The text content of this segment.
     */
    readonly text: string;
    /**
     * The start time of this segment in seconds.
     */
    readonly startSecond: number;
    /**
     * The end time of this segment in seconds.
     */
    readonly endSecond: number;
  }>;

  /**
   * The detected language of the audio content, as an ISO-639-1 code (e.g., 'en' for English).
   * May be undefined if the language couldn't be detected.
   */
  readonly language: string | undefined;

  /**
   * The total duration of the audio file in seconds.
   * May be undefined if the duration couldn't be determined.
   */
  readonly durationInSeconds: number | undefined;

  /**
   * Warnings for the call, e.g. unsupported settings.
   */
  readonly warnings: Array<Warning>;

  /**
   * Response metadata from the provider. There may be multiple responses if we made multiple calls to the model.
   */
  readonly responses: Array<TranscriptionModelResponseMetadata>;

  /**
   * Provider metadata from the provider.
   */
  readonly providerMetadata: Record<string, JSONObject>;
}
