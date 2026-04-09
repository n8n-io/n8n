import { APIResource } from "../../resource.js";
import * as Core from "../../core.js";
import * as TranscriptionsAPI from "./transcriptions.js";
import * as AudioAPI from "./audio.js";
import { Stream } from "../../streaming.js";
export declare class Transcriptions extends APIResource {
    /**
     * Transcribes audio into the input language.
     *
     * @example
     * ```ts
     * const transcription =
     *   await client.audio.transcriptions.create({
     *     file: fs.createReadStream('speech.mp3'),
     *     model: 'gpt-4o-transcribe',
     *   });
     * ```
     */
    create(body: TranscriptionCreateParamsNonStreaming<'json' | undefined>, options?: Core.RequestOptions): Core.APIPromise<Transcription>;
    create(body: TranscriptionCreateParamsNonStreaming<'verbose_json'>, options?: Core.RequestOptions): Core.APIPromise<TranscriptionVerbose>;
    create(body: TranscriptionCreateParamsNonStreaming<'srt' | 'vtt' | 'text'>, options?: Core.RequestOptions): Core.APIPromise<string>;
    create(body: TranscriptionCreateParamsNonStreaming, options?: Core.RequestOptions): Core.APIPromise<Transcription>;
    create(body: TranscriptionCreateParamsStreaming, options?: Core.RequestOptions): Core.APIPromise<Stream<TranscriptionStreamEvent>>;
    create(body: TranscriptionCreateParamsStreaming, options?: Core.RequestOptions): Core.APIPromise<TranscriptionCreateResponse | string | Stream<TranscriptionStreamEvent>>;
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
    /**
     * The log probabilities of the tokens in the transcription. Only returned with the
     * models `gpt-4o-transcribe` and `gpt-4o-mini-transcribe` if `logprobs` is added
     * to the `include` array.
     */
    logprobs?: Array<Transcription.Logprob>;
}
export declare namespace Transcription {
    interface Logprob {
        /**
         * The token in the transcription.
         */
        token?: string;
        /**
         * The bytes of the token.
         */
        bytes?: Array<number>;
        /**
         * The log probability of the token.
         */
        logprob?: number;
    }
}
export type TranscriptionInclude = 'logprobs';
export interface TranscriptionSegment {
    /**
     * Unique identifier of the segment.
     */
    id: number;
    /**
     * Average logprob of the segment. If the value is lower than -1, consider the
     * logprobs failed.
     */
    avg_logprob: number;
    /**
     * Compression ratio of the segment. If the value is greater than 2.4, consider the
     * compression failed.
     */
    compression_ratio: number;
    /**
     * End time of the segment in seconds.
     */
    end: number;
    /**
     * Probability of no speech in the segment. If the value is higher than 1.0 and the
     * `avg_logprob` is below -1, consider this segment silent.
     */
    no_speech_prob: number;
    /**
     * Seek offset of the segment.
     */
    seek: number;
    /**
     * Start time of the segment in seconds.
     */
    start: number;
    /**
     * Temperature parameter used for generating the segment.
     */
    temperature: number;
    /**
     * Text content of the segment.
     */
    text: string;
    /**
     * Array of token IDs for the text content.
     */
    tokens: Array<number>;
}
/**
 * Emitted when there is an additional text delta. This is also the first event
 * emitted when the transcription starts. Only emitted when you
 * [create a transcription](https://platform.openai.com/docs/api-reference/audio/create-transcription)
 * with the `Stream` parameter set to `true`.
 */
export type TranscriptionStreamEvent = TranscriptionTextDeltaEvent | TranscriptionTextDoneEvent;
/**
 * Emitted when there is an additional text delta. This is also the first event
 * emitted when the transcription starts. Only emitted when you
 * [create a transcription](https://platform.openai.com/docs/api-reference/audio/create-transcription)
 * with the `Stream` parameter set to `true`.
 */
