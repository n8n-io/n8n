import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ContentChunk, ContentChunk$Outbound } from "./contentchunk.js";
export type ToolMessageContent = string | Array<ContentChunk>;
export declare const ToolMessageRole: {
    readonly Tool: "tool";
};
export type ToolMessageRole = ClosedEnum<typeof ToolMessageRole>;
export type ToolMessage = {
    content: string | Array<ContentChunk> | null;
    toolCallId?: string | null | undefined;
    name?: string | null | undefined;
    role?: ToolMessageRole | undefined;
};
/** @internal */
export declare const ToolMessageContent$inboundSchema: z.ZodType<ToolMessageContent, z.ZodTypeDef, unknown>;
/** @internal */
export type ToolMessageContent$Outbound = string | Array<ContentChunk$Outbound>;
/** @internal */
export declare const ToolMessageContent$outboundSchema: z.ZodType<ToolMessageContent$Outbound, z.ZodTypeDef, ToolMessageContent>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolMessageContent$ {
    /** @deprecated use `ToolMessageContent$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ToolMessageContent, z.ZodTypeDef, unknown>;
    /** @deprecated use `ToolMessageContent$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ToolMessageContent$Outbound, z.ZodTypeDef, ToolMessageContent>;
    /** @deprecated use `ToolMessageContent$Outbound` instead. */
    type Outbound = ToolMessageContent$Outbound;
}
export declare function toolMessageContentToJSON(toolMessageContent: ToolMessageContent): string;
export declare function toolMessageContentFromJSON(jsonString: string): SafeParseResult<ToolMessageContent, SDKValidationError>;
/** @internal */
export declare const ToolMessageRole$inboundSchema: z.ZodNativeEnum<typeof ToolMessageRole>;
/** @internal */
export declare const ToolMessageRole$outboundSchema: z.ZodNativeEnum<typeof ToolMessageRole>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolMessageRole$ {
    /** @deprecated use `ToolMessageRole$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly Tool: "tool";
    }>;
    /** @deprecated use `ToolMessageRole$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly Tool: "tool";
    }>;
}
/** @internal */
export declare const ToolMessage$inboundSchema: z.ZodType<ToolMessage, z.ZodTypeDef, unknown>;
/** @internal */
export type ToolMessage$Outbound = {
    content: string | Array<ContentChunk$Outbound> | null;
    tool_call_id?: string | null | undefined;
    name?: string | null | undefined;
    role: string;
};
/** @internal */
export declare const ToolMessage$outboundSchema: z.ZodType<ToolMessage$Outbound, z.ZodTypeDef, ToolMessage>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolMessage$ {
    /** @deprecated use `ToolMessage$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ToolMessage, z.ZodTypeDef, unknown>;
    /** @deprecated use `ToolMessage$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ToolMessage$Outbound, z.ZodTypeDef, ToolMessage>;
    /** @deprecated use `ToolMessage$Outbound` instead. */
    type Outbound = ToolMessage$Outbound;
}
export declare function toolMessageToJSON(toolMessage: ToolMessage): string;
export declare function toolMessageFromJSON(jsonString: string): SafeParseResult<ToolMessage, SDKValidationError>;
//# sourceMappingURL=toolmessage.d.ts.map