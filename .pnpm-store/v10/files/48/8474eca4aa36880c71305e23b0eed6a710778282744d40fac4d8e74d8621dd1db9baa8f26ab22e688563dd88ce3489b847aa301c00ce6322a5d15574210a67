import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import * as components from "../components/index.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type AgentsApiV1ConversationsGetRequest = {
    /**
     * ID of the conversation from which we are fetching metadata.
     */
    conversationId: string;
};
/**
 * Successful Response
 */
export type AgentsApiV1ConversationsGetResponseV1ConversationsGet = components.ModelConversation | components.AgentConversation;
/** @internal */
export type AgentsApiV1ConversationsGetRequest$Outbound = {
    conversation_id: string;
};
/** @internal */
export declare const AgentsApiV1ConversationsGetRequest$outboundSchema: z.ZodType<AgentsApiV1ConversationsGetRequest$Outbound, z.ZodTypeDef, AgentsApiV1ConversationsGetRequest>;
export declare function agentsApiV1ConversationsGetRequestToJSON(agentsApiV1ConversationsGetRequest: AgentsApiV1ConversationsGetRequest): string;
/** @internal */
export declare const AgentsApiV1ConversationsGetResponseV1ConversationsGet$inboundSchema: z.ZodType<AgentsApiV1ConversationsGetResponseV1ConversationsGet, z.ZodTypeDef, unknown>;
export declare function agentsApiV1ConversationsGetResponseV1ConversationsGetFromJSON(jsonString: string): SafeParseResult<AgentsApiV1ConversationsGetResponseV1ConversationsGet, SDKValidationError>;
//# sourceMappingURL=agentsapiv1conversationsget.d.ts.map