export interface TranscriptionTextDeltaEvent {
    /**
     * The text delta that was additionally transcribed.
     */
    delta: string;
    /**
     * The type of the event. Always `transcript.text.delta`.
     */
    type: 'transcript.text.delta';
    /**
     * The log probabilities of the delta. Only included if you
     * [create a transcription](https://platform.openai.com/docs/api-reference/audio/create-transcription)
     * with the `include[]` parameter set to `logprobs`.
     */
    logprobs?: Array<TranscriptionTextDeltaEvent.Logprob>;
}
export declare namespace TranscriptionTextDeltaEvent {
    interface Logprob {
        /**
         * The token that was used to generate the log probability.
         */
        token?: string;
        /**
         * The bytes that were used to generate the log probability.
         */
        bytes?: Array<unknown>;
        /**
         * The log probability of the token.
         */
        logprob?: number;
    }
}
/**
 * Emitted when the transcription is complete. Contains the complete transcription
 * text. Only emitted when you
 * [create a transcription](https://platform.openai.com/docs/api-reference/audio/create-transcription)
 * with the `Stream` parameter set to `true`.
 */
export interface TranscriptionTextDoneEvent {
    /**
     * The text that was transcribed.
     */
    text: string;
    /**
     * The type of the event. Always `transcript.text.done`.
     */
    type: 'transcript.text.done';
    /**
     * The log probabilities of the individual tokens in the transcription. Only
     * included if you
     * [create a transcription](https://platform.openai.com/docs/api-reference/audio/create-transcription)
     * with the `include[]` parameter set to `logprobs`.
     */
    logprobs?: Array<TranscriptionTextDoneEvent.Logprob>;
}
export declare namespace TranscriptionTextDoneEvent {
    interface Logprob {
        /**
         * The token that was used to generate the log probability.
         */
        token?: string;
        /**
         * The bytes that were used to generate the log probability.
         */
        bytes?: Array<unknown>;
        /**
         * The log probability of the token.
         */
        logprob?: number;
    }
}
/**
 * Represents a verbose json transcription response returned by model, based on the
 * provided input.
 */
export interface TranscriptionVerbose {
    /**
     * The duration of the input audio.
     */
    duration: number;
    /**
     * The language of the input audio.
     */
    language: string;
    /**
     * The transcribed text.
     */
    text: string;
    /**
     * Segments of the transcribed text and their corresponding details.
     */
    segments?: Array<TranscriptionSegment>;
    /**
     * Extracted words and their corresponding timestamps.
     */
    words?: Array<TranscriptionWord>;
}
export interface TranscriptionWord {
    /**
     * End time of the word in seconds.
     */
    end: number;
    /**
     * Start time of the word in seconds.
     */
    start: number;
    /**
     * The text content of the word.
     */
    word: string;
}
/**
 * Represents a transcription response returned by model, based on the provided
 * input.
 */
export type TranscriptionCreateResponse = Transcription | TranscriptionVerbose;
export type TranscriptionCreateParams<ResponseFormat extends AudioAPI.AudioResponseFormat | undefined = AudioAPI.AudioResponseFormat | undefined> = TranscriptionCreateParamsNonStreaming<ResponseFormat> | TranscriptionCreateParamsStreaming;
export interface TranscriptionCreateParamsBase<ResponseFormat extends AudioAPI.AudioResponseFormat | undefined = AudioAPI.AudioResponseFormat | undefined> {
    /**
     * The audio file object (not file name) to transcribe, in one of these formats:
     * flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm.
     */
    file: Core.Uploadable;
    /**
     * ID of the model to use. The options are `gpt-4o-transcribe`,
     * `gpt-4o-mini-transcribe`, and `whisper-1` (which is powered by our open source
     * Whisper V2 model).
     */
    model: (string & {}) | AudioAPI.AudioModel;
    /**
     * Controls how the audio is cut into chunks. When set to `"auto"`, the server
     * first normalizes loudness and then uses voice activity detection (VAD) to choose
     * boundaries. `server_vad` object can be provided to tweak VAD detection
     * parameters manually. If unset, the audio is transcribed as a single block.
     */
    chunking_strategy?: 'auto' | TranscriptionCreateParams.VadConfig | null;
    /**
     * Additional information to include in the transcription response. `logprobs` will
     * return the log probabilities of the tokens in the response to understand the
     * model's confidence in the transcription. `logprobs` only works with
     * response_format set to `json` and only with the models `gpt-4o-transcribe` and
     * `gpt-4o-mini-transcribe`.
     */
    include?: Array<TranscriptionInclude>;
    /**
     * The language of the input audio. Supplying the input language in
     * [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (e.g. `en`)
     * format will improve accuracy and latency.
     */
    language?: string;
    /**
     * An optional text to guide the model's style or continue a previous audio
     * segment. The
     * [prompt](https://platform.openai.com/docs/guides/speech-to-text#prompting)
     * should match the audio language.
     */
    prompt?: string;
    /**
     * The format of the output, in one of these options: `json`, `text`, `srt`,
     * `verbose_json`, or `vtt`. For `gpt-4o-transcribe` and `gpt-4o-mini-transcribe`,
     * the only supported format is `json`.
     */
    response_format?: ResponseFormat;
    /**
     * If set to true, the model response data will be streamed to the client as it is
     * generated using
     * [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
     * See the
     * [Streaming section of the Speech-to-Text guide](https://platform.openai.com/docs/guides/speech-to-text?lang=curl#streaming-transcriptions)
     * for more information.
     *
     * Note: Streaming is not supported for the `whisper-1` model and will be ignored.
     */
    stream?: boolean | null;
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
}
export declare namespace TranscriptionCreateParams {
    interface VadConfig {
        /**
         * Must be set to `server_vad` to enable manual chunking using server side VAD.
         */
        type: 'server_vad';
        /**
         * Amount of audio to include before the VAD detected speech (in milliseconds).
         */
        prefix_padding_ms?: number;
        /**
         * Duration of silence to detect speech stop (in milliseconds). With shorter values
         * the model will respond more quickly, but may jump in on short pauses from the
         * user.
         */
        silence_duration_ms?: number;
        /**
         * Sensitivity threshold (0.0 to 1.0) for voice activity detection. A higher
         * threshold will require louder audio to activate the model, and thus might
         * perform better in noisy environments.
         */
        threshold?: number;
    }
    type TranscriptionCreateParamsNonStreaming = TranscriptionsAPI.TranscriptionCreateParamsNonStreaming;
    type TranscriptionCreateParamsStreaming = TranscriptionsAPI.TranscriptionCreateParamsStreaming;
}
export interface TranscriptionCreateParamsNonStreaming<ResponseFormat extends AudioAPI.AudioResponseFormat | undefined = AudioAPI.AudioResponseFormat | undefined> extends TranscriptionCreateParamsBase<ResponseFormat> {
    /**
     * If set to true, the model response data will be streamed to the client as it is
     * generated using
     * [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
     * See the
     * [Streaming section of the Speech-to-Text guide](https://platform.openai.com/docs/guides/speech-to-text?lang=curl#streaming-transcriptions)
     * for more information.
     *
     * Note: Streaming is not supported for the `whisper-1` model and will be ignored.
     */
    stream?: false | null;
}
export interface TranscriptionCreateParamsStreaming extends TranscriptionCreateParamsBase {
    /**
     * If set to true, the model response data will be streamed to the client as it is
     * generated using
     * [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
     * See the
     * [Streaming section of the Speech-to-Text guide](https://platform.openai.com/docs/guides/speech-to-text?lang=curl#streaming-transcriptions)
     * for more information.
     *
     * Note: Streaming is not supported for the `whisper-1` model and will be ignored.
     */
    stream: true;
}
export declare namespace Transcriptions {
    export { type Transcription as Transcription, type TranscriptionInclude as TranscriptionInclude, type TranscriptionSegment as TranscriptionSegment, type TranscriptionStreamEvent as TranscriptionStreamEvent, type TranscriptionTextDeltaEvent as TranscriptionTextDeltaEvent, type TranscriptionTextDoneEvent as TranscriptionTextDoneEvent, type TranscriptionVerbose as TranscriptionVerbose, type TranscriptionWord as TranscriptionWord, type TranscriptionCreateResponse as TranscriptionCreateResponse, type TranscriptionCreateParams as TranscriptionCreateParams, type TranscriptionCreateParamsNonStreaming as TranscriptionCreateParamsNonStreaming, type TranscriptionCreateParamsStreaming as TranscriptionCreateParamsStreaming, };
}
//# sourceMappingURL=transcriptions.d.ts.map