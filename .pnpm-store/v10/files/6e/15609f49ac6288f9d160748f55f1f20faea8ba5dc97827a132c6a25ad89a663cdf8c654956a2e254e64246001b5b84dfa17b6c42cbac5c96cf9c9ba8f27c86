import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { CompletionArgs, CompletionArgs$Outbound } from "./completionargs.js";
import { ConversationInputs, ConversationInputs$Outbound } from "./conversationinputs.js";
export declare const ConversationAppendStreamRequestHandoffExecution: {
    readonly Client: "client";
    readonly Server: "server";
};
export type ConversationAppendStreamRequestHandoffExecution = ClosedEnum<typeof ConversationAppendStreamRequestHandoffExecution>;
export type ConversationAppendStreamRequest = {
    inputs: ConversationInputs;
    stream?: boolean | undefined;
    /**
     * Whether to store the results into our servers or not.
     */
    store?: boolean | undefined;
    handoffExecution?: ConversationAppendStreamRequestHandoffExecution | undefined;
    /**
     * White-listed arguments from the completion API
     */
    completionArgs?: CompletionArgs | undefined;
};
/** @internal */
export declare const ConversationAppendStreamRequestHandoffExecution$inboundSchema: z.ZodNativeEnum<typeof ConversationAppendStreamRequestHandoffExecution>;
/** @internal */
export declare const ConversationAppendStreamRequestHandoffExecution$outboundSchema: z.ZodNativeEnum<typeof ConversationAppendStreamRequestHandoffExecution>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationAppendStreamRequestHandoffExecution$ {
    /** @deprecated use `ConversationAppendStreamRequestHandoffExecution$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
    /** @deprecated use `ConversationAppendStreamRequestHandoffExecution$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Client: "client";
        readonly Server: "server";
    }>;
}
/** @internal */
export declare const ConversationAppendStreamRequest$inboundSchema: z.ZodType<ConversationAppendStreamRequest, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationAppendStreamRequest$Outbound = {
    inputs: ConversationInputs$Outbound;
    stream: boolean;
    store: boolean;
    handoff_execution: string;
    completion_args?: CompletionArgs$Outbound | undefined;
};
/** @internal */
export declare const ConversationAppendStreamRequest$outboundSchema: z.ZodType<ConversationAppendStreamRequest$Outbound, z.ZodTypeDef, ConversationAppendStreamRequest>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationAppendStreamRequest$ {
    /** @deprecated use `ConversationAppendStreamRequest$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationAppendStreamRequest, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationAppendStreamRequest$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationAppendStreamRequest$Outbound, z.ZodTypeDef, ConversationAppendStreamRequest>;
    /** @deprecated use `ConversationAppendStreamRequest$Outbound` instead. */
    type Outbound = ConversationAppendStreamRequest$Outbound;
}
export declare function conversationAppendStreamRequestToJSON(conversationAppendStreamRequest: ConversationAppendStreamRequest): string;
export declare function conversationAppendStreamRequestFromJSON(jsonString: string): SafeParseResult<ConversationAppendStreamRequest, SDKValidationError>;
//# sourceMappingURL=conversationappendstreamrequest.d.ts.map