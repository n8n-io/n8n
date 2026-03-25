import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ContentChunk, ContentChunk$Outbound } from "./contentchunk.js";
import { ToolCall, ToolCall$Outbound } from "./toolcall.js";
export type AssistantMessageContent = string | Array<ContentChunk>;
export declare const AssistantMessageRole: {
    readonly Assistant: "assistant";
};
export type AssistantMessageRole = ClosedEnum<typeof AssistantMessageRole>;
export type AssistantMessage = {
    content?: string | Array<ContentChunk> | null | undefined;
    toolCalls?: Array<ToolCall> | null | undefined;
    /**
     * Set this to `true` when adding an assistant message as prefix to condition the model response. The role of the prefix message is to force the model to start its answer by the content of the message.
     */
    prefix?: boolean | undefined;
    role?: AssistantMessageRole | undefined;
};
/** @internal */
export declare const AssistantMessageContent$inboundSchema: z.ZodType<AssistantMessageContent, z.ZodTypeDef, unknown>;
/** @internal */
export type AssistantMessageContent$Outbound = string | Array<ContentChunk$Outbound>;
/** @internal */
export declare const AssistantMessageContent$outboundSchema: z.ZodType<AssistantMessageContent$Outbound, z.ZodTypeDef, AssistantMessageContent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AssistantMessageContent$ {
    /** @deprecated use `AssistantMessageContent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AssistantMessageContent, z.ZodTypeDef, unknown>;
    /** @deprecated use `AssistantMessageContent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AssistantMessageContent$Outbound, z.ZodTypeDef, AssistantMessageContent>;
    /** @deprecated use `AssistantMessageContent$Outbound` instead. */
    type Outbound = AssistantMessageContent$Outbound;
}
export declare function assistantMessageContentToJSON(assistantMessageContent: AssistantMessageContent): string;
export declare function assistantMessageContentFromJSON(jsonString: string): SafeParseResult<AssistantMessageContent, SDKValidationError>;
/** @internal */
export declare const AssistantMessageRole$inboundSchema: z.ZodNativeEnum<typeof AssistantMessageRole>;
/** @internal */
export declare const AssistantMessageRole$outboundSchema: z.ZodNativeEnum<typeof AssistantMessageRole>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AssistantMessageRole$ {
    /** @deprecated use `AssistantMessageRole$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Assistant: "assistant";
    }>;
    /** @deprecated use `AssistantMessageRole$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Assistant: "assistant";
    }>;
}
/** @internal */
export declare const AssistantMessage$inboundSchema: z.ZodType<AssistantMessage, z.ZodTypeDef, unknown>;
/** @internal */
export type AssistantMessage$Outbound = {
    content?: string | Array<ContentChunk$Outbound> | null | undefined;
    tool_calls?: Array<ToolCall$Outbound> | null | undefined;
    prefix: boolean;
    role: string;
};
/** @internal */
export declare const AssistantMessage$outboundSchema: z.ZodType<AssistantMessage$Outbound, z.ZodTypeDef, AssistantMessage>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace AssistantMessage$ {
    /** @deprecated use `AssistantMessage$inboundSchema` instead. */
    const inboundSchema: z.ZodType<AssistantMessage, z.ZodTypeDef, unknown>;
    /** @deprecated use `AssistantMessage$outboundSchema` instead. */
    const outboundSchema: z.ZodType<AssistantMessage$Outbound, z.ZodTypeDef, AssistantMessage>;
    /** @deprecated use `AssistantMessage$Outbound` instead. */
    type Outbound = AssistantMessage$Outbound;
}
export declare function assistantMessageToJSON(assistantMessage: AssistantMessage): string;
export declare function assistantMessageFromJSON(jsonString: string): SafeParseResult<AssistantMessage, SDKValidationError>;
//# sourceMappingURL=assistantmessage.d.ts.map