import { APIResource } from "../../core/resource.mjs";
import { APIPromise } from "../../core/api-promise.mjs";
import { RequestOptions } from "../../internal/request-options.mjs";
export declare class Speech extends APIResource {
    /**
     * Generates audio from the input text.
     *
     * @example
     * ```ts
     * const speech = await client.audio.speech.create({
     *   input: 'input',
     *   model: 'string',
     *   voice: 'ash',
     * });
     *
     * const content = await speech.blob();
     * console.log(content);
     * ```
     */
    create(body: SpeechCreateParams, options?: RequestOptions): APIPromise<Response>;
}
export type SpeechModel = 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts';
export interface SpeechCreateParams {
    /**
     * The text to generate audio for. The maximum length is 4096 characters.
     */
    input: string;
    /**
     * One of the available [TTS models](https://platform.openai.com/docs/models#tts):
     * `tts-1`, `tts-1-hd` or `gpt-4o-mini-tts`.
     */
    model: (string & {}) | SpeechModel;
    /**
     * The voice to use when generating the audio. Supported voices are `alloy`, `ash`,
     * `ballad`, `coral`, `echo`, `fable`, `onyx`, `nova`, `sage`, `shimmer`, and
     * `verse`. Previews of the voices are available in the
     * [Text to speech guide](https://platform.openai.com/docs/guides/text-to-speech#voice-options).
     */
    voice: (string & {}) | 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'onyx' | 'nova' | 'sage' | 'shimmer' | 'verse';
    /**
     * Control the voice of your generated audio with additional instructions. Does not
     * work with `tts-1` or `tts-1-hd`.
     */
    instructions?: string;
    /**
     * The format to audio in. Supported formats are `mp3`, `opus`, `aac`, `flac`,
     * `wav`, and `pcm`.
     */
    response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
    /**
     * The speed of the generated audio. Select a value from `0.25` to `4.0`. `1.0` is
     * the default.
     */
    speed?: number;
    /**
     * The format to stream the audio in. Supported formats are `sse` and `audio`.
     * `sse` is not supported for `tts-1` or `tts-1-hd`.
     */
    stream_format?: 'sse' | 'audio';
}
export declare namespace Speech {
    export { type SpeechModel as SpeechModel, type SpeechCreateParams as SpeechCreateParams };
}
//# sourceMappingURL=speech.d.mts.map