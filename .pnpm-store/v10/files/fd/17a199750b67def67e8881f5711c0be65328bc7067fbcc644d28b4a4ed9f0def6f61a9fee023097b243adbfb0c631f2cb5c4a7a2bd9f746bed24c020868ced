import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { MessageInputContentChunks, MessageInputContentChunks$Outbound } from "./messageinputcontentchunks.js";
export declare const ObjectT: {
    readonly Entry: "entry";
};
export type ObjectT = ClosedEnum<typeof ObjectT>;
export declare const MessageInputEntryType: {
    readonly MessageInput: "message.input";
};
export type MessageInputEntryType = ClosedEnum<typeof MessageInputEntryType>;
export declare const MessageInputEntryRole: {
    readonly Assistant: "assistant";
    readonly User: "user";
};
export type MessageInputEntryRole = ClosedEnum<typeof MessageInputEntryRole>;
export type MessageInputEntryContent = string | Array<MessageInputContentChunks>;
/**
 * Representation of an input message inside the conversation.
 */
export type MessageInputEntry = {
    object?: ObjectT | undefined;
    type?: MessageInputEntryType | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    id?: string | undefined;
    role: MessageInputEntryRole;
    content: string | Array<MessageInputContentChunks>;
    prefix?: boolean | undefined;
};
/** @internal */
export declare const ObjectT$inboundSchema: z.ZodNativeEnum<typeof ObjectT>;
/** @internal */
export declare const ObjectT$outboundSchema: z.ZodNativeEnum<typeof ObjectT>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ObjectT$ {
    /** @deprecated use `ObjectT$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
    /** @deprecated use `ObjectT$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
}
/** @internal */
export declare const MessageInputEntryType$inboundSchema: z.ZodNativeEnum<typeof MessageInputEntryType>;
/** @internal */
export declare const MessageInputEntryType$outboundSchema: z.ZodNativeEnum<typeof MessageInputEntryType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageInputEntryType$ {
    /** @deprecated use `MessageInputEntryType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly MessageInput: "message.input";
    }>;
    /** @deprecated use `MessageInputEntryType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly MessageInput: "message.input";
    }>;
}
/** @internal */
export declare const MessageInputEntryRole$inboundSchema: z.ZodNativeEnum<typeof MessageInputEntryRole>;
/** @internal */
export declare const MessageInputEntryRole$outboundSchema: z.ZodNativeEnum<typeof MessageInputEntryRole>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageInputEntryRole$ {
    /** @deprecated use `MessageInputEntryRole$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Assistant: "assistant";
        readonly User: "user";
    }>;
    /** @deprecated use `MessageInputEntryRole$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Assistant: "assistant";
        readonly User: "user";
    }>;
}
/** @internal */
export declare const MessageInputEntryContent$inboundSchema: z.ZodType<MessageInputEntryContent, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageInputEntryContent$Outbound = string | Array<MessageInputContentChunks$Outbound>;
/** @internal */
export declare const MessageInputEntryContent$outboundSchema: z.ZodType<MessageInputEntryContent$Outbound, z.ZodTypeDef, MessageInputEntryContent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageInputEntryContent$ {
    /** @deprecated use `MessageInputEntryContent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<MessageInputEntryContent, z.ZodTypeDef, unknown>;
    /** @deprecated use `MessageInputEntryContent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<MessageInputEntryContent$Outbound, z.ZodTypeDef, MessageInputEntryContent>;
    /** @deprecated use `MessageInputEntryContent$Outbound` instead. */
    type Outbound = MessageInputEntryContent$Outbound;
}
export declare function messageInputEntryContentToJSON(messageInputEntryContent: MessageInputEntryContent): string;
export declare function messageInputEntryContentFromJSON(jsonString: string): SafeParseResult<MessageInputEntryContent, SDKValidationError>;
/** @internal */
export declare const MessageInputEntry$inboundSchema: z.ZodType<MessageInputEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageInputEntry$Outbound = {
    object: string;
    type: string;
    created_at?: string | undefined;
    completed_at?: string | null | undefined;
    id?: string | undefined;
    role: string;
    content: string | Array<MessageInputContentChunks$Outbound>;
    prefix: boolean;
};
/** @internal */
export declare const MessageInputEntry$outboundSchema: z.ZodType<MessageInputEntry$Outbound, z.ZodTypeDef, MessageInputEntry>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageInputEntry$ {
    /** @deprecated use `MessageInputEntry$inboundSchema` instead. */
    const inboundSchema: z.ZodType<MessageInputEntry, z.ZodTypeDef, unknown>;
    /** @deprecated use `MessageInputEntry$outboundSchema` instead. */
    const outboundSchema: z.ZodType<MessageInputEntry$Outbound, z.ZodTypeDef, MessageInputEntry>;
    /** @deprecated use `MessageInputEntry$Outbound` instead. */
    type Outbound = MessageInputEntry$Outbound;
}
export declare function messageInputEntryToJSON(messageInputEntry: MessageInputEntry): string;
export declare function messageInputEntryFromJSON(jsonString: string): SafeParseResult<MessageInputEntry, SDKValidationError>;
//# sourceMappingURL=messageinputentry.d.ts.map