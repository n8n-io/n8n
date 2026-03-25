import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const Type: {
    readonly TranscriptionSegment: "transcription_segment";
};
export type Type = ClosedEnum<typeof Type>;
export type TranscriptionSegmentChunk = {
    text: string;
    start: number;
    end: number;
    type?: Type | undefined;
    additionalProperties?: {
        [k: string]: any;
    };
};
/** @internal */
export declare const Type$inboundSchema: z.ZodNativeEnum<typeof Type>;
/** @internal */
export declare const Type$outboundSchema: z.ZodNativeEnum<typeof Type>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Type$ {
    /** @deprecated use `Type$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly TranscriptionSegment: "transcription_segment";
    }>;
    /** @deprecated use `Type$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly TranscriptionSegment: "transcription_segment";
    }>;
}
/** @internal */
export declare const TranscriptionSegmentChunk$inboundSchema: z.ZodType<TranscriptionSegmentChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type TranscriptionSegmentChunk$Outbound = {
    text: string;
    start: number;
    end: number;
    type: string;
    [additionalProperties: string]: unknown;
};
/** @internal */
export declare const TranscriptionSegmentChunk$outboundSchema: z.ZodType<TranscriptionSegmentChunk$Outbound, z.ZodTypeDef, TranscriptionSegmentChunk>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionSegmentChunk$ {
    /** @deprecated use `TranscriptionSegmentChunk$inboundSchema` instead. */
    const inboundSchema: z.ZodType<TranscriptionSegmentChunk, z.ZodTypeDef, unknown>;
    /** @deprecated use `TranscriptionSegmentChunk$outboundSchema` instead. */
    const outboundSchema: z.ZodType<TranscriptionSegmentChunk$Outbound, z.ZodTypeDef, TranscriptionSegmentChunk>;
    /** @deprecated use `TranscriptionSegmentChunk$Outbound` instead. */
    type Outbound = TranscriptionSegmentChunk$Outbound;
}
export declare function transcriptionSegmentChunkToJSON(transcriptionSegmentChunk: TranscriptionSegmentChunk): string;
export declare function transcriptionSegmentChunkFromJSON(jsonString: string): SafeParseResult<TranscriptionSegmentChunk, SDKValidationError>;
//# sourceMappingURL=transcriptionsegmentchunk.d.ts.map