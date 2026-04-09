import * as z from "zod/v3";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { MessageInputContentChunks, MessageInputContentChunks$Outbound } from "./messageinputcontentchunks.js";
export declare const Role: {
    readonly Assistant: "assistant";
    readonly User: "user";
};
export type Role = ClosedEnum<typeof Role>;
export type MessageInputEntryContent = string | Array<MessageInputContentChunks>;
/**
 * Representation of an input message inside the conversation.
 */
export type MessageInputEntry = {
    object?: "entry" | undefined;
    type?: "message.input" | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    id?: string | undefined;
    role: Role;
    content: string | Array<MessageInputContentChunks>;
    prefix?: boolean | undefined;
};
/** @internal */
export declare const Role$inboundSchema: z.ZodNativeEnum<typeof Role>;
/** @internal */
export declare const Role$outboundSchema: z.ZodNativeEnum<typeof Role>;
/** @internal */
export declare const MessageInputEntryContent$inboundSchema: z.ZodType<MessageInputEntryContent, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageInputEntryContent$Outbound = string | Array<MessageInputContentChunks$Outbound>;
/** @internal */
export declare const MessageInputEntryContent$outboundSchema: z.ZodType<MessageInputEntryContent$Outbound, z.ZodTypeDef, MessageInputEntryContent>;
export declare function messageInputEntryContentToJSON(messageInputEntryContent: MessageInputEntryContent): string;
export declare function messageInputEntryContentFromJSON(jsonString: string): SafeParseResult<MessageInputEntryContent, SDKValidationError>;
/** @internal */
export declare const MessageInputEntry$inboundSchema: z.ZodType<MessageInputEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageInputEntry$Outbound = {
    object: "entry";
    type: "message.input";
    created_at?: string | undefined;
    completed_at?: string | null | undefined;
    id?: string | undefined;
    role: string;
    content: string | Array<MessageInputContentChunks$Outbound>;
    prefix: boolean;
};
/** @internal */
export declare const MessageInputEntry$outboundSchema: z.ZodType<MessageInputEntry$Outbound, z.ZodTypeDef, MessageInputEntry>;
export declare function messageInputEntryToJSON(messageInputEntry: MessageInputEntry): string;
export declare function messageInputEntryFromJSON(jsonString: string): SafeParseResult<MessageInputEntry, SDKValidationError>;
//# sourceMappingURL=messageinputentry.d.ts.map