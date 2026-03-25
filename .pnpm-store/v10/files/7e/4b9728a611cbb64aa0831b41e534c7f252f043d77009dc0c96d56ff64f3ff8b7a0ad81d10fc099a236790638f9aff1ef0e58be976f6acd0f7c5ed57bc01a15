// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../resource';
import * as SpeechAPI from './speech';
import { Speech, SpeechCreateParams } from './speech';
import * as TranscriptionsAPI from './transcriptions';
import { Transcription, TranscriptionCreateParams, Transcriptions } from './transcriptions';
import * as TranslationsAPI from './translations';
import { Translation, TranslationCreateParams, Translations } from './translations';

export class Audio extends APIResource {
  speech: SpeechAPI.Speech = new SpeechAPI.Speech(this._client);
  transcriptions: TranscriptionsAPI.Transcriptions = new TranscriptionsAPI.Transcriptions(this._client);
  translations: TranslationsAPI.Translations = new TranslationsAPI.Translations(this._client);
}

Audio.Speech = Speech;
Audio.Transcriptions = Transcriptions;
Audio.Translations = Translations;

export declare namespace Audio {
  export { Speech as Speech, type SpeechCreateParams as SpeechCreateParams };

  export {
    Transcriptions as Transcriptions,
    type Transcription as Transcription,
    type TranscriptionCreateParams as TranscriptionCreateParams,
  };

  export {
    Translations as Translations,
    type Translation as Translation,
    type TranslationCreateParams as TranslationCreateParams,
  };
}
