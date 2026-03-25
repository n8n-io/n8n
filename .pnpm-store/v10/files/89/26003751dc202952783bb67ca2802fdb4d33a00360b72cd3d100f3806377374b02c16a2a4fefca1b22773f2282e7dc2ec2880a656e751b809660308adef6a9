import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { MessageEntries, MessageEntries$Outbound } from "./messageentries.js";
export declare const ConversationMessagesObject: {
    readonly ConversationMessages: "conversation.messages";
};
export type ConversationMessagesObject = ClosedEnum<typeof ConversationMessagesObject>;
/**
 * Similar to the conversation history but only keep the messages
 */
export type ConversationMessages = {
    object?: ConversationMessagesObject | undefined;
    conversationId: string;
    messages: Array<MessageEntries>;
};
/** @internal */
export declare const ConversationMessagesObject$inboundSchema: z.ZodNativeEnum<typeof ConversationMessagesObject>;
/** @internal */
export declare const ConversationMessagesObject$outboundSchema: z.ZodNativeEnum<typeof ConversationMessagesObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationMessagesObject$ {
    /** @deprecated use `ConversationMessagesObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ConversationMessages: "conversation.messages";
    }>;
    /** @deprecated use `ConversationMessagesObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ConversationMessages: "conversation.messages";
    }>;
}
/** @internal */
export declare const ConversationMessages$inboundSchema: z.ZodType<ConversationMessages, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationMessages$Outbound = {
    object: string;
    conversation_id: string;
    messages: Array<MessageEntries$Outbound>;
};
/** @internal */
export declare const ConversationMessages$outboundSchema: z.ZodType<ConversationMessages$Outbound, z.ZodTypeDef, ConversationMessages>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationMessages$ {
    /** @deprecated use `ConversationMessages$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationMessages, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationMessages$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationMessages$Outbound, z.ZodTypeDef, ConversationMessages>;
    /** @deprecated use `ConversationMessages$Outbound` instead. */
    type Outbound = ConversationMessages$Outbound;
}
export declare function conversationMessagesToJSON(conversationMessages: ConversationMessages): string;
export declare function conversationMessagesFromJSON(jsonString: string): SafeParseResult<ConversationMessages, SDKValidationError>;
//# sourceMappingURL=conversationmessages.d.ts.map