import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { TranscriptionSegmentChunk, TranscriptionSegmentChunk$Outbound } from "./transcriptionsegmentchunk.js";
import { UsageInfo, UsageInfo$Outbound } from "./usageinfo.js";
export type TranscriptionStreamDone = {
    model: string;
    text: string;
    segments?: Array<TranscriptionSegmentChunk> | undefined;
    usage: UsageInfo;
    type?: "transcription.done" | undefined;
    language: string | null;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const TranscriptionStreamDone$inboundSchema: z.ZodType<TranscriptionStreamDone, z.ZodTypeDef, unknown>;
/** @internal */
export type TranscriptionStreamDone$Outbound = {
    model: string;
    text: string;
    segments?: Array<TranscriptionSegmentChunk$Outbound> | undefined;
    usage: UsageInfo$Outbound;
    type: "transcription.done";
    language: string | null;
    [additionalProperties: string]: unknown;
};
/** @internal */
export declare const TranscriptionStreamDone$outboundSchema: z.ZodType<TranscriptionStreamDone$Outbound, z.ZodTypeDef, TranscriptionStreamDone>;
export declare function transcriptionStreamDoneToJSON(transcriptionStreamDone: TranscriptionStreamDone): string;
export declare function transcriptionStreamDoneFromJSON(jsonString: string): SafeParseResult<TranscriptionStreamDone, SDKValidationError>;
//# sourceMappingURL=transcriptionstreamdone.d.ts.map