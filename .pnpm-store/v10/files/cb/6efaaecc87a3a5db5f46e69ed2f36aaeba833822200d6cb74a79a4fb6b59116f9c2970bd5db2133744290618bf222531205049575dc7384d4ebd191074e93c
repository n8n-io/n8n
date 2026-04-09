import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
/**
 * MCP-specific result metadata (isError, structuredContent, _meta).
 */
export type MCPResultMetadata = {
    isError: boolean | undefined;
    structuredContent?: {
        [k: string]: any;
    } | null | undefined;
    meta?: {
        [k: string]: any;
    } | null | undefined;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const MCPResultMetadata$inboundSchema: z.ZodType<MCPResultMetadata, z.ZodTypeDef, unknown>;
export declare function mcpResultMetadataFromJSON(jsonString: string): SafeParseResult<MCPResultMetadata, SDKValidationError>;
//# sourceMappingURL=mcpresultmetadata.d.ts.map