import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { RealtimeTranscriptionSession, RealtimeTranscriptionSession$Outbound } from "./realtimetranscriptionsession.js";
export type RealtimeTranscriptionSessionCreated = {
    type?: "session.created" | undefined;
    session: RealtimeTranscriptionSession;
};
/** @internal */
export declare const RealtimeTranscriptionSessionCreated$inboundSchema: z.ZodType<RealtimeTranscriptionSessionCreated, z.ZodTypeDef, unknown>;
/** @internal */
export type RealtimeTranscriptionSessionCreated$Outbound = {
    type: "session.created";
    session: RealtimeTranscriptionSession$Outbound;
};
/** @internal */
export declare const RealtimeTranscriptionSessionCreated$outboundSchema: z.ZodType<RealtimeTranscriptionSessionCreated$Outbound, z.ZodTypeDef, RealtimeTranscriptionSessionCreated>;
export declare function realtimeTranscriptionSessionCreatedToJSON(realtimeTranscriptionSessionCreated: RealtimeTranscriptionSessionCreated): string;
export declare function realtimeTranscriptionSessionCreatedFromJSON(jsonString: string): SafeParseResult<RealtimeTranscriptionSessionCreated, SDKValidationError>;
//# sourceMappingURL=realtimetranscriptionsessioncreated.d.ts.map