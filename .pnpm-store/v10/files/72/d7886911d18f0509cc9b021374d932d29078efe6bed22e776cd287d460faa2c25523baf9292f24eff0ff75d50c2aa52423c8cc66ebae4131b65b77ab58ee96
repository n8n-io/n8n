import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AudioURL, AudioURL$Outbound } from "./audiourl.js";
export type AudioURLChunkAudioURL = AudioURL | string;
/**
 * Audio URL chunk.
 *
 * @remarks
 *
 * Attributes:
 *     type: The type of the chunk, which is always `ChunkTypes.audio_url`.
 *     audio_url: The URL of the audio file.
 */
export type AudioURLChunk = {
    type?: "audio_url" | undefined;
    audioUrl: AudioURL | string;
};
/** @internal */
export declare const AudioURLChunkAudioURL$inboundSchema: z.ZodType<AudioURLChunkAudioURL, z.ZodTypeDef, unknown>;
/** @internal */
export type AudioURLChunkAudioURL$Outbound = AudioURL$Outbound | string;
/** @internal */
export declare const AudioURLChunkAudioURL$outboundSchema: z.ZodType<AudioURLChunkAudioURL$Outbound, z.ZodTypeDef, AudioURLChunkAudioURL>;
export declare function audioURLChunkAudioURLToJSON(audioURLChunkAudioURL: AudioURLChunkAudioURL): string;
export declare function audioURLChunkAudioURLFromJSON(jsonString: string): SafeParseResult<AudioURLChunkAudioURL, SDKValidationError>;
/** @internal */
export declare const AudioURLChunk$inboundSchema: z.ZodType<AudioURLChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type AudioURLChunk$Outbound = {
    type: "audio_url";
    audio_url: AudioURL$Outbound | string;
};
/** @internal */
export declare const AudioURLChunk$outboundSchema: z.ZodType<AudioURLChunk$Outbound, z.ZodTypeDef, AudioURLChunk>;
export declare function audioURLChunkToJSON(audioURLChunk: AudioURLChunk): string;
export declare function audioURLChunkFromJSON(jsonString: string): SafeParseResult<AudioURLChunk, SDKValidationError>;
//# sourceMappingURL=audiourlchunk.d.ts.map