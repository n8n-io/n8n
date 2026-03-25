import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { ConversationInputs, ConversationInputs$Outbound } from "./conversationinputs.js";
export declare const ConversationAppendRequestHandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type ConversationAppendRequestHandoffExecution = ClosedEnum<typeof ConversationAppendRequestHandoffExecution>;
export type ConversationAppendRequest = {
    inputs: ConversationInputs;
    stream?: boolean | undefined;
    /**
     * Whether to store the results into our servers or not.
     */
    store?: boolean | undefined;
    handoffExecution?: ConversationAppendRequestHandoffExecution | undefined;
    /**
     * White-listed arguments from the completion API
     */
    completionArgs?: CompletionArgs | undefined;
};
/** @internal */
export declare const ConversationAppendRequestHandoffExecution$inboundSchema: z.ZodNativeEnum<typeof ConversationAppendRequestHandoffExecution>;
/** @internal */
export declare const ConversationAppendRequestHandoffExecution$outboundSchema: z.ZodNativeEnum<typeof ConversationAppendRequestHandoffExecution>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationAppendRequestHandoffExecution$ {
    /** @deprecated use `ConversationAppendRequestHandoffExecution$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
    /** @deprecated use `ConversationAppendRequestHandoffExecution$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
}
/** @internal */
export declare const ConversationAppendRequest$inboundSchema: z.ZodType<ConversationAppendRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationAppendRequest$Outbound = {
    inputs: ConversationInputs$Outbound;
    stream: boolean;
    store: boolean;
    handoff_execution: string;
    completion_args?: CompletionArgs$Outbound | undefined;
};
/** @internal */
export declare const ConversationAppendRequest$outboundSchema: z.ZodType<ConversationAppendRequest$Outbound, z.ZodTypeDef, ConversationAppendRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationAppendRequest$ {
    /** @deprecated use `ConversationAppendRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationAppendRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationAppendRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationAppendRequest$Outbound, z.ZodTypeDef, ConversationAppendRequest>;
    /** @deprecated use `ConversationAppendRequest$Outbound` instead. */
    type Outbound = ConversationAppendRequest$Outbound;
}
export declare function conversationAppendRequestToJSON(conversationAppendRequest: ConversationAppendRequest): string;
export declare function conversationAppendRequestFromJSON(jsonString: string): SafeParseResult<ConversationAppendRequest, SDKValidationError>;
//# sourceMappingURL=conversationappendrequest.d.ts.map