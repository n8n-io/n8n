import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { MessageOutputContentChunks, MessageOutputContentChunks$Outbound } from "./messageoutputcontentchunks.js";
export type MessageOutputEntryContent = string | Array<MessageOutputContentChunks>;
export type MessageOutputEntry = {
    object?: "entry" | undefined;
    type?: "message.output" | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    agentId?: string | null | undefined;
    model?: string | null | undefined;
    id?: string | undefined;
    role?: "assistant" | undefined;
    content: string | Array<MessageOutputContentChunks>;
};
/** @internal */
export declare const MessageOutputEntryContent$inboundSchema: z.ZodType<MessageOutputEntryContent, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageOutputEntryContent$Outbound = string | Array<MessageOutputContentChunks$Outbound>;
/** @internal */
export declare const MessageOutputEntryContent$outboundSchema: z.ZodType<MessageOutputEntryContent$Outbound, z.ZodTypeDef, MessageOutputEntryContent>;
export declare function messageOutputEntryContentToJSON(messageOutputEntryContent: MessageOutputEntryContent): string;
export declare function messageOutputEntryContentFromJSON(jsonString: string): SafeParseResult<MessageOutputEntryContent, SDKValidationError>;
/** @internal */
export declare const MessageOutputEntry$inboundSchema: z.ZodType<MessageOutputEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageOutputEntry$Outbound = {
    object: "entry";
    type: "message.output";
    created_at?: string | undefined;
    completed_at?: string | null | undefined;
    agent_id?: string | null | undefined;
    model?: string | null | undefined;
    id?: string | undefined;
    role: "assistant";
    content: string | Array<MessageOutputContentChunks$Outbound>;
};
/** @internal */
export declare const MessageOutputEntry$outboundSchema: z.ZodType<MessageOutputEntry$Outbound, z.ZodTypeDef, MessageOutputEntry>;
export declare function messageOutputEntryToJSON(messageOutputEntry: MessageOutputEntry): string;
export declare function messageOutputEntryFromJSON(jsonString: string): SafeParseResult<MessageOutputEntry, SDKValidationError>;
//# sourceMappingURL=messageoutputentry.d.ts.map