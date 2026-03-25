import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export declare const AgentConversationObject: {
    readonly Conversation: "conversation";
};
export type AgentConversationObject = ClosedEnum<typeof AgentConversationObject>;
export type AgentConversation = {
    /**
     * Name given to the conversation.
     */
    name?: string | null | undefined;
    /**
     * Description of the what the conversation is about.
     */
    description?: string | null | undefined;
    object?: AgentConversationObject | undefined;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    agentId: string;
};
/** @internal */
export declare const AgentConversationObject$inboundSchema: z.ZodNativeEnum<typeof AgentConversationObject>;
/** @internal */
export declare const AgentConversationObject$outboundSchema: z.ZodNativeEnum<typeof AgentConversationObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentConversationObject$ {
    /** @deprecated use `AgentConversationObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Conversation: "conversation";
    }>;
    /** @deprecated use `AgentConversationObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Conversation: "conversation";
    }>;
}
/** @internal */
export declare const AgentConversation$inboundSchema: z.ZodType<AgentConversation, z.ZodTypeDef, unknown>;
/** @internal */
export type AgentConversation$Outbound = {
    name?: string | null | undefined;
    description?: string | null | undefined;
    object: string;
    id: string;
    created_at: string;
    updated_at: string;
    agent_id: string;
};
/** @internal */
export declare const AgentConversation$outboundSchema: z.ZodType<AgentConversation$Outbound, z.ZodTypeDef, AgentConversation>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AgentConversation$ {
    /** @deprecated use `AgentConversation$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AgentConversation, z.ZodTypeDef, unknown>;
    /** @deprecated use `AgentConversation$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AgentConversation$Outbound, z.ZodTypeDef, AgentConversation>;
    /** @deprecated use `AgentConversation$Outbound` instead. */
    type Outbound = AgentConversation$Outbound;
}
export declare function agentConversationToJSON(agentConversation: AgentConversation): string;
export declare function agentConversationFromJSON(jsonString: string): SafeParseResult<AgentConversation, SDKValidationError>;
//# sourceMappingURL=agentconversation.d.ts.map