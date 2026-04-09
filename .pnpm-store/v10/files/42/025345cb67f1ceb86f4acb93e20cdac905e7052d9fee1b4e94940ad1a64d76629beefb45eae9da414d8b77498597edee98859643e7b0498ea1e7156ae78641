import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { RealtimeTranscriptionSessionUpdatePayload, RealtimeTranscriptionSessionUpdatePayload$Outbound } from "./realtimetranscriptionsessionupdatepayload.js";
export type RealtimeTranscriptionSessionUpdateMessage = {
    type?: "session.update" | undefined;
    session: RealtimeTranscriptionSessionUpdatePayload;
};
/** @internal */
export declare const RealtimeTranscriptionSessionUpdateMessage$inboundSchema: z.ZodType<RealtimeTranscriptionSessionUpdateMessage, z.ZodTypeDef, unknown>;
/** @internal */
export type RealtimeTranscriptionSessionUpdateMessage$Outbound = {
    type: "session.update";
    session: RealtimeTranscriptionSessionUpdatePayload$Outbound;
};
/** @internal */
export declare const RealtimeTranscriptionSessionUpdateMessage$outboundSchema: z.ZodType<RealtimeTranscriptionSessionUpdateMessage$Outbound, z.ZodTypeDef, RealtimeTranscriptionSessionUpdateMessage>;
export declare function realtimeTranscriptionSessionUpdateMessageToJSON(realtimeTranscriptionSessionUpdateMessage: RealtimeTranscriptionSessionUpdateMessage): string;
export declare function realtimeTranscriptionSessionUpdateMessageFromJSON(jsonString: string): SafeParseResult<RealtimeTranscriptionSessionUpdateMessage, SDKValidationError>;
//# sourceMappingURL=realtimetranscriptionsessionupdatemessage.d.ts.map