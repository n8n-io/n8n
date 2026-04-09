import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { RealtimeTranscriptionSession, RealtimeTranscriptionSession$Outbound } from "./realtimetranscriptionsession.js";
export type RealtimeTranscriptionSessionUpdated = {
    type?: "session.updated" | undefined;
    session: RealtimeTranscriptionSession;
};
/** @internal */
export declare const RealtimeTranscriptionSessionUpdated$inboundSchema: z.ZodType<RealtimeTranscriptionSessionUpdated, z.ZodTypeDef, unknown>;
/** @internal */
export type RealtimeTranscriptionSessionUpdated$Outbound = {
    type: "session.updated";
    session: RealtimeTranscriptionSession$Outbound;
};
/** @internal */
export declare const RealtimeTranscriptionSessionUpdated$outboundSchema: z.ZodType<RealtimeTranscriptionSessionUpdated$Outbound, z.ZodTypeDef, RealtimeTranscriptionSessionUpdated>;
export declare function realtimeTranscriptionSessionUpdatedToJSON(realtimeTranscriptionSessionUpdated: RealtimeTranscriptionSessionUpdated): string;
export declare function realtimeTranscriptionSessionUpdatedFromJSON(jsonString: string): SafeParseResult<RealtimeTranscriptionSessionUpdated, SDKValidationError>;
//# sourceMappingURL=realtimetranscriptionsessionupdated.d.ts.map