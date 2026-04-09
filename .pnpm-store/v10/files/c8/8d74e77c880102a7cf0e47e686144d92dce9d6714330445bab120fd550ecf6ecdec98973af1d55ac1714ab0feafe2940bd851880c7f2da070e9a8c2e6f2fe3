// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../resource';
import * as SpeechAPI from './speech';
import { Speech, SpeechCreateParams, SpeechModel } from './speech';
import * as TranscriptionsAPI from './transcriptions';
import {
  Transcription,
  TranscriptionCreateParams,
  TranscriptionCreateResponse,
  TranscriptionSegment,
  TranscriptionVerbose,
  TranscriptionWord,
  Transcriptions,
} from './transcriptions';
import * as TranslationsAPI from './translations';
import {
  Translation,
  TranslationCreateParams,
  TranslationCreateResponse,
  TranslationVerbose,
  Translations,
} from './translations';

export class Audio extends APIResource {
  transcriptions: TranscriptionsAPI.Transcriptions = new TranscriptionsAPI.Transcriptions(this._client);
  translations: TranslationsAPI.Translations = new TranslationsAPI.Translations(this._client);
  speech: SpeechAPI.Speech = new SpeechAPI.Speech(this._client);
}

export type AudioModel = 'whisper-1';

/**
 * The format of the output, in one of these options: `json`, `text`, `srt`,
 * `verbose_json`, or `vtt`.
 */
export type AudioResponseFormat = 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';

Audio.Transcriptions = Transcriptions;
Audio.Translations = Translations;
Audio.Speech = Speech;

export declare namespace Audio {
  export { type AudioModel as AudioModel, type AudioResponseFormat as AudioResponseFormat };

  export {
    Transcriptions as Transcriptions,
    type Transcription as Transcription,
    type TranscriptionSegment as TranscriptionSegment,
    type TranscriptionVerbose as TranscriptionVerbose,
    type TranscriptionWord as TranscriptionWord,
    type TranscriptionCreateResponse as TranscriptionCreateResponse,
    type TranscriptionCreateParams as TranscriptionCreateParams,
  };

  export {
    Translations as Translations,
    type Translation as Translation,
    type TranslationVerbose as TranslationVerbose,
    type TranslationCreateResponse as TranslationCreateResponse,
    type TranslationCreateParams as TranslationCreateParams,
  };

  export { Speech as Speech, type SpeechModel as SpeechModel, type SpeechCreateParams as SpeechCreateParams };
}
