import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { MessageEntries } from "./messageentries.js";
/**
 * Similar to the conversation history but only keep the messages
 */
export type ConversationMessages = {
    object?: "conversation.messages" | undefined;
    conversationId: string;
    messages: Array<MessageEntries>;
};
/** @internal */
export declare const ConversationMessages$inboundSchema: z.ZodType<ConversationMessages, z.ZodTypeDef, unknown>;
export declare function conversationMessagesFromJSON(jsonString: string): SafeParseResult<ConversationMessages, SDKValidationError>;
//# sourceMappingURL=conversationmessages.d.ts.map