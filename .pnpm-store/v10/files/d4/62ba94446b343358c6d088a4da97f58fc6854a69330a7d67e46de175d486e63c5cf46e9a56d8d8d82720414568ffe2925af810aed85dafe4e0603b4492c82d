import * as z from "zod";
import { ClosedEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { BuiltInConnectors } from "./builtinconnectors.js";
export declare const ToolFileChunkType: {
    readonly ToolFile: "tool_file";
};
export type ToolFileChunkType = ClosedEnum<typeof ToolFileChunkType>;
export type ToolFileChunk = {
    type?: ToolFileChunkType | undefined;
    tool: BuiltInConnectors;
    fileId: string;
    fileName?: string | null | undefined;
    fileType?: string | null | undefined;
};
/** @internal */
export declare const ToolFileChunkType$inboundSchema: z.ZodNativeEnum<typeof ToolFileChunkType>;
/** @internal */
export declare const ToolFileChunkType$outboundSchema: z.ZodNativeEnum<typeof ToolFileChunkType>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolFileChunkType$ {
    /** @deprecated use `ToolFileChunkType$inboundSchema` instead. */
    const inboundSchema: z.ZodNativeEnum<{
        readonly ToolFile: "tool_file";
    }>;
    /** @deprecated use `ToolFileChunkType$outboundSchema` instead. */
    const outboundSchema: z.ZodNativeEnum<{
        readonly ToolFile: "tool_file";
    }>;
}
/** @internal */
export declare const ToolFileChunk$inboundSchema: z.ZodType<ToolFileChunk, z.ZodTypeDef, unknown>;
/** @internal */
export type ToolFileChunk$Outbound = {
    type: string;
    tool: string;
    file_id: string;
    file_name?: string | null | undefined;
    file_type?: string | null | undefined;
};
/** @internal */
export declare const ToolFileChunk$outboundSchema: z.ZodType<ToolFileChunk$Outbound, z.ZodTypeDef, ToolFileChunk>;
/**
 * @internal
 * @deprecated This namespace will be removed in future versions. Use schemas and types that are exported directly from this module.
 */
export declare namespace ToolFileChunk$ {
    /** @deprecated use `ToolFileChunk$inboundSchema` instead. */
    const inboundSchema: z.ZodType<ToolFileChunk, z.ZodTypeDef, unknown>;
    /** @deprecated use `ToolFileChunk$outboundSchema` instead. */
    const outboundSchema: z.ZodType<ToolFileChunk$Outbound, z.ZodTypeDef, ToolFileChunk>;
    /** @deprecated use `ToolFileChunk$Outbound` instead. */
    type Outbound = ToolFileChunk$Outbound;
}
export declare function toolFileChunkToJSON(toolFileChunk: ToolFileChunk): string;
export declare function toolFileChunkFromJSON(jsonString: string): SafeParseResult<ToolFileChunk, SDKValidationError>;
//# sourceMappingURL=toolfilechunk.d.ts.map