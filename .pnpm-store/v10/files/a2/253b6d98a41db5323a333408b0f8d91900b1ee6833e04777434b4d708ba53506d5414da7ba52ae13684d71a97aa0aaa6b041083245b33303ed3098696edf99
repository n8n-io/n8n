import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AgentHandoffEntry, AgentHandoffEntry$Outbound } from "./agenthandoffentry.js";
import { FunctionCallEntry, FunctionCallEntry$Outbound } from "./functioncallentry.js";
import { FunctionResultEntry, FunctionResultEntry$Outbound } from "./functionresultentry.js";
import { MessageInputEntry, MessageInputEntry$Outbound } from "./messageinputentry.js";
import { MessageOutputEntry, MessageOutputEntry$Outbound } from "./messageoutputentry.js";
import { ToolExecutionEntry, ToolExecutionEntry$Outbound } from "./toolexecutionentry.js";
export declare const ConversationHistoryObject: {
    readonly ConversationHistory: "conversation.history";
};
export type ConversationHistoryObject = ClosedEnum<typeof ConversationHistoryObject>;
export type Entries = AgentHandoffEntry | FunctionCallEntry | MessageInputEntry | FunctionResultEntry | ToolExecutionEntry | MessageOutputEntry;
/**
 * Retrieve all entries in a conversation.
 */
export type ConversationHistory = {
    object?: ConversationHistoryObject | undefined;
    conversationId: string;
    entries: Array<AgentHandoffEntry | FunctionCallEntry | MessageInputEntry | FunctionResultEntry | ToolExecutionEntry | MessageOutputEntry>;
};
/** @internal */
export declare const ConversationHistoryObject$inboundSchema: z.ZodNativeEnum<typeof ConversationHistoryObject>;
/** @internal */
export declare const ConversationHistoryObject$outboundSchema: z.ZodNativeEnum<typeof ConversationHistoryObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationHistoryObject$ {
    /** @deprecated use `ConversationHistoryObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ConversationHistory: "conversation.history";
    }>;
    /** @deprecated use `ConversationHistoryObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ConversationHistory: "conversation.history";
    }>;
}
/** @internal */
export declare const Entries$inboundSchema: z.ZodType<Entries, z.ZodTypeDef, unknown>;
/** @internal */
export type Entries$Outbound = AgentHandoffEntry$Outbound | FunctionCallEntry$Outbound | MessageInputEntry$Outbound | FunctionResultEntry$Outbound | ToolExecutionEntry$Outbound | MessageOutputEntry$Outbound;
/** @internal */
export declare const Entries$outboundSchema: z.ZodType<Entries$Outbound, z.ZodTypeDef, Entries>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Entries$ {
    /** @deprecated use `Entries$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Entries, z.ZodTypeDef, unknown>;
    /** @deprecated use `Entries$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Entries$Outbound, z.ZodTypeDef, Entries>;
    /** @deprecated use `Entries$Outbound` instead. */
    type Outbound = Entries$Outbound;
}
export declare function entriesToJSON(entries: Entries): string;
export declare function entriesFromJSON(jsonString: string): SafeParseResult<Entries, SDKValidationError>;
/** @internal */
export declare const ConversationHistory$inboundSchema: z.ZodType<ConversationHistory, z.ZodTypeDef, unknown>;
/** @internal */
export type ConversationHistory$Outbound = {
    object: string;
    conversation_id: string;
    entries: Array<AgentHandoffEntry$Outbound | FunctionCallEntry$Outbound | MessageInputEntry$Outbound | FunctionResultEntry$Outbound | ToolExecutionEntry$Outbound | MessageOutputEntry$Outbound>;
};
/** @internal */
export declare const ConversationHistory$outboundSchema: z.ZodType<ConversationHistory$Outbound, z.ZodTypeDef, ConversationHistory>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ConversationHistory$ {
    /** @deprecated use `ConversationHistory$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ConversationHistory, z.ZodTypeDef, unknown>;
    /** @deprecated use `ConversationHistory$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ConversationHistory$Outbound, z.ZodTypeDef, ConversationHistory>;
    /** @deprecated use `ConversationHistory$Outbound` instead. */
    type Outbound = ConversationHistory$Outbound;
}
export declare function conversationHistoryToJSON(conversationHistory: ConversationHistory): string;
export declare function conversationHistoryFromJSON(jsonString: string): SafeParseResult<ConversationHistory, SDKValidationError>;
//# sourceMappingURL=conversationhistory.d.ts.map