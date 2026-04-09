import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { ConversationInputs, ConversationInputs$Outbound } from "./conversationinputs.js";
import { GuardrailConfig, GuardrailConfig$Outbound } from "./guardrailconfig.js";
export declare const ConversationRestartStreamRequestHandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type ConversationRestartStreamRequestHandoffExecution = ClosedEnum<typeof ConversationRestartStreamRequestHandoffExecution>;
/**
 * Specific version of the agent to use when restarting. If not provided, uses the current version.
 */
export type ConversationRestartStreamRequestAgentVersion = string | number;
/**
 * Request to restart a new conversation from a given entry in the conversation.
 */
export type ConversationRestartStreamRequest = {
    inputs?: ConversationInputs | undefined;
    stream?: boolean | undefined;
    /**
     * Whether to store the results into our servers or not.
     */
    store?: boolean | undefined;
    handoffExecution?: ConversationRestartStreamRequestHandoffExecution | undefined;
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
export declare const ConversationRestartStreamRequestHandoffExecution$outboundSchema: z.ZodNativeEnum<typeof ConversationRestartStreamRequestHandoffExecution>;
/** @internal */
export type ConversationRestartStreamRequestAgentVersion$Outbound = string | number;
/** @internal */
export declare const ConversationRestartStreamRequestAgentVersion$outboundSchema: z.ZodType<ConversationRestartStreamRequestAgentVersion$Outbound, z.ZodTypeDef, ConversationRestartStreamRequestAgentVersion>;
export declare function conversationRestartStreamRequestAgentVersionToJSON(conversationRestartStreamRequestAgentVersion: ConversationRestartStreamRequestAgentVersion): string;
/** @internal */
export type ConversationRestartStreamRequest$Outbound = {
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
export declare const ConversationRestartStreamRequest$outboundSchema: z.ZodType<ConversationRestartStreamRequest$Outbound, z.ZodTypeDef, ConversationRestartStreamRequest>;
export declare function conversationRestartStreamRequestToJSON(conversationRestartStreamRequest: ConversationRestartStreamRequest): string;
//# sourceMappingURL=conversationrestartstreamrequest.d.ts.map