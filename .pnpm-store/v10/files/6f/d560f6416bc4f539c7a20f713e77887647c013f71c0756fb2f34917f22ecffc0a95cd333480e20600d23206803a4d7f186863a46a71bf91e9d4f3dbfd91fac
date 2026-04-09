import { JSONObject } from '@ai-sdk/provider';
import { ProviderOptions, withUserAgentSuffix } from '@ai-sdk/provider-utils';
import { NoTranscriptGeneratedError } from '../error/no-transcript-generated-error';
import { logWarnings } from '../logger/log-warnings';
import { DataContent } from '../prompt';
import { convertDataContentToUint8Array } from '../prompt/data-content';
import { TranscriptionModel } from '../types/transcription-model';
import { TranscriptionModelResponseMetadata } from '../types/transcription-model-response-metadata';
import {
  audioMediaTypeSignatures,
  detectMediaType,
} from '../util/detect-media-type';
import { createDownload } from '../util/download/create-download';
import { prepareRetries } from '../util/prepare-retries';
import { TranscriptionResult } from './transcribe-result';
import { VERSION } from '../version';
import { resolveTranscriptionModel } from '../model/resolve-model';
import { Warning } from '../types';
/**
 * Generates transcripts using a transcription model.
 *
 * @param model - The transcription model to use.
 * @param audio - The audio data to transcribe as DataContent (string | Uint8Array | ArrayBuffer | Buffer) or a URL.
 * @param providerOptions - Additional provider-specific options that are passed through to the provider
 * as body parameters.
 * @param maxRetries - Maximum number of retries. Set to 0 to disable retries. Default: 2.
 * @param abortSignal - An optional abort signal that can be used to cancel the call.
 * @param headers - Additional HTTP headers to be sent with the request. Only applicable for HTTP-based providers.
 *
 * @returns A result object that contains the generated transcript.
 */
const defaultDownload = createDownload();

export async function transcribe({
  model,
  audio,
  providerOptions = {},
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
  download: downloadFn = defaultDownload,
}: {
  /**
   * The transcription model to use.
   */
  model: TranscriptionModel;

  /**
   * The audio data to transcribe.
   */
  audio: DataContent | URL;

  /**
   * Additional provider-specific options that are passed through to the provider
   * as body parameters.
   *
   * The outer record is keyed by the provider name, and the inner
   * record is keyed by the provider-specific metadata key.
   * ```ts
   * {
   *   "openai": {
   *     "temperature": 0
   *   }
   * }
   * ```
   */
  providerOptions?: ProviderOptions;

  /**
   * Maximum number of retries per transcript model call. Set to 0 to disable retries.
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

  /**
   * Custom download function for fetching audio from URLs.
   * Use `createDownload()` from `ai` to create a download function with custom size limits.
   *
   * @default createDownload() (2 GiB limit)
   */
  download?: (options: {
    url: URL;
    abortSignal?: AbortSignal;
  }) => Promise<{ data: Uint8Array; mediaType: string | undefined }>;
}): Promise<TranscriptionResult> {
  const resolvedModel = resolveTranscriptionModel(model);
  if (!resolvedModel) {
    throw new Error('Model could not be resolved');
  }

  const { retry } = prepareRetries({
    maxRetries: maxRetriesArg,
    abortSignal,
  });

  const headersWithUserAgent = withUserAgentSuffix(
    headers ?? {},
    `ai/${VERSION}`,
  );

  const audioData =
    audio instanceof URL
      ? (await downloadFn({ url: audio, abortSignal })).data
      : convertDataContentToUint8Array(audio);

  const result = await retry(() =>
    resolvedModel.doGenerate({
      audio: audioData,
      abortSignal,
      headers: headersWithUserAgent,
      providerOptions,
      mediaType:
        detectMediaType({
          data: audioData,
          signatures: audioMediaTypeSignatures,
        }) ?? 'audio/wav',
    }),
  );

  logWarnings({
    warnings: result.warnings,
    provider: resolvedModel.provider,
    model: resolvedModel.modelId,
  });

  if (!result.text) {
    throw new NoTranscriptGeneratedError({ responses: [result.response] });
  }

  return new DefaultTranscriptionResult({
    text: result.text,
    segments: result.segments,
    language: result.language,
    durationInSeconds: result.durationInSeconds,
    warnings: result.warnings,
    responses: [result.response],
    providerMetadata: result.providerMetadata,
  });
}

class DefaultTranscriptionResult implements TranscriptionResult {
  readonly text: string;
  readonly segments: Array<{
    text: string;
    startSecond: number;
    endSecond: number;
  }>;
  readonly language: string | undefined;
  readonly durationInSeconds: number | undefined;
  readonly warnings: Array<Warning>;
  readonly responses: Array<TranscriptionModelResponseMetadata>;
  readonly providerMetadata: Record<string, JSONObject>;

  constructor(options: {
    text: string;
    segments: Array<{
      text: string;
      startSecond: number;
      endSecond: number;
    }>;
    language: string | undefined;
    durationInSeconds: number | undefined;
    warnings: Array<Warning>;
    responses: Array<TranscriptionModelResponseMetadata>;
    providerMetadata: Record<string, JSONObject> | undefined;
  }) {
    this.text = options.text;
    this.segments = options.segments;
    this.language = options.language;
    this.durationInSeconds = options.durationInSeconds;
    this.warnings = options.warnings;
    this.responses = options.responses;
    this.providerMetadata = options.providerMetadata ?? {};
  }
}
