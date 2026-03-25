import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { ConversationInputs, ConversationInputs$Outbound } from "./conversationinputs.js";
export declare const ConversationRestartRequestHandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type ConversationRestartRequestHandoffExecution = ClosedEnum<typeof ConversationRestartRequestHandoffExecution>;
/**
 * Request to restart a new conversation from a given entry in the conversation.
 */
export type ConversationRestartRequest = {
    inputs: ConversationInputs;
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
    fromEntryId: string;
};
/** @internal */
export declare const ConversationRestartRequestHandoffExecution$inboundSchema: z.ZodNativeEnum<typeof ConversationRestartRequestHandoffExecution>;
/** @internal */
export declare const ConversationRestartRequestHandoffExecution$outboundSchema: z.ZodNativeEnum<typeof ConversationRestartRequestHandoffExecution>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationRestartRequestHandoffExecution$ {
    /** @deprecated use `ConversationRestartRequestHandoffExecution$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
    /** @deprecated use `ConversationRestartRequestHandoffExecution$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
}
/** @internal */
export declare const ConversationRestartRequest$inboundSchema: z.ZodType<ConversationRestartRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationRestartRequest$Outbound = {
    inputs: ConversationInputs$Outbound;
    stream: boolean;
    store: boolean;
    handoff_execution: string;
    completion_args?: CompletionArgs$Outbound | undefined;
    from_entry_id: string;
};
/** @internal */
export declare const ConversationRestartRequest$outboundSchema: z.ZodType<ConversationRestartRequest$Outbound, z.ZodTypeDef, ConversationRestartRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationRestartRequest$ {
    /** @deprecated use `ConversationRestartRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationRestartRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationRestartRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationRestartRequest$Outbound, z.ZodTypeDef, ConversationRestartRequest>;
    /** @deprecated use `ConversationRestartRequest$Outbound` instead. */
    type Outbound = ConversationRestartRequest$Outbound;
}
export declare function conversationRestartRequestToJSON(conversationRestartRequest: ConversationRestartRequest): string;
export declare function conversationRestartRequestFromJSON(jsonString: string): SafeParseResult<ConversationRestartRequest, SDKValidationError>;
//# sourceMappingURL=conversationrestartrequest.d.ts.map