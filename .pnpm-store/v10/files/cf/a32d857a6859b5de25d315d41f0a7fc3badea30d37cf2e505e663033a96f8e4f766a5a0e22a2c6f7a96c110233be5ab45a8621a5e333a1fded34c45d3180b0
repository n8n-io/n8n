import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type TranscriptionStreamTextDelta = {
    type?: "transcription.text.delta" | undefined;
    text: string;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const TranscriptionStreamTextDelta$inboundSchema: z.ZodType<TranscriptionStreamTextDelta, z.ZodTypeDef, unknown>;
/** @internal */
export type TranscriptionStreamTextDelta$Outbound = {
    type: "transcription.text.delta";
    text: string;
    [additionalProperties: string]: unknown;
};
/** @internal */
export declare const TranscriptionStreamTextDelta$outboundSchema: z.ZodType<TranscriptionStreamTextDelta$Outbound, z.ZodTypeDef, TranscriptionStreamTextDelta>;
export declare function transcriptionStreamTextDeltaToJSON(transcriptionStreamTextDelta: TranscriptionStreamTextDelta): string;
export declare function transcriptionStreamTextDeltaFromJSON(jsonString: string): SafeParseResult<TranscriptionStreamTextDelta, SDKValidationError>;
//# sourceMappingURL=transcriptionstreamtextdelta.d.ts.map