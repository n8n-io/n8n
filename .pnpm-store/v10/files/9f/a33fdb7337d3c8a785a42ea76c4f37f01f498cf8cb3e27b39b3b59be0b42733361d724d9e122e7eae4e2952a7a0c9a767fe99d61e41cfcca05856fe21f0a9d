import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type AgentConversationAgentVersion = string | number;
export type AgentConversation = {
    /**
     * Name given to the conversation.
     */
    name?: string | null | undefined;
    /**
     * Description of the what the conversation is about.
     */
    description?: string | null | undefined;
    /**
     * Custom metadata for the conversation.
     */
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    object?: "conversation" | undefined;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    agentId: string;
    agentVersion?: string | number | null | undefined;
};
/** @internal */
export declare const AgentConversationAgentVersion$inboundSchema: z.ZodType<AgentConversationAgentVersion, z.ZodTypeDef, unknown>;
export declare function agentConversationAgentVersionFromJSON(jsonString: string): SafeParseResult<AgentConversationAgentVersion, SDKValidationError>;
/** @internal */
export declare const AgentConversation$inboundSchema: z.ZodType<AgentConversation, z.ZodTypeDef, unknown>;
export declare function agentConversationFromJSON(jsonString: string): SafeParseResult<AgentConversation, SDKValidationError>;
//# sourceMappingURL=agentconversation.d.ts.map