// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../resource';
import * as Core from '../../core';
import * as AudioAPI from './audio';
import * as TranscriptionsAPI from './transcriptions';

export class Translations extends APIResource {
  /**
   * Translates audio into English.
   */
  create(
    body: TranslationCreateParams<'json' | undefined>,
    options?: Core.RequestOptions,
  ): Core.APIPromise<Translation>;
  create(
    body: TranslationCreateParams<'verbose_json'>,
    options?: Core.RequestOptions,
  ): Core.APIPromise<TranslationVerbose>;
  create(
    body: TranslationCreateParams<'text' | 'srt' | 'vtt'>,
    options?: Core.RequestOptions,
  ): Core.APIPromise<string>;
  create(body: TranslationCreateParams, options?: Core.RequestOptions): Core.APIPromise<Translation>;
  create(
    body: TranslationCreateParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<TranslationCreateResponse | string> {
    return this._client.post('/audio/translations', Core.multipartFormRequestOptions({ body, ...options }));
  }
}

export interface Translation {
  text: string;
}

export interface TranslationVerbose {
  /**
   * The duration of the input audio.
   */
  duration: string;

  /**
   * The language of the output translation (always `english`).
   */
  language: string;

  /**
   * The translated text.
   */
  text: string;

  /**
   * Segments of the translated text and their corresponding details.
   */
  segments?: Array<TranscriptionsAPI.TranscriptionSegment>;
}

export type TranslationCreateResponse = Translation | TranslationVerbose;

export interface TranslationCreateParams<
  ResponseFormat extends AudioAPI.AudioResponseFormat | undefined = AudioAPI.AudioResponseFormat | undefined,
> {
  /**
   * The audio file object (not file name) translate, in one of these formats: flac,
   * mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm.
   */
  file: Core.Uploadable;

  /**
   * ID of the model to use. Only `whisper-1` (which is powered by our open source
   * Whisper V2 model) is currently available.
   */
  model: (string & {}) | AudioAPI.AudioModel;

  /**
   * An optional text to guide the model's style or continue a previous audio
   * segment. The
   * [prompt](https://platform.openai.com/docs/guides/speech-to-text#prompting)
   * should be in English.
   */
  prompt?: string;

  /**
   * The format of the output, in one of these options: `json`, `text`, `srt`,
   * `verbose_json`, or `vtt`.
   */
  response_format?: ResponseFormat;

  /**
   * The sampling temperature, between 0 and 1. Higher values like 0.8 will make the
   * output more random, while lower values like 0.2 will make it more focused and
   * deterministic. If set to 0, the model will use
   * [log probability](https://en.wikipedia.org/wiki/Log_probability) to
   * automatically increase the temperature until certain thresholds are hit.
   */
  temperature?: number;
}

export declare namespace Translations {
  export {
    type Translation as Translation,
    type TranslationVerbose as TranslationVerbose,
    type TranslationCreateResponse as TranslationCreateResponse,
    type TranslationCreateParams as TranslationCreateParams,
  };
}
