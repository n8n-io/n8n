import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { MCPResultMetadata } from "./mcpresultmetadata.js";
/**
 * Metadata wrapper for MCP tool call responses.
 *
 * @remarks
 *
 * Nests MCP-specific fields under `mcp_meta` to avoid collisions with other
 * metadata keys (e.g. `tool_call_result`) in Harmattan's streaming deltas.
 */
export type MCPToolCallMetadata = {
    mcpMeta?: MCPResultMetadata | null | undefined;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const MCPToolCallMetadata$inboundSchema: z.ZodType<MCPToolCallMetadata, z.ZodTypeDef, unknown>;
export declare function mcpToolCallMetadataFromJSON(jsonString: string): SafeParseResult<MCPToolCallMetadata, SDKValidationError>;
//# sourceMappingURL=mcptoolcallmetadata.d.ts.map