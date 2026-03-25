import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type AgentsApiV1ConversationsAppendStreamRequest = {
    /**
     * ID of the conversation to which we append entries.
     */
    conversationId: string;
    conversationAppendStreamRequest: components.ConversationAppendStreamRequest;
};
/** @internal */
export declare const AgentsApiV1ConversationsAppendStreamRequest$inboundSchema: z.ZodType<AgentsApiV1ConversationsAppendStreamRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsApiV1ConversationsAppendStreamRequest$Outbound = {
    conversation_id: string;
    ConversationAppendStreamRequest: components.ConversationAppendStreamRequest$Outbound;
};
/** @internal */
export declare const AgentsApiV1ConversationsAppendStreamRequest$outboundSchema: z.ZodType<AgentsApiV1ConversationsAppendStreamRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsAppendStreamRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsApiV1ConversationsAppendStreamRequest$ {
    /** @deprecated use `AgentsApiV1ConversationsAppendStreamRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsApiV1ConversationsAppendStreamRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsApiV1ConversationsAppendStreamRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsApiV1ConversationsAppendStreamRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsAppendStreamRequest>;
    /** @deprecated use `AgentsApiV1ConversationsAppendStreamRequest$Outbound` instead. */
    type Outbound = AgentsApiV1ConversationsAppendStreamRequest$Outbound;
}
export declare function agentsApiV1ConversationsAppendStreamRequestToJSON(agentsApiV1ConversationsAppendStreamRequest: AgentsApiV1ConversationsAppendStreamRequest): string;
export declare function agentsApiV1ConversationsAppendStreamRequestFromJSON(jsonString: string): SafeParseResult<AgentsApiV1ConversationsAppendStreamRequest, SDKValidationError>;
//# sourceMappingURL=agentsapiv1conversationsappendstream.d.ts.map