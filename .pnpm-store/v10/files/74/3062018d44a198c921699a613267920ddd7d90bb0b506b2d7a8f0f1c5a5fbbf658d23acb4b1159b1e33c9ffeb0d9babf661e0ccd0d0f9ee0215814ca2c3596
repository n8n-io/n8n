import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AgentHandoffEntry, AgentHandoffEntry$Outbound } from "./agenthandoffentry.js";
import { ConversationUsageInfo, ConversationUsageInfo$Outbound } from "./conversationusageinfo.js";
import { FunctionCallEntry, FunctionCallEntry$Outbound } from "./functioncallentry.js";
import { MessageOutputEntry, MessageOutputEntry$Outbound } from "./messageoutputentry.js";
import { ToolExecutionEntry, ToolExecutionEntry$Outbound } from "./toolexecutionentry.js";
export declare const ConversationResponseObject: {
    readonly ConversationResponse: "conversation.response";
};
export type ConversationResponseObject = ClosedEnum<typeof ConversationResponseObject>;
export type Outputs = AgentHandoffEntry | FunctionCallEntry | ToolExecutionEntry | MessageOutputEntry;
/**
 * The response after appending new entries to the conversation.
 */
export type ConversationResponse = {
    object?: ConversationResponseObject | undefined;
    conversationId: string;
    outputs: Array<AgentHandoffEntry | FunctionCallEntry | ToolExecutionEntry | MessageOutputEntry>;
    usage: ConversationUsageInfo;
};
/** @internal */
export declare const ConversationResponseObject$inboundSchema: z.ZodNativeEnum<typeof ConversationResponseObject>;
/** @internal */
export declare const ConversationResponseObject$outboundSchema: z.ZodNativeEnum<typeof ConversationResponseObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationResponseObject$ {
    /** @deprecated use `ConversationResponseObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ConversationResponse: "conversation.response";
    }>;
    /** @deprecated use `ConversationResponseObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ConversationResponse: "conversation.response";
    }>;
}
/** @internal */
export declare const Outputs$inboundSchema: z.ZodType<Outputs, z.ZodTypeDef, unknown>;
/** @internal */
export type Outputs$Outbound = AgentHandoffEntry$Outbound | FunctionCallEntry$Outbound | ToolExecutionEntry$Outbound | MessageOutputEntry$Outbound;
/** @internal */
export declare const Outputs$outboundSchema: z.ZodType<Outputs$Outbound, z.ZodTypeDef, Outputs>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Outputs$ {
    /** @deprecated use `Outputs$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Outputs, z.ZodTypeDef, unknown>;
    /** @deprecated use `Outputs$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Outputs$Outbound, z.ZodTypeDef, Outputs>;
    /** @deprecated use `Outputs$Outbound` instead. */
    type Outbound = Outputs$Outbound;
}
export declare function outputsToJSON(outputs: Outputs): string;
export declare function outputsFromJSON(jsonString: string): SafeParseResult<Outputs, SDKValidationError>;
/** @internal */
export declare const ConversationResponse$inboundSchema: z.ZodType<ConversationResponse, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationResponse$Outbound = {
    object: string;
    conversation_id: string;
    outputs: Array<AgentHandoffEntry$Outbound | FunctionCallEntry$Outbound | ToolExecutionEntry$Outbound | MessageOutputEntry$Outbound>;
    usage: ConversationUsageInfo$Outbound;
};
/** @internal */
export declare const ConversationResponse$outboundSchema: z.ZodType<ConversationResponse$Outbound, z.ZodTypeDef, ConversationResponse>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationResponse$ {
    /** @deprecated use `ConversationResponse$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationResponse, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationResponse$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationResponse$Outbound, z.ZodTypeDef, ConversationResponse>;
    /** @deprecated use `ConversationResponse$Outbound` instead. */
    type Outbound = ConversationResponse$Outbound;
}
export declare function conversationResponseToJSON(conversationResponse: ConversationResponse): string;
export declare function conversationResponseFromJSON(jsonString: string): SafeParseResult<ConversationResponse, SDKValidationError>;
//# sourceMappingURL=conversationresponse.d.ts.map