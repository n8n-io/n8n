import { JSONObject } from '@ai-sdk/provider';
import { ProviderOptions, withUserAgentSuffix } from '@ai-sdk/provider-utils';
import { NoSpeechGeneratedError } from '../error/no-speech-generated-error';
import { logWarnings } from '../logger/log-warnings';
import { resolveSpeechModel } from '../model/resolve-model';
import { SpeechModel } from '../types/speech-model';
import { SpeechModelResponseMetadata } from '../types/speech-model-response-metadata';
import { Warning } from '../types/warning';
import {
  audioMediaTypeSignatures,
  detectMediaType,
} from '../util/detect-media-type';
import { prepareRetries } from '../util/prepare-retries';
import { VERSION } from '../version';
import { SpeechResult } from './generate-speech-result';
import {
  DefaultGeneratedAudioFile,
  GeneratedAudioFile,
} from './generated-audio-file';

/**
 * Generates speech audio using a speech model.
 *
 * @param model - The speech model to use.
 * @param text - The text to convert to speech.
 * @param voice - The voice to use for speech generation.
 * @param outputFormat - The output format to use for speech generation e.g. "mp3", "wav", etc.
 * @param instructions - Instructions for the speech generation e.g. "Speak in a slow and steady tone".
 * @param speed - The speed of the speech generation.
 * @param language - The language for speech generation (ISO 639-1 code e.g. "en", "es", "fr") or "auto" for automatic detection.
 * @param providerOptions - Additional provider-specific options that are passed through to the provider
 * as body parameters.
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @returns A result object that contains the generated audio data.
 */
export async function generateSpeech({
  model,
  text,
  voice,
  outputFormat,
  instructions,
  speed,
  language,
  providerOptions = {},
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
}: {
  /**
   * The speech model to use.
   */
  model: SpeechModel;

  /**
   * The text to convert to speech.
   */
  text: string;

  /**
   * The voice to use for speech generation.
   */
  voice?: string;

  /**
   * The desired output format for the audio e.g. "mp3", "wav", etc.
   */
  outputFormat?: 'mp3' | 'wav' | (string & {});

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
   * "openai": {}
   * }
   * ```
   */
  providerOptions?: ProviderOptions;

  /**
   * Maximum number of retries per speech model call. Set to 0 to disable retries.
   *
   * @default 2
   */
  maxRetries?: number;

  /**
   * Abort signal.
   */
  abortSignal?: AbortSignal;

  /**
   * Additional headers to include in the request.
   * Only applicable for HTTP-based providers.
   */
  headers?: Record<string, string>;
}): Promise<SpeechResult> {
  const resolvedModel = resolveSpeechModel(model);
  if (!resolvedModel) {
    throw new Error('Model could not be resolved');
  }

  const headersWithUserAgent = withUserAgentSuffix(
    headers ?? {},
    `ai/${VERSION}`,
  );

  const { retry } = prepareRetries({
    maxRetries: maxRetriesArg,
    abortSignal,
  });

  const result = await retry(() =>
    resolvedModel.doGenerate({
      text,
      voice,
      outputFormat,
      instructions,
      speed,
      language,
      abortSignal,
      headers: headersWithUserAgent,
      providerOptions,
    }),
  );

  if (!result.audio || result.audio.length === 0) {
    throw new NoSpeechGeneratedError({ responses: [result.response] });
  }

  logWarnings({
    warnings: result.warnings,
    provider: resolvedModel.provider,
    model: resolvedModel.modelId,
  });

  return new DefaultSpeechResult({
    audio: new DefaultGeneratedAudioFile({
      data: result.audio,
      mediaType:
        detectMediaType({
          data: result.audio,
          signatures: audioMediaTypeSignatures,
        }) ?? 'audio/mp3',
    }),
    warnings: result.warnings,
    responses: [result.response],
    providerMetadata: result.providerMetadata,
  });
}

class DefaultSpeechResult implements SpeechResult {
  readonly audio: GeneratedAudioFile;
  readonly warnings: Array<Warning>;
  readonly responses: Array<SpeechModelResponseMetadata>;
  readonly providerMetadata: Record<string, JSONObject>;

  constructor(options: {
    audio: GeneratedAudioFile;
    warnings: Array<Warning>;
    responses: Array<SpeechModelResponseMetadata>;
    providerMetadata: Record<string, JSONObject> | undefined;
  }) {
    this.audio = options.audio;
    this.warnings = options.warnings;
    this.responses = options.responses;
    this.providerMetadata = options.providerMetadata ?? {};
  }
}
