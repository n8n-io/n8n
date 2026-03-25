import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { MessageOutputContentChunks, MessageOutputContentChunks$Outbound } from "./messageoutputcontentchunks.js";
export declare const MessageOutputEntryObject: {
    readonly Entry: "entry";
};
export type MessageOutputEntryObject = ClosedEnum<typeof MessageOutputEntryObject>;
export declare const MessageOutputEntryType: {
    readonly MessageOutput: "message.output";
};
export type MessageOutputEntryType = ClosedEnum<typeof MessageOutputEntryType>;
export declare const MessageOutputEntryRole: {
    readonly Assistant: "assistant";
};
export type MessageOutputEntryRole = ClosedEnum<typeof MessageOutputEntryRole>;
export type MessageOutputEntryContent = string | Array<MessageOutputContentChunks>;
export type MessageOutputEntry = {
    object?: MessageOutputEntryObject | undefined;
    type?: MessageOutputEntryType | undefined;
    createdAt?: Date | undefined;
    completedAt?: Date | null | undefined;
    id?: string | undefined;
    agentId?: string | null | undefined;
    model?: string | null | undefined;
    role?: MessageOutputEntryRole | undefined;
    content: string | Array<MessageOutputContentChunks>;
};
/** @internal */
export declare const MessageOutputEntryObject$inboundSchema: z.ZodNativeEnum<typeof MessageOutputEntryObject>;
/** @internal */
export declare const MessageOutputEntryObject$outboundSchema: z.ZodNativeEnum<typeof MessageOutputEntryObject>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageOutputEntryObject$ {
    /** @deprecated use `MessageOutputEntryObject$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
    /** @deprecated use `MessageOutputEntryObject$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Entry: "entry";
    }>;
}
/** @internal */
export declare const MessageOutputEntryType$inboundSchema: z.ZodNativeEnum<typeof MessageOutputEntryType>;
/** @internal */
export declare const MessageOutputEntryType$outboundSchema: z.ZodNativeEnum<typeof MessageOutputEntryType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageOutputEntryType$ {
    /** @deprecated use `MessageOutputEntryType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly MessageOutput: "message.output";
    }>;
    /** @deprecated use `MessageOutputEntryType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly MessageOutput: "message.output";
    }>;
}
/** @internal */
export declare const MessageOutputEntryRole$inboundSchema: z.ZodNativeEnum<typeof MessageOutputEntryRole>;
/** @internal */
export declare const MessageOutputEntryRole$outboundSchema: z.ZodNativeEnum<typeof MessageOutputEntryRole>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageOutputEntryRole$ {
    /** @deprecated use `MessageOutputEntryRole$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Assistant: "assistant";
    }>;
    /** @deprecated use `MessageOutputEntryRole$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Assistant: "assistant";
    }>;
}
/** @internal */
export declare const MessageOutputEntryContent$inboundSchema: z.ZodType<MessageOutputEntryContent, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageOutputEntryContent$Outbound = string | Array<MessageOutputContentChunks$Outbound>;
/** @internal */
export declare const MessageOutputEntryContent$outboundSchema: z.ZodType<MessageOutputEntryContent$Outbound, z.ZodTypeDef, MessageOutputEntryContent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageOutputEntryContent$ {
    /** @deprecated use `MessageOutputEntryContent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<MessageOutputEntryContent, z.ZodTypeDef, unknown>;
    /** @deprecated use `MessageOutputEntryContent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<MessageOutputEntryContent$Outbound, z.ZodTypeDef, MessageOutputEntryContent>;
    /** @deprecated use `MessageOutputEntryContent$Outbound` instead. */
    type Outbound = MessageOutputEntryContent$Outbound;
}
export declare function messageOutputEntryContentToJSON(messageOutputEntryContent: MessageOutputEntryContent): string;
export declare function messageOutputEntryContentFromJSON(jsonString: string): SafeParseResult<MessageOutputEntryContent, SDKValidationError>;
/** @internal */
export declare const MessageOutputEntry$inboundSchema: z.ZodType<MessageOutputEntry, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageOutputEntry$Outbound = {
    object: string;
    type: string;
    created_at?: string | undefined;
    completed_at?: string | null | undefined;
    id?: string | undefined;
    agent_id?: string | null | undefined;
    model?: string | null | undefined;
    role: string;
    content: string | Array<MessageOutputContentChunks$Outbound>;
};
/** @internal */
export declare const MessageOutputEntry$outboundSchema: z.ZodType<MessageOutputEntry$Outbound, z.ZodTypeDef, MessageOutputEntry>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageOutputEntry$ {
    /** @deprecated use `MessageOutputEntry$inboundSchema` instead. */
    const inboundSchema: z.ZodType<MessageOutputEntry, z.ZodTypeDef, unknown>;
    /** @deprecated use `MessageOutputEntry$outboundSchema` instead. */
    const outboundSchema: z.ZodType<MessageOutputEntry$Outbound, z.ZodTypeDef, MessageOutputEntry>;
    /** @deprecated use `MessageOutputEntry$Outbound` instead. */
    type Outbound = MessageOutputEntry$Outbound;
}
export declare function messageOutputEntryToJSON(messageOutputEntry: MessageOutputEntry): string;
export declare function messageOutputEntryFromJSON(jsonString: string): SafeParseResult<MessageOutputEntry, SDKValidationError>;
//# sourceMappingURL=messageoutputentry.d.ts.map