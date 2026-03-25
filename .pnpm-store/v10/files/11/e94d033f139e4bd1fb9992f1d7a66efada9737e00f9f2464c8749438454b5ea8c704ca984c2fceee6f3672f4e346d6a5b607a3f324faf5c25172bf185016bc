import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type AgentsApiV1ConversationsRestartRequest = {
    /**
     * ID of the original conversation which is being restarted.
     */
    conversationId: string;
    conversationRestartRequest: components.ConversationRestartRequest;
};
/** @internal */
export declare const AgentsApiV1ConversationsRestartRequest$inboundSchema: z.ZodType<AgentsApiV1ConversationsRestartRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsApiV1ConversationsRestartRequest$Outbound = {
    conversation_id: string;
    ConversationRestartRequest: components.ConversationRestartRequest$Outbound;
};
/** @internal */
export declare const AgentsApiV1ConversationsRestartRequest$outboundSchema: z.ZodType<AgentsApiV1ConversationsRestartRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsRestartRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsApiV1ConversationsRestartRequest$ {
    /** @deprecated use `AgentsApiV1ConversationsRestartRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsApiV1ConversationsRestartRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsApiV1ConversationsRestartRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsApiV1ConversationsRestartRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsRestartRequest>;
    /** @deprecated use `AgentsApiV1ConversationsRestartRequest$Outbound` instead. */
    type Outbound = AgentsApiV1ConversationsRestartRequest$Outbound;
}
export declare function agentsApiV1ConversationsRestartRequestToJSON(agentsApiV1ConversationsRestartRequest: AgentsApiV1ConversationsRestartRequest): string;
export declare function agentsApiV1ConversationsRestartRequestFromJSON(jsonString: string): SafeParseResult<AgentsApiV1ConversationsRestartRequest, SDKValidationError>;
//# sourceMappingURL=agentsapiv1conversationsrestart.d.ts.map