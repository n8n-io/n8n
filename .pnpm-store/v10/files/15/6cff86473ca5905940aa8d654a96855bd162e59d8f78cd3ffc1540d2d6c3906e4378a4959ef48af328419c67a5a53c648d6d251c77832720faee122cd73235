import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type TranscriptionStreamSegmentDelta = {
    type?: "transcription.segment" | undefined;
    text: string;
    start: number;
    end: number;
    speakerId?: string | null | undefined;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const TranscriptionStreamSegmentDelta$inboundSchema: z.ZodType<TranscriptionStreamSegmentDelta, z.ZodTypeDef, unknown>;
export declare function transcriptionStreamSegmentDeltaFromJSON(jsonString: string): SafeParseResult<TranscriptionStreamSegmentDelta, SDKValidationError>;
//# sourceMappingURL=transcriptionstreamsegmentdelta.d.ts.map