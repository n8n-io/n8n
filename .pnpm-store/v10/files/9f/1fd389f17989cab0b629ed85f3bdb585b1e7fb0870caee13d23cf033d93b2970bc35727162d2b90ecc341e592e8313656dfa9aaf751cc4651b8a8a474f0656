import { APIResource } from "../../resource.js";
import * as Core from "../../core.js";
import { type Response } from "../../_shims/index.js";
export declare class Speech extends APIResource {
    /**
     * Generates audio from the input text.
     */
    create(body: SpeechCreateParams, options?: Core.RequestOptions): Core.APIPromise<Response>;
}
export interface SpeechCreateParams {
    /**
     * The text to generate audio for.
     */
    input: string;
    /**
     * One of the available TTS models
     */
    model: string;
    /**
     * The voice to use when generating the audio.
     */
    voice: string;
    /**
     * The format to audio in. Supported formats are `wav`.
     */
    response_format?: 'wav';
    /**
     * The speed of the generated audio. 1.0 is the only supported value.
     */
    speed?: number;
}
export declare namespace Speech {
    export { type SpeechCreateParams as SpeechCreateParams };
}
//# sourceMappingURL=speech.d.ts.map