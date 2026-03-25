import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const AudioChunkType: {
    readonly InputAudio: "input_audio";
};
export type AudioChunkType = ClosedEnum<typeof AudioChunkType>;
export type AudioChunk = {
    inputAudio: string;
    type?: AudioChunkType | undefined;
};
/** @internal */
export declare const AudioChunkType$inboundSchema: z.ZodNativeEnum<typeof AudioChunkType>;
/** @internal */
export declare const AudioChunkType$outboundSchema: z.ZodNativeEnum<typeof AudioChunkType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AudioChunkType$ {
    /** @deprecated use `AudioChunkType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly InputAudio: "input_audio";
    }>;
    /** @deprecated use `AudioChunkType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly InputAudio: "input_audio";
    }>;
}
/** @internal */
export declare const AudioChunk$inboundSchema: z.ZodType<AudioChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type AudioChunk$Outbound = {
    input_audio: string;
    type: string;
};
/** @internal */
export declare const AudioChunk$outboundSchema: z.ZodType<AudioChunk$Outbound, z.ZodTypeDef, AudioChunk>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AudioChunk$ {
    /** @deprecated use `AudioChunk$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AudioChunk, z.ZodTypeDef, unknown>;
    /** @deprecated use `AudioChunk$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AudioChunk$Outbound, z.ZodTypeDef, AudioChunk>;
    /** @deprecated use `AudioChunk$Outbound` instead. */
    type Outbound = AudioChunk$Outbound;
}
export declare function audioChunkToJSON(audioChunk: AudioChunk): string;
export declare function audioChunkFromJSON(jsonString: string): SafeParseResult<AudioChunk, SDKValidationError>;
//# sourceMappingURL=audiochunk.d.ts.map