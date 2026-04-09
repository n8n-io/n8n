import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type ConversationPayload = {
    messages: Array<{
        [k: string]: any;
    }>;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const ConversationPayload$inboundSchema: z.ZodType<ConversationPayload, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationPayload$Outbound = {
    messages: Array<{
        [k: string]: any;
    }>;
    [additionalProperties: string]: unknown;
};
/** @internal */
export declare const ConversationPayload$outboundSchema: z.ZodType<ConversationPayload$Outbound, z.ZodTypeDef, ConversationPayload>;
export declare function conversationPayloadToJSON(conversationPayload: ConversationPayload): string;
export declare function conversationPayloadFromJSON(jsonString: string): SafeParseResult<ConversationPayload, SDKValidationError>;
//# sourceMappingURL=conversationpayload.d.ts.map