import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AudioFormat, AudioFormat$Outbound } from "./audioformat.js";
export type RealtimeTranscriptionSessionUpdatePayload = {
    /**
     * Set before sending audio. Audio format updates are rejected after audio starts.
     */
    audioFormat?: AudioFormat | null | undefined;
    /**
     * Set before sending audio. Streaming delay updates are rejected after audio starts.
     */
    targetStreamingDelayMs?: number | null | undefined;
};
/** @internal */
export declare const RealtimeTranscriptionSessionUpdatePayload$inboundSchema: z.ZodType<RealtimeTranscriptionSessionUpdatePayload, z.ZodTypeDef, unknown>;
/** @internal */
export type RealtimeTranscriptionSessionUpdatePayload$Outbound = {
    audio_format?: AudioFormat$Outbound | null | undefined;
    target_streaming_delay_ms?: number | null | undefined;
};
/** @internal */
export declare const RealtimeTranscriptionSessionUpdatePayload$outboundSchema: z.ZodType<RealtimeTranscriptionSessionUpdatePayload$Outbound, z.ZodTypeDef, RealtimeTranscriptionSessionUpdatePayload>;
export declare function realtimeTranscriptionSessionUpdatePayloadToJSON(realtimeTranscriptionSessionUpdatePayload: RealtimeTranscriptionSessionUpdatePayload): string;
export declare function realtimeTranscriptionSessionUpdatePayloadFromJSON(jsonString: string): SafeParseResult<RealtimeTranscriptionSessionUpdatePayload, SDKValidationError>;
//# sourceMappingURL=realtimetranscriptionsessionupdatepayload.d.ts.map