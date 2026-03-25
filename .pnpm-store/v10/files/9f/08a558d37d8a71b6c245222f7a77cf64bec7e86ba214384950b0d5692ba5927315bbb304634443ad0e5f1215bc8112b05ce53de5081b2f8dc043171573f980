import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { TranscriptionSegmentChunk, TranscriptionSegmentChunk$Outbound } from "./transcriptionsegmentchunk.js";
import { UsageInfo, UsageInfo$Outbound } from "./usageinfo.js";
export type TranscriptionResponse = {
    model: string;
    text: string;
    segments?: Array<TranscriptionSegmentChunk> | undefined;
    usage: UsageInfo;
    language: string | null;
    additionalProperties?: {
        [k: string]: any;
    };
};
/** @internal */
export declare const TranscriptionResponse$inboundSchema: z.ZodType<TranscriptionResponse, z.ZodTypeDef, unknown>;
/** @internal */
export type TranscriptionResponse$Outbound = {
    model: string;
    text: string;
    segments?: Array<TranscriptionSegmentChunk$Outbound> | undefined;
    usage: UsageInfo$Outbound;
    language: string | null;
    [additionalProperties: string]: unknown;
};
/** @internal */
export declare const TranscriptionResponse$outboundSchema: z.ZodType<TranscriptionResponse$Outbound, z.ZodTypeDef, TranscriptionResponse>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace TranscriptionResponse$ {
    /** @deprecated use `TranscriptionResponse$inboundSchema` instead. */
    const inboundSchema: z.ZodType<TranscriptionResponse, z.ZodTypeDef, unknown>;
    /** @deprecated use `TranscriptionResponse$outboundSchema` instead. */
    const outboundSchema: z.ZodType<TranscriptionResponse$Outbound, z.ZodTypeDef, TranscriptionResponse>;
    /** @deprecated use `TranscriptionResponse$Outbound` instead. */
    type Outbound = TranscriptionResponse$Outbound;
}
export declare function transcriptionResponseToJSON(transcriptionResponse: TranscriptionResponse): string;
export declare function transcriptionResponseFromJSON(jsonString: string): SafeParseResult<TranscriptionResponse, SDKValidationError>;
//# sourceMappingURL=transcriptionresponse.d.ts.map