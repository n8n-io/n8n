import { APIResource } from "../../resource.js";
import * as SpeechAPI from "./speech.js";
import { Speech, SpeechCreateParams, SpeechModel } from "./speech.js";
import * as TranscriptionsAPI from "./transcriptions.js";
import { Transcription, TranscriptionCreateParams, TranscriptionCreateResponse, TranscriptionSegment, TranscriptionVerbose, TranscriptionWord, Transcriptions } from "./transcriptions.js";
import * as TranslationsAPI from "./translations.js";
import { Translation, TranslationCreateParams, TranslationCreateResponse, TranslationVerbose, Translations } from "./translations.js";
export declare class Audio extends APIResource {
    transcriptions: TranscriptionsAPI.Transcriptions;
    translations: TranslationsAPI.Translations;
    speech: SpeechAPI.Speech;
}
export type AudioModel = 'whisper-1';
/**
 * The format of the output, in one of these options: `json`, `text`, `srt`,
 * `verbose_json`, or `vtt`.
 */
export type AudioResponseFormat = 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
export declare namespace Audio {
    export { type AudioModel as AudioModel, type AudioResponseFormat as AudioResponseFormat };
    export { Transcriptions as Transcriptions, type Transcription as Transcription, type TranscriptionSegment as TranscriptionSegment, type TranscriptionVerbose as TranscriptionVerbose, type TranscriptionWord as TranscriptionWord, type TranscriptionCreateResponse as TranscriptionCreateResponse, type TranscriptionCreateParams as TranscriptionCreateParams, };
    export { Translations as Translations, type Translation as Translation, type TranslationVerbose as TranslationVerbose, type TranslationCreateResponse as TranslationCreateResponse, type TranslationCreateParams as TranslationCreateParams, };
    export { Speech as Speech, type SpeechModel as SpeechModel, type SpeechCreateParams as SpeechCreateParams };
}
//# sourceMappingURL=audio.d.ts.map