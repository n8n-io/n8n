import { JSONObject } from '../../json-value/json-value';

type SpeechModelV3ProviderOptions = Record<string, JSONObject>;

export type SpeechModelV3CallOptions = {
  /**
   * Text to convert to speech.
   */
  text: string;

  /**
   * The voice to use for speech synthesis.
   * This is provider-specific and may be a voice ID, name, or other identifier.
   */
  voice?: string;

  /**
   * The desired output format for the audio e.g. "mp3", "wav", etc.
   */
  outputFormat?: string;

  /**
   * Instructions for the speech generation e.g. "Speak in a slow and steady tone".
   */
  instructions?: string;

  /**
   * The speed of the speech generation.
   */
  speed?: number;

  /**
   * The language for speech generation. This should be an ISO 639-1 language code (e.g. "en", "es", "fr")
   * or "auto" for automatic language detection. Provider support varies.
   */
  language?: string;

  /**
   * Additional provider-specific options that are passed through to the provider
   * as body parameters.
   *
   * The outer record is keyed by the provider name, and the inner
   * record is keyed by the provider-specific metadata key.
   * ```ts
   * {
   *   "openai": {}
   * }
   * ```
   */
  providerOptions?: SpeechModelV3ProviderOptions;

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
