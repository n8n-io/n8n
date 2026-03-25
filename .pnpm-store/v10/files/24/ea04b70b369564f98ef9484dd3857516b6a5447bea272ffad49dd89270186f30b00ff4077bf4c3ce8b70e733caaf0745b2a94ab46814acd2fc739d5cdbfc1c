import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const TranscriptionStreamSegmentDeltaType: {
    readonly TranscriptionSegment: "transcription.segment";
};
export type TranscriptionStreamSegmentDeltaType = ClosedEnum<typeof TranscriptionStreamSegmentDeltaType>;
export type TranscriptionStreamSegmentDelta = {
    text: string;
    start: number;
    end: number;
    type?: TranscriptionStreamSegmentDeltaType | undefined;
    additionalProperties?: {
        [k: string]: any;
    };
};
/** @internal */
export declare const TranscriptionStreamSegmentDeltaType$inboundSchema: z.ZodNativeEnum<typeof TranscriptionStreamSegmentDeltaType>;
/** @internal */
export declare const TranscriptionStreamSegmentDeltaType$outboundSchema: z.ZodNativeEnum<typeof TranscriptionStreamSegmentDeltaType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionStreamSegmentDeltaType$ {
    /** @deprecated use `TranscriptionStreamSegmentDeltaType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly TranscriptionSegment: "transcription.segment";
    }>;
    /** @deprecated use `TranscriptionStreamSegmentDeltaType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly TranscriptionSegment: "transcription.segment";
    }>;
}
/** @internal */
export declare const TranscriptionStreamSegmentDelta$inboundSchema: z.ZodType<TranscriptionStreamSegmentDelta, z.ZodTypeDef, unknown>;
/** @internal */
export type TranscriptionStreamSegmentDelta$Outbound = {
    text: string;
    start: number;
    end: number;
    type: string;
    [additionalProperties: string]: unknown;
};
/** @internal */
export declare const TranscriptionStreamSegmentDelta$outboundSchema: z.ZodType<TranscriptionStreamSegmentDelta$Outbound, z.ZodTypeDef, TranscriptionStreamSegmentDelta>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionStreamSegmentDelta$ {
    /** @deprecated use `TranscriptionStreamSegmentDelta$inboundSchema` instead. */
    const inboundSchema: z.ZodType<TranscriptionStreamSegmentDelta, z.ZodTypeDef, unknown>;
    /** @deprecated use `TranscriptionStreamSegmentDelta$outboundSchema` instead. */
    const outboundSchema: z.ZodType<TranscriptionStreamSegmentDelta$Outbound, z.ZodTypeDef, TranscriptionStreamSegmentDelta>;
    /** @deprecated use `TranscriptionStreamSegmentDelta$Outbound` instead. */
    type Outbound = TranscriptionStreamSegmentDelta$Outbound;
}
export declare function transcriptionStreamSegmentDeltaToJSON(transcriptionStreamSegmentDelta: TranscriptionStreamSegmentDelta): string;
export declare function transcriptionStreamSegmentDeltaFromJSON(jsonString: string): SafeParseResult<TranscriptionStreamSegmentDelta, SDKValidationError>;
//# sourceMappingURL=transcriptionstreamsegmentdelta.d.ts.map