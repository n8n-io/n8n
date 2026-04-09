import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AudioFormat, AudioFormat$Outbound } from "./audioformat.js";
export type RealtimeTranscriptionSession = {
    requestId: string;
    model: string;
    audioFormat: AudioFormat;
    targetStreamingDelayMs?: number | null | undefined;
};
/** @internal */
export declare const RealtimeTranscriptionSession$inboundSchema: z.ZodType<RealtimeTranscriptionSession, z.ZodTypeDef, unknown>;
/** @internal */
export type RealtimeTranscriptionSession$Outbound = {
    request_id: string;
    model: string;
    audio_format: AudioFormat$Outbound;
    target_streaming_delay_ms?: number | null | undefined;
};
/** @internal */
export declare const RealtimeTranscriptionSession$outboundSchema: z.ZodType<RealtimeTranscriptionSession$Outbound, z.ZodTypeDef, RealtimeTranscriptionSession>;
export declare function realtimeTranscriptionSessionToJSON(realtimeTranscriptionSession: RealtimeTranscriptionSession): string;
export declare function realtimeTranscriptionSessionFromJSON(jsonString: string): SafeParseResult<RealtimeTranscriptionSession, SDKValidationError>;
//# sourceMappingURL=realtimetranscriptionsession.d.ts.map