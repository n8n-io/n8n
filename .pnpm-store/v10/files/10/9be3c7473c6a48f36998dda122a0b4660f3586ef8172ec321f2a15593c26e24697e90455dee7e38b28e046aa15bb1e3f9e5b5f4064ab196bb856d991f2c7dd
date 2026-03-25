import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ContentChunk, ContentChunk$Outbound } from "./contentchunk.js";
export type UserMessageContent = string | Array<ContentChunk>;
export declare const UserMessageRole: {
    readonly User: "user";
};
export type UserMessageRole = ClosedEnum<typeof UserMessageRole>;
export type UserMessage = {
    content: string | Array<ContentChunk> | null;
    role?: UserMessageRole | undefined;
};
/** @internal */
export declare const UserMessageContent$inboundSchema: z.ZodType<UserMessageContent, z.ZodTypeDef, unknown>;
/** @internal */
export type UserMessageContent$Outbound = string | Array<ContentChunk$Outbound>;
/** @internal */
export declare const UserMessageContent$outboundSchema: z.ZodType<UserMessageContent$Outbound, z.ZodTypeDef, UserMessageContent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace UserMessageContent$ {
    /** @deprecated use `UserMessageContent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<UserMessageContent, z.ZodTypeDef, unknown>;
    /** @deprecated use `UserMessageContent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<UserMessageContent$Outbound, z.ZodTypeDef, UserMessageContent>;
    /** @deprecated use `UserMessageContent$Outbound` instead. */
    type Outbound = UserMessageContent$Outbound;
}
export declare function userMessageContentToJSON(userMessageContent: UserMessageContent): string;
export declare function userMessageContentFromJSON(jsonString: string): SafeParseResult<UserMessageContent, SDKValidationError>;
/** @internal */
export declare const UserMessageRole$inboundSchema: z.ZodNativeEnum<typeof UserMessageRole>;
/** @internal */
export declare const UserMessageRole$outboundSchema: z.ZodNativeEnum<typeof UserMessageRole>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace UserMessageRole$ {
    /** @deprecated use `UserMessageRole$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly User: "user";
    }>;
    /** @deprecated use `UserMessageRole$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly User: "user";
    }>;
}
/** @internal */
export declare const UserMessage$inboundSchema: z.ZodType<UserMessage, z.ZodTypeDef, unknown>;
/** @internal */
export type UserMessage$Outbound = {
    content: string | Array<ContentChunk$Outbound> | null;
    role: string;
};
/** @internal */
export declare const UserMessage$outboundSchema: z.ZodType<UserMessage$Outbound, z.ZodTypeDef, UserMessage>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace UserMessage$ {
    /** @deprecated use `UserMessage$inboundSchema` instead. */
    const inboundSchema: z.ZodType<UserMessage, z.ZodTypeDef, unknown>;
    /** @deprecated use `UserMessage$outboundSchema` instead. */
    const outboundSchema: z.ZodType<UserMessage$Outbound, z.ZodTypeDef, UserMessage>;
    /** @deprecated use `UserMessage$Outbound` instead. */
    type Outbound = UserMessage$Outbound;
}
export declare function userMessageToJSON(userMessage: UserMessage): string;
export declare function userMessageFromJSON(jsonString: string): SafeParseResult<UserMessage, SDKValidationError>;
//# sourceMappingURL=usermessage.d.ts.map