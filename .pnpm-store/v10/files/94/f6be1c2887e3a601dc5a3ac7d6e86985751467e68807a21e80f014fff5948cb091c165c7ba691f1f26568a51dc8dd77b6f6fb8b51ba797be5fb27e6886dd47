import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BuiltInConnectors } from "./builtinconnectors.js";
export declare const ToolReferenceChunkType: {
    readonly ToolReference: "tool_reference";
};
export type ToolReferenceChunkType = ClosedEnum<typeof ToolReferenceChunkType>;
export type ToolReferenceChunk = {
    type?: ToolReferenceChunkType | undefined;
    tool: BuiltInConnectors;
    title: string;
    url?: string | null | undefined;
    favicon?: string | null | undefined;
    description?: string | null | undefined;
};
/** @internal */
export declare const ToolReferenceChunkType$inboundSchema: z.ZodNativeEnum<typeof ToolReferenceChunkType>;
/** @internal */
export declare const ToolReferenceChunkType$outboundSchema: z.ZodNativeEnum<typeof ToolReferenceChunkType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolReferenceChunkType$ {
    /** @deprecated use `ToolReferenceChunkType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ToolReference: "tool_reference";
    }>;
    /** @deprecated use `ToolReferenceChunkType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ToolReference: "tool_reference";
    }>;
}
/** @internal */
export declare const ToolReferenceChunk$inboundSchema: z.ZodType<ToolReferenceChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type ToolReferenceChunk$Outbound = {
    type: string;
    tool: string;
    title: string;
    url?: string | null | undefined;
    favicon?: string | null | undefined;
    description?: string | null | undefined;
};
/** @internal */
export declare const ToolReferenceChunk$outboundSchema: z.ZodType<ToolReferenceChunk$Outbound, z.ZodTypeDef, ToolReferenceChunk>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolReferenceChunk$ {
    /** @deprecated use `ToolReferenceChunk$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ToolReferenceChunk, z.ZodTypeDef, unknown>;
    /** @deprecated use `ToolReferenceChunk$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ToolReferenceChunk$Outbound, z.ZodTypeDef, ToolReferenceChunk>;
    /** @deprecated use `ToolReferenceChunk$Outbound` instead. */
    type Outbound = ToolReferenceChunk$Outbound;
}
export declare function toolReferenceChunkToJSON(toolReferenceChunk: ToolReferenceChunk): string;
export declare function toolReferenceChunkFromJSON(jsonString: string): SafeParseResult<ToolReferenceChunk, SDKValidationError>;
//# sourceMappingURL=toolreferencechunk.d.ts.map