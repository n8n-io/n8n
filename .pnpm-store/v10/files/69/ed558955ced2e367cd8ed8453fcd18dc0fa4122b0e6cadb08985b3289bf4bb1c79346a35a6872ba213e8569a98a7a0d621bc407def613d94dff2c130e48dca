import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type AgentsApiV1ConversationsAppendRequest = {
    /**
     * ID of the conversation to which we append entries.
     */
    conversationId: string;
    conversationAppendRequest: components.ConversationAppendRequest;
};
/** @internal */
export declare const AgentsApiV1ConversationsAppendRequest$inboundSchema: z.ZodType<AgentsApiV1ConversationsAppendRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsApiV1ConversationsAppendRequest$Outbound = {
    conversation_id: string;
    ConversationAppendRequest: components.ConversationAppendRequest$Outbound;
};
/** @internal */
export declare const AgentsApiV1ConversationsAppendRequest$outboundSchema: z.ZodType<AgentsApiV1ConversationsAppendRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsAppendRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsApiV1ConversationsAppendRequest$ {
    /** @deprecated use `AgentsApiV1ConversationsAppendRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsApiV1ConversationsAppendRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsApiV1ConversationsAppendRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsApiV1ConversationsAppendRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsAppendRequest>;
    /** @deprecated use `AgentsApiV1ConversationsAppendRequest$Outbound` instead. */
    type Outbound = AgentsApiV1ConversationsAppendRequest$Outbound;
}
export declare function agentsApiV1ConversationsAppendRequestToJSON(agentsApiV1ConversationsAppendRequest: AgentsApiV1ConversationsAppendRequest): string;
export declare function agentsApiV1ConversationsAppendRequestFromJSON(jsonString: string): SafeParseResult<AgentsApiV1ConversationsAppendRequest, SDKValidationError>;
//# sourceMappingURL=agentsapiv1conversationsappend.d.ts.map