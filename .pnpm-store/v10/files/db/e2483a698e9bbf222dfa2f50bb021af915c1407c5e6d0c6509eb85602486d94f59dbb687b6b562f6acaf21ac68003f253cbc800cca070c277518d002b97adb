// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../resource';
import * as Core from '../../core';

export class Translations extends APIResource {
  /**
   * Translates audio into English.
   */
  create(body: TranslationCreateParams, options?: Core.RequestOptions): Core.APIPromise<Translation> {
    return this._client.post(
      '/openai/v1/audio/translations',
      Core.multipartFormRequestOptions({ body, ...options }),
    );
  }
}

export interface Translation {
  text: string;
}

export interface TranslationCreateParams {
  /**
   * ID of the model to use. Only `whisper-large-v3` is currently available.
   */
  model: (string & {}) | 'whisper-large-v3';

  /**
   * The audio file object (not file name) translate, in one of these formats: flac,
   * mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm.
   */
  file?: Core.Uploadable;

  /**
   * An optional text to guide the model's style or continue a previous audio
   * segment. The [prompt](/docs/guides/speech-to-text/prompting) should be in
   * English.
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
   * The audio URL to translate/transcribe (supports Base64URL). Either file or url
   * must be provided. When using the Batch API only url is supported.
   */
  url?: string;
}

export declare namespace Translations {
  export { type Translation as Translation, type TranslationCreateParams as TranslationCreateParams };
}
