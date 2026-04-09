import { APIResource } from "../../resource.js";
import * as SpeechAPI from "./speech.js";
import { Speech, SpeechCreateParams, SpeechModel } from "./speech.js";
import * as TranscriptionsAPI from "./transcriptions.js";
import { Transcription, TranscriptionCreateParams, TranscriptionCreateParamsNonStreaming, TranscriptionCreateParamsStreaming, TranscriptionCreateResponse, TranscriptionInclude, TranscriptionSegment, TranscriptionStreamEvent, TranscriptionTextDeltaEvent, TranscriptionTextDoneEvent, TranscriptionVerbose, TranscriptionWord, Transcriptions } from "./transcriptions.js";
import * as TranslationsAPI from "./translations.js";
import { Translation, TranslationCreateParams, TranslationCreateResponse, TranslationVerbose, Translations } from "./translations.js";
export declare class Audio extends APIResource {
    transcriptions: TranscriptionsAPI.Transcriptions;
    translations: TranslationsAPI.Translations;
    speech: SpeechAPI.Speech;
}
export type AudioModel = 'whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe';
/**
 * The format of the output, in one of these options: `json`, `text`, `srt`,
 * `verbose_json`, or `vtt`. For `gpt-4o-transcribe` and `gpt-4o-mini-transcribe`,
 * the only supported format is `json`.
 */
export type AudioResponseFormat = 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
export declare namespace Audio {
    export { type AudioModel as AudioModel, type AudioResponseFormat as AudioResponseFormat };
    export { Transcriptions as Transcriptions, type Transcription as Transcription, type TranscriptionInclude as TranscriptionInclude, type TranscriptionSegment as TranscriptionSegment, type TranscriptionStreamEvent as TranscriptionStreamEvent, type TranscriptionTextDeltaEvent as TranscriptionTextDeltaEvent, type TranscriptionTextDoneEvent as TranscriptionTextDoneEvent, type TranscriptionVerbose as TranscriptionVerbose, type TranscriptionWord as TranscriptionWord, type TranscriptionCreateResponse as TranscriptionCreateResponse, type TranscriptionCreateParams as TranscriptionCreateParams, type TranscriptionCreateParamsNonStreaming as TranscriptionCreateParamsNonStreaming, type TranscriptionCreateParamsStreaming as TranscriptionCreateParamsStreaming, };
    export { Translations as Translations, type Translation as Translation, type TranslationVerbose as TranslationVerbose, type TranslationCreateResponse as TranslationCreateResponse, type TranslationCreateParams as TranslationCreateParams, };
    export { Speech as Speech, type SpeechModel as SpeechModel, type SpeechCreateParams as SpeechCreateParams };
}
//# sourceMappingURL=audio.d.ts.map