import { JSONObject } from '@ai-sdk/provider';
import { SpeechModelResponseMetadata } from '../types/speech-model-response-metadata';
import { Warning } from '../types/warning';
import { GeneratedAudioFile } from './generated-audio-file';

/**
 * The result of a `generateSpeech` call.
 * It contains the audio data and additional information.
 */
export interface SpeechResult {
  /**
   * The generated audio file with the audio data.
   */
  readonly audio: GeneratedAudioFile;

  /**
   * Warnings for the call, e.g. unsupported settings.
   */
  readonly warnings: Array<Warning>;

  /**
   * Response metadata from the provider. There may be multiple responses if we made multiple calls to the model.
   */
  readonly responses: Array<SpeechModelResponseMetadata>;

  /**
   * Provider metadata from the provider.
   */
  readonly providerMetadata: Record<string, JSONObject>;
}
