import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { ConversationInputs, ConversationInputs$Outbound } from "./conversationinputs.js";
import { GuardrailConfig, GuardrailConfig$Outbound } from "./guardrailconfig.js";
export declare const ConversationRestartRequestHandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type ConversationRestartRequestHandoffExecution = ClosedEnum<typeof ConversationRestartRequestHandoffExecution>;
/**
 * Specific version of the agent to use when restarting. If not provided, uses the current version.
 */
export type ConversationRestartRequestAgentVersion = string | number;
/**
 * Request to restart a new conversation from a given entry in the conversation.
 */
export type ConversationRestartRequest = {
    inputs?: ConversationInputs | undefined;
    stream?: boolean | undefined;
    /**
     * Whether to store the results into our servers or not.
     */
    store?: boolean | undefined;
    handoffExecution?: ConversationRestartRequestHandoffExecution | undefined;
    /**
     * White-listed arguments from the completion API
     */
    completionArgs?: CompletionArgs | undefined;
    guardrails?: Array<GuardrailConfig> | null | undefined;
    /**
     * Custom metadata for the conversation.
     */
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    fromEntryId: string;
    /**
     * Specific version of the agent to use when restarting. If not provided, uses the current version.
     */
    agentVersion?: string | number | null | undefined;
};
/** @internal */
export declare const ConversationRestartRequestHandoffExecution$outboundSchema: z.ZodNativeEnum<typeof ConversationRestartRequestHandoffExecution>;
/** @internal */
export type ConversationRestartRequestAgentVersion$Outbound = string | number;
/** @internal */
export declare const ConversationRestartRequestAgentVersion$outboundSchema: z.ZodType<ConversationRestartRequestAgentVersion$Outbound, z.ZodTypeDef, ConversationRestartRequestAgentVersion>;
export declare function conversationRestartRequestAgentVersionToJSON(conversationRestartRequestAgentVersion: ConversationRestartRequestAgentVersion): string;
/** @internal */
export type ConversationRestartRequest$Outbound = {
    inputs?: ConversationInputs$Outbound | undefined;
    stream: boolean;
    store: boolean;
    handoff_execution: string;
    completion_args?: CompletionArgs$Outbound | undefined;
    guardrails?: Array<GuardrailConfig$Outbound> | null | undefined;
    metadata?: {
        [k: string]: any;
    } | null | undefined;
    from_entry_id: string;
    agent_version?: string | number | null | undefined;
};
/** @internal */
export declare const ConversationRestartRequest$outboundSchema: z.ZodType<ConversationRestartRequest$Outbound, z.ZodTypeDef, ConversationRestartRequest>;
export declare function conversationRestartRequestToJSON(conversationRestartRequest: ConversationRestartRequest): string;
//# sourceMappingURL=conversationrestartrequest.d.ts.map