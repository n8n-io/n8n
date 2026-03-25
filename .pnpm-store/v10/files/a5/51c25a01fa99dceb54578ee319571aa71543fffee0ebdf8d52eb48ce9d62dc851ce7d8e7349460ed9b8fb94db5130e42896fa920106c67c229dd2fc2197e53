import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { TranscriptionSegmentChunk, TranscriptionSegmentChunk$Outbound } from "./transcriptionsegmentchunk.js";
import { UsageInfo, UsageInfo$Outbound } from "./usageinfo.js";
export declare const TranscriptionStreamDoneType: {
    readonly TranscriptionDone: "transcription.done";
};
export type TranscriptionStreamDoneType = ClosedEnum<typeof TranscriptionStreamDoneType>;
export type TranscriptionStreamDone = {
    model: string;
    text: string;
    segments?: Array<TranscriptionSegmentChunk> | undefined;
    usage: UsageInfo;
    type?: TranscriptionStreamDoneType | undefined;
    language: string | null;
    additionalProperties?: {
        [k: string]: any;
    };
};
/** @internal */
export declare const TranscriptionStreamDoneType$inboundSchema: z.ZodNativeEnum<typeof TranscriptionStreamDoneType>;
/** @internal */
export declare const TranscriptionStreamDoneType$outboundSchema: z.ZodNativeEnum<typeof TranscriptionStreamDoneType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionStreamDoneType$ {
    /** @deprecated use `TranscriptionStreamDoneType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly TranscriptionDone: "transcription.done";
    }>;
    /** @deprecated use `TranscriptionStreamDoneType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly TranscriptionDone: "transcription.done";
    }>;
}
/** @internal */
export declare const TranscriptionStreamDone$inboundSchema: z.ZodType<TranscriptionStreamDone, z.ZodTypeDef, unknown>;
/** @internal */
export type TranscriptionStreamDone$Outbound = {
    model: string;
    text: string;
    segments?: Array<TranscriptionSegmentChunk$Outbound> | undefined;
    usage: UsageInfo$Outbound;
    type: string;
    language: string | null;
    [additionalProperties: string]: unknown;
};
/** @internal */
export declare const TranscriptionStreamDone$outboundSchema: z.ZodType<TranscriptionStreamDone$Outbound, z.ZodTypeDef, TranscriptionStreamDone>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionStreamDone$ {
    /** @deprecated use `TranscriptionStreamDone$inboundSchema` instead. */
    const inboundSchema: z.ZodType<TranscriptionStreamDone, z.ZodTypeDef, unknown>;
    /** @deprecated use `TranscriptionStreamDone$outboundSchema` instead. */
    const outboundSchema: z.ZodType<TranscriptionStreamDone$Outbound, z.ZodTypeDef, TranscriptionStreamDone>;
    /** @deprecated use `TranscriptionStreamDone$Outbound` instead. */
    type Outbound = TranscriptionStreamDone$Outbound;
}
export declare function transcriptionStreamDoneToJSON(transcriptionStreamDone: TranscriptionStreamDone): string;
export declare function transcriptionStreamDoneFromJSON(jsonString: string): SafeParseResult<TranscriptionStreamDone, SDKValidationError>;
//# sourceMappingURL=transcriptionstreamdone.d.ts.map