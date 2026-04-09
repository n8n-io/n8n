import {
  TranscriptionModelV3,
  TranscriptionModelV3CallOptions,
  SharedV3Warning,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  convertBase64ToUint8Array,
  createJsonResponseHandler,
  mediaTypeToExtension,
  parseProviderOptions,
  postFormDataToApi,
} from '@ai-sdk/provider-utils';
import { OpenAIConfig } from '../openai-config';
import { openaiFailedResponseHandler } from '../openai-error';
import { openaiTranscriptionResponseSchema } from './openai-transcription-api';
import {
  OpenAITranscriptionModelId,
  openAITranscriptionModelOptions,
  OpenAITranscriptionModelOptions,
} from './openai-transcription-options';

export type OpenAITranscriptionCallOptions = Omit<
  TranscriptionModelV3CallOptions,
  'providerOptions'
> & {
  providerOptions?: {
    openai?: OpenAITranscriptionModelOptions;
  };
};

interface OpenAITranscriptionModelConfig extends OpenAIConfig {
  _internal?: {
    currentDate?: () => Date;
  };
}

// https://platform.openai.com/docs/guides/speech-to-text#supported-languages
const languageMap = {
  afrikaans: 'af',
  arabic: 'ar',
  armenian: 'hy',
  azerbaijani: 'az',
  belarusian: 'be',
  bosnian: 'bs',
  bulgarian: 'bg',
  catalan: 'ca',
  chinese: 'zh',
  croatian: 'hr',
  czech: 'cs',
  danish: 'da',
  dutch: 'nl',
  english: 'en',
  estonian: 'et',
  finnish: 'fi',
  french: 'fr',
  galician: 'gl',
  german: 'de',
  greek: 'el',
  hebrew: 'he',
  hindi: 'hi',
  hungarian: 'hu',
  icelandic: 'is',
  indonesian: 'id',
  italian: 'it',
  japanese: 'ja',
  kannada: 'kn',
  kazakh: 'kk',
  korean: 'ko',
  latvian: 'lv',
  lithuanian: 'lt',
  macedonian: 'mk',
  malay: 'ms',
  marathi: 'mr',
  maori: 'mi',
  nepali: 'ne',
  norwegian: 'no',
  persian: 'fa',
  polish: 'pl',
  portuguese: 'pt',
  romanian: 'ro',
  russian: 'ru',
  serbian: 'sr',
  slovak: 'sk',
  slovenian: 'sl',
  spanish: 'es',
  swahili: 'sw',
  swedish: 'sv',
  tagalog: 'tl',
  tamil: 'ta',
  thai: 'th',
  turkish: 'tr',
  ukrainian: 'uk',
  urdu: 'ur',
  vietnamese: 'vi',
  welsh: 'cy',
};

export class OpenAITranscriptionModel implements TranscriptionModelV3 {
  readonly specificationVersion = 'v3';

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: OpenAITranscriptionModelId,
    private readonly config: OpenAITranscriptionModelConfig,
  ) {}

  private async getArgs({
    audio,
    mediaType,
    providerOptions,
  }: OpenAITranscriptionCallOptions) {
    const warnings: SharedV3Warning[] = [];

    // Parse provider options
    const openAIOptions = await parseProviderOptions({
      provider: 'openai',
      providerOptions,
      schema: openAITranscriptionModelOptions,
    });

    // Create form data with base fields
    const formData = new FormData();
    const blob =
      audio instanceof Uint8Array
        ? new Blob([audio])
        : new Blob([convertBase64ToUint8Array(audio)]);

    formData.append('model', this.modelId);
    const fileExtension = mediaTypeToExtension(mediaType);
    formData.append(
      'file',
      new File([blob], 'audio', { type: mediaType }),
      `audio.${fileExtension}`,
    );

    // Add provider-specific options
    if (openAIOptions) {
      const transcriptionModelOptions = {
        include: openAIOptions.include,
        language: openAIOptions.language,
        prompt: openAIOptions.prompt,
        // https://platform.openai.com/docs/api-reference/audio/createTranscription#audio_createtranscription-response_format
        // prefer verbose_json to get segments for models that support it
        response_format: [
          'gpt-4o-transcribe',
          'gpt-4o-mini-transcribe',
        ].includes(this.modelId)
          ? 'json'
          : 'verbose_json',
        temperature: openAIOptions.temperature,
        timestamp_granularities: openAIOptions.timestampGranularities,
      };

      for (const [key, value] of Object.entries(transcriptionModelOptions)) {
        if (value != null) {
          if (Array.isArray(value)) {
            for (const item of value) {
              formData.append(`${key}[]`, String(item));
            }
          } else {
            formData.append(key, String(value));
          }
        }
      }
    }

    return {
      formData,
      warnings,
    };
  }

  async doGenerate(
    options: OpenAITranscriptionCallOptions,
  ): Promise<Awaited<ReturnType<TranscriptionModelV3['doGenerate']>>> {
    const currentDate = this.config._internal?.currentDate?.() ?? new Date();
    const { formData, warnings } = await this.getArgs(options);

    const {
      value: response,
      responseHeaders,
      rawValue: rawResponse,
    } = await postFormDataToApi({
      url: this.config.url({
        path: '/audio/transcriptions',
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      formData,
      failedResponseHandler: openaiFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        openaiTranscriptionResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const language =
      response.language != null && response.language in languageMap
        ? languageMap[response.language as keyof typeof languageMap]
        : undefined;

    return {
      text: response.text,
      segments:
        response.segments?.map(segment => ({
          text: segment.text,
          startSecond: segment.start,
          endSecond: segment.end,
        })) ??
        response.words?.map(word => ({
          text: word.word,
          startSecond: word.start,
          endSecond: word.end,
        })) ??
        [],
      language,
      durationInSeconds: response.duration ?? undefined,
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
        body: rawResponse,
      },
    };
  }
}
