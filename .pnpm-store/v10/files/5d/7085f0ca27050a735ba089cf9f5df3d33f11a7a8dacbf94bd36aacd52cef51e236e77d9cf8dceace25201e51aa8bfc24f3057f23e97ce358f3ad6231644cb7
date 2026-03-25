// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../resource.mjs";
import * as SpeechAPI from "./speech.mjs";
import { Speech } from "./speech.mjs";
import * as TranscriptionsAPI from "./transcriptions.mjs";
import { Transcriptions } from "./transcriptions.mjs";
import * as TranslationsAPI from "./translations.mjs";
import { Translations } from "./translations.mjs";
export class Audio extends APIResource {
    constructor() {
        super(...arguments);
        this.speech = new SpeechAPI.Speech(this._client);
        this.transcriptions = new TranscriptionsAPI.Transcriptions(this._client);
        this.translations = new TranslationsAPI.Translations(this._client);
    }
}
Audio.Speech = Speech;
Audio.Transcriptions = Transcriptions;
Audio.Translations = Translations;
//# sourceMappingURL=audio.mjs.map