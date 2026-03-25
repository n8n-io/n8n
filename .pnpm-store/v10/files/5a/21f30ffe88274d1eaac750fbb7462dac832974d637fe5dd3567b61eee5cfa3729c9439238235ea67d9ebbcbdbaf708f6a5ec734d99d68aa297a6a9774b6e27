import * as z from "zod";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { ContentChunk, ContentChunk$Outbound } from "./contentchunk.js";
import { ToolCall, ToolCall$Outbound } from "./toolcall.js";
export type Content = string | Array<ContentChunk>;
export type DeltaMessage = {
    role?: string | null | undefined;
    content?: string | Array<ContentChunk> | null | undefined;
    toolCalls?: Array<ToolCall> | null | undefined;
};
/** @internal */
export declare const Content$inboundSchema: z.ZodType<Content, z.ZodTypeDef, unknown>;
/** @internal */
export type Content$Outbound = string | Array<ContentChunk$Outbound>;
/** @internal */
export declare const Content$outboundSchema: z.ZodType<Content$Outbound, z.ZodTypeDef, Content>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace Content$ {
    /** @deprecated use `Content$inboundSchema` instead. */
    const inboundSchema: z.ZodType<Content, z.ZodTypeDef, unknown>;
    /** @deprecated use `Content$outboundSchema` instead. */
    const outboundSchema: z.ZodType<Content$Outbound, z.ZodTypeDef, Content>;
    /** @deprecated use `Content$Outbound` instead. */
    type Outbound = Content$Outbound;
}
export declare function contentToJSON(content: Content): string;
export declare function contentFromJSON(jsonString: string): SafeParseResult<Content, SDKValidationError>;
/** @internal */
export declare const DeltaMessage$inboundSchema: z.ZodType<DeltaMessage, z.ZodTypeDef, unknown>;
/** @internal */
export type DeltaMessage$Outbound = {
    role?: string | null | undefined;
    content?: string | Array<ContentChunk$Outbound> | null | undefined;
    tool_calls?: Array<ToolCall$Outbound> | null | undefined;
};
/** @internal */
export declare const DeltaMessage$outboundSchema: z.ZodType<DeltaMessage$Outbound, z.ZodTypeDef, DeltaMessage>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace DeltaMessage$ {
    /** @deprecated use `DeltaMessage$inboundSchema` instead. */
    const inboundSchema: z.ZodType<DeltaMessage, z.ZodTypeDef, unknown>;
    /** @deprecated use `DeltaMessage$outboundSchema` instead. */
    const outboundSchema: z.ZodType<DeltaMessage$Outbound, z.ZodTypeDef, DeltaMessage>;
    /** @deprecated use `DeltaMessage$Outbound` instead. */
    type Outbound = DeltaMessage$Outbound;
}
export declare function deltaMessageToJSON(deltaMessage: DeltaMessage): string;
export declare function deltaMessageFromJSON(jsonString: string): SafeParseResult<DeltaMessage, SDKValidationError>;
//# sourceMappingURL=deltamessage.d.ts.map