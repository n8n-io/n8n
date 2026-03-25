import type { BaseArgs, Options } from "../../types.js";
import type { LegacyAudioInput } from "./utils.js";
export type AudioToAudioArgs = (BaseArgs & {
    /**
     * Binary audio data
     */
    inputs: Blob;
}) | LegacyAudioInput;
export interface AudioToAudioOutputElem {
    /**
     * The label for the audio output (model specific)
     */
    label: string;
    /**
     * Base64 encoded audio output.
     */
    audio: Blob;
}
export interface AudioToAudioOutput {
    blob: string;
    "content-type": string;
    label: string;
}
/**
 * This task reads some audio input and outputs one or multiple audio files.
 * Example model: speechbrain/sepformer-wham does audio source separation.
 */
export declare function audioToAudio(args: AudioToAudioArgs, options?: Options): Promise<AudioToAudioOutput[]>;
//# sourceMappingURL=audioToAudio.d.ts.map