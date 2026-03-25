import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { OutputContentChunks, OutputContentChunks$Outbound } from "./outputcontentchunks.js";
export declare const MessageOutputEventType: {
    readonly MessageOutputDelta: "message.output.delta";
};
export type MessageOutputEventType = ClosedEnum<typeof MessageOutputEventType>;
export declare const MessageOutputEventRole: {
    readonly Assistant: "assistant";
};
export type MessageOutputEventRole = ClosedEnum<typeof MessageOutputEventRole>;
export type MessageOutputEventContent = string | OutputContentChunks;
export type MessageOutputEvent = {
    type?: MessageOutputEventType | undefined;
    createdAt?: Date | undefined;
    outputIndex?: number | undefined;
    id: string;
    contentIndex?: number | undefined;
    model?: string | null | undefined;
    agentId?: string | null | undefined;
    role?: MessageOutputEventRole | undefined;
    content: string | OutputContentChunks;
};
/** @internal */
export declare const MessageOutputEventType$inboundSchema: z.ZodNativeEnum<typeof MessageOutputEventType>;
/** @internal */
export declare const MessageOutputEventType$outboundSchema: z.ZodNativeEnum<typeof MessageOutputEventType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageOutputEventType$ {
    /** @deprecated use `MessageOutputEventType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly MessageOutputDelta: "message.output.delta";
    }>;
    /** @deprecated use `MessageOutputEventType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly MessageOutputDelta: "message.output.delta";
    }>;
}
/** @internal */
export declare const MessageOutputEventRole$inboundSchema: z.ZodNativeEnum<typeof MessageOutputEventRole>;
/** @internal */
export declare const MessageOutputEventRole$outboundSchema: z.ZodNativeEnum<typeof MessageOutputEventRole>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageOutputEventRole$ {
    /** @deprecated use `MessageOutputEventRole$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Assistant: "assistant";
    }>;
    /** @deprecated use `MessageOutputEventRole$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Assistant: "assistant";
    }>;
}
/** @internal */
export declare const MessageOutputEventContent$inboundSchema: z.ZodType<MessageOutputEventContent, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageOutputEventContent$Outbound = string | OutputContentChunks$Outbound;
/** @internal */
export declare const MessageOutputEventContent$outboundSchema: z.ZodType<MessageOutputEventContent$Outbound, z.ZodTypeDef, MessageOutputEventContent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageOutputEventContent$ {
    /** @deprecated use `MessageOutputEventContent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<MessageOutputEventContent, z.ZodTypeDef, unknown>;
    /** @deprecated use `MessageOutputEventContent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<MessageOutputEventContent$Outbound, z.ZodTypeDef, MessageOutputEventContent>;
    /** @deprecated use `MessageOutputEventContent$Outbound` instead. */
    type Outbound = MessageOutputEventContent$Outbound;
}
export declare function messageOutputEventContentToJSON(messageOutputEventContent: MessageOutputEventContent): string;
export declare function messageOutputEventContentFromJSON(jsonString: string): SafeParseResult<MessageOutputEventContent, SDKValidationError>;
/** @internal */
export declare const MessageOutputEvent$inboundSchema: z.ZodType<MessageOutputEvent, z.ZodTypeDef, unknown>;
/** @internal */
export type MessageOutputEvent$Outbound = {
    type: string;
    created_at?: string | undefined;
    output_index: number;
    id: string;
    content_index: number;
    model?: string | null | undefined;
    agent_id?: string | null | undefined;
    role: string;
    content: string | OutputContentChunks$Outbound;
};
/** @internal */
export declare const MessageOutputEvent$outboundSchema: z.ZodType<MessageOutputEvent$Outbound, z.ZodTypeDef, MessageOutputEvent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace MessageOutputEvent$ {
    /** @deprecated use `MessageOutputEvent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<MessageOutputEvent, z.ZodTypeDef, unknown>;
    /** @deprecated use `MessageOutputEvent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<MessageOutputEvent$Outbound, z.ZodTypeDef, MessageOutputEvent>;
    /** @deprecated use `MessageOutputEvent$Outbound` instead. */
    type Outbound = MessageOutputEvent$Outbound;
}
export declare function messageOutputEventToJSON(messageOutputEvent: MessageOutputEvent): string;
export declare function messageOutputEventFromJSON(jsonString: string): SafeParseResult<MessageOutputEvent, SDKValidationError>;
//# sourceMappingURL=messageoutputevent.d.ts.map