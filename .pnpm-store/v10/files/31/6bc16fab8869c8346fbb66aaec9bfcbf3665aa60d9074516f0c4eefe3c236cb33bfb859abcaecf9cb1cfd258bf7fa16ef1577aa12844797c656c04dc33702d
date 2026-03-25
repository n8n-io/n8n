import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type AgentsApiV1ConversationsRestartStreamRequest = {
    /**
     * ID of the original conversation which is being restarted.
     */
    conversationId: string;
    conversationRestartStreamRequest: components.ConversationRestartStreamRequest;
};
/** @internal */
export declare const AgentsApiV1ConversationsRestartStreamRequest$inboundSchema: z.ZodType<AgentsApiV1ConversationsRestartStreamRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentsApiV1ConversationsRestartStreamRequest$Outbound = {
    conversation_id: string;
    ConversationRestartStreamRequest: components.ConversationRestartStreamRequest$Outbound;
};
/** @internal */
export declare const AgentsApiV1ConversationsRestartStreamRequest$outboundSchema: z.ZodType<AgentsApiV1ConversationsRestartStreamRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsRestartStreamRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentsApiV1ConversationsRestartStreamRequest$ {
    /** @deprecated use `AgentsApiV1ConversationsRestartStreamRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentsApiV1ConversationsRestartStreamRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentsApiV1ConversationsRestartStreamRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentsApiV1ConversationsRestartStreamRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsRestartStreamRequest>;
    /** @deprecated use `AgentsApiV1ConversationsRestartStreamRequest$Outbound` instead. */
    type Outbound = AgentsApiV1ConversationsRestartStreamRequest$Outbound;
}
export declare function agentsApiV1ConversationsRestartStreamRequestToJSON(agentsApiV1ConversationsRestartStreamRequest: AgentsApiV1ConversationsRestartStreamRequest): string;
export declare function agentsApiV1ConversationsRestartStreamRequestFromJSON(jsonString: string): SafeParseResult<AgentsApiV1ConversationsRestartStreamRequest, SDKValidationError>;
//# sourceMappingURL=agentsapiv1conversationsrestartstream.d.ts.map