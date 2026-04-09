import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * Human-readable error message.
 */
export type Message = string | {
    [k: string]: any;
};
export type RealtimeTranscriptionErrorDetail = {
    /**
     * Human-readable error message.
     */
    message: string | {
        [k: string]: any;
    };
    /**
     * Internal error code for debugging.
     */
    code: number;
};
/** @internal */
export declare const Message$inboundSchema: z.ZodType<Message, z.ZodTypeDef, unknown>;
/** @internal */
export type Message$Outbound = string | {
    [k: string]: any;
};
/** @internal */
export declare const Message$outboundSchema: z.ZodType<Message$Outbound, z.ZodTypeDef, Message>;
export declare function messageToJSON(message: Message): string;
export declare function messageFromJSON(jsonString: string): SafeParseResult<Message, SDKValidationError>;
/** @internal */
export declare const RealtimeTranscriptionErrorDetail$inboundSchema: z.ZodType<RealtimeTranscriptionErrorDetail, z.ZodTypeDef, unknown>;
/** @internal */
export type RealtimeTranscriptionErrorDetail$Outbound = {
    message: string | {
        [k: string]: any;
    };
    code: number;
};
/** @internal */
export declare const RealtimeTranscriptionErrorDetail$outboundSchema: z.ZodType<RealtimeTranscriptionErrorDetail$Outbound, z.ZodTypeDef, RealtimeTranscriptionErrorDetail>;
export declare function realtimeTranscriptionErrorDetailToJSON(realtimeTranscriptionErrorDetail: RealtimeTranscriptionErrorDetail): string;
export declare function realtimeTranscriptionErrorDetailFromJSON(jsonString: string): SafeParseResult<RealtimeTranscriptionErrorDetail, SDKValidationError>;
//# sourceMappingURL=realtimetranscriptionerrordetail.d.ts.map