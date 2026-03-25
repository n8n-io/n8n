// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../resource';
import * as Core from '../../core';

export class Transcriptions extends APIResource {
  /**
   * Transcribes audio into the input language.
   */
  create(body: TranscriptionCreateParams, options?: Core.RequestOptions): Core.APIPromise<Transcription> {
    return this._client.post(
      '/openai/v1/audio/transcriptions',
      Core.multipartFormRequestOptions({ body, ...options }),
    );
  }
}

/**
 * Represents a transcription response returned by model, based on the provided
 * input.
 */
export interface Transcription {
  /**
   * The transcribed text.
   */
  text: string;
}

export interface TranscriptionCreateParams {
  /**
   * ID of the model to use. Only `whisper-large-v3` is currently available.
   */
  model: (string & {}) | 'whisper-large-v3';

  /**
   * The audio file object (not file name) to transcribe, in one of these formats:
   * flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm. Either a file or a URL must
   * be provided. Note that the file field is not supported in Batch API requests.
   */
  file?: Core.Uploadable;

  /**
   * The language of the input audio. Supplying the input language in
   * [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) format will
   * improve accuracy and latency.
   */
  language?:
    | (string & {})
    | 'en'
    | 'zh'
    | 'de'
    | 'es'
    | 'ru'
    | 'ko'
    | 'fr'
    | 'ja'
    | 'pt'
    | 'tr'
    | 'pl'
    | 'ca'
    | 'nl'
    | 'ar'
    | 'sv'
    | 'it'
    | 'id'
    | 'hi'
    | 'fi'
    | 'vi'
    | 'he'
    | 'uk'
    | 'el'
    | 'ms'
    | 'cs'
    | 'ro'
    | 'da'
    | 'hu'
    | 'ta'
    | 'no'
    | 'th'
    | 'ur'
    | 'hr'
    | 'bg'
    | 'lt'
    | 'la'
    | 'mi'
    | 'ml'
    | 'cy'
    | 'sk'
    | 'te'
    | 'fa'
    | 'lv'
    | 'bn'
    | 'sr'
    | 'az'
    | 'sl'
    | 'kn'
    | 'et'
    | 'mk'
    | 'br'
    | 'eu'
    | 'is'
    | 'hy'
    | 'ne'
    | 'mn'
    | 'bs'
    | 'kk'
    | 'sq'
    | 'sw'
    | 'gl'
    | 'mr'
    | 'pa'
    | 'si'
    | 'km'
    | 'sn'
    | 'yo'
    | 'so'
    | 'af'
    | 'oc'
    | 'ka'
    | 'be'
    | 'tg'
    | 'sd'
    | 'gu'
    | 'am'
    | 'yi'
    | 'lo'
    | 'uz'
    | 'fo'
    | 'ht'
    | 'ps'
    | 'tk'
    | 'nn'
    | 'mt'
    | 'sa'
    | 'lb'
    | 'my'
    | 'bo'
    | 'tl'
    | 'mg'
    | 'as'
    | 'tt'
    | 'haw'
    | 'ln'
    | 'ha'
    | 'ba'
    | 'jv'
    | 'su'
    | 'yue';

  /**
   * An optional text to guide the model's style or continue a previous audio
   * segment. The [prompt](/docs/speech-text) should match the audio language.
   */
  prompt?: string;

  /**
   * The format of the transcript output, in one of these options: `json`, `text`, or
   * `verbose_json`.
   */
  response_format?: 'json' | 'text' | 'verbose_json';

  /**
   * The sampling temperature, between 0 and 1. Higher values like 0.8 will make the
   * output more random, while lower values like 0.2 will make it more focused and
   * deterministic. If set to 0, the model will use
   * [log probability](https://en.wikipedia.org/wiki/Log_probability) to
   * automatically increase the temperature until certain thresholds are hit.
   */
  temperature?: number;

  /**
   * The timestamp granularities to populate for this transcription.
   * `response_format` must be set `verbose_json` to use timestamp granularities.
   * Either or both of these options are supported: `word`, or `segment`. Note: There
   * is no additional latency for segment timestamps, but generating word timestamps
   * incurs additional latency.
   */
  timestamp_granularities?: Array<'word' | 'segment'>;

  /**
   * The audio URL to translate/transcribe (supports Base64URL). Either a file or a
   * URL must be provided. For Batch API requests, the URL field is required since
   * the file field is not supported.
   */
  url?: string;
}

export declare namespace Transcriptions {
  export { type Transcription as Transcription, type TranscriptionCreateParams as TranscriptionCreateParams };
}
