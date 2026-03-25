import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { ConversationInputs, ConversationInputs$Outbound } from "./conversationinputs.js";
export declare const ConversationRestartStreamRequestHandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type ConversationRestartStreamRequestHandoffExecution = ClosedEnum<typeof ConversationRestartStreamRequestHandoffExecution>;
/**
 * Request to restart a new conversation from a given entry in the conversation.
 */
export type ConversationRestartStreamRequest = {
    inputs: ConversationInputs;
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
    fromEntryId: string;
};
/** @internal */
export declare const ConversationRestartStreamRequestHandoffExecution$inboundSchema: z.ZodNativeEnum<typeof ConversationRestartStreamRequestHandoffExecution>;
/** @internal */
export declare const ConversationRestartStreamRequestHandoffExecution$outboundSchema: z.ZodNativeEnum<typeof ConversationRestartStreamRequestHandoffExecution>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationRestartStreamRequestHandoffExecution$ {
    /** @deprecated use `ConversationRestartStreamRequestHandoffExecution$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
    /** @deprecated use `ConversationRestartStreamRequestHandoffExecution$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
}
/** @internal */
export declare const ConversationRestartStreamRequest$inboundSchema: z.ZodType<ConversationRestartStreamRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationRestartStreamRequest$Outbound = {
    inputs: ConversationInputs$Outbound;
    stream: boolean;
    store: boolean;
    handoff_execution: string;
    completion_args?: CompletionArgs$Outbound | undefined;
    from_entry_id: string;
};
/** @internal */
export declare const ConversationRestartStreamRequest$outboundSchema: z.ZodType<ConversationRestartStreamRequest$Outbound, z.ZodTypeDef, ConversationRestartStreamRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationRestartStreamRequest$ {
    /** @deprecated use `ConversationRestartStreamRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationRestartStreamRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationRestartStreamRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationRestartStreamRequest$Outbound, z.ZodTypeDef, ConversationRestartStreamRequest>;
    /** @deprecated use `ConversationRestartStreamRequest$Outbound` instead. */
    type Outbound = ConversationRestartStreamRequest$Outbound;
}
export declare function conversationRestartStreamRequestToJSON(conversationRestartStreamRequest: ConversationRestartStreamRequest): string;
export declare function conversationRestartStreamRequestFromJSON(jsonString: string): SafeParseResult<ConversationRestartStreamRequest, SDKValidationError>;
//# sourceMappingURL=conversationrestartstreamrequest.d.ts.map