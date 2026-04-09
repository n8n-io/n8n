import * as z from "zod/v3";
import { ContentChunk, ContentChunk$Outbound } from "./contentchunk.js";
export type UserMessageContent = string | Array<ContentChunk>;
export type UserMessage = {
    role?: "user" | undefined;
    content: string | Array<ContentChunk> | null;
};
/** @internal */
export type UserMessageContent$Outbound = string | Array<ContentChunk$Outbound>;
/** @internal */
export declare const UserMessageContent$outboundSchema: z.ZodType<UserMessageContent$Outbound, z.ZodTypeDef, UserMessageContent>;
export declare function userMessageContentToJSON(userMessageContent: UserMessageContent): string;
/** @internal */
export type UserMessage$Outbound = {
    role: "user";
    content: string | Array<ContentChunk$Outbound> | null;
};
/** @internal */
export declare const UserMessage$outboundSchema: z.ZodType<UserMessage$Outbound, z.ZodTypeDef, UserMessage>;
export declare function userMessageToJSON(userMessage: UserMessage): string;
//# sourceMappingURL=usermessage.d.ts.map