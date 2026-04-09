import * as z from "zod/v3";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import { AudioContent } from "./audiocontent.js";
import { EmbeddedResource } from "./embeddedresource.js";
import { ImageContent } from "./imagecontent.js";
import { MCPToolCallMetadata } from "./mcptoolcallmetadata.js";
import { ResourceLink } from "./resourcelink.js";
import { TextContent } from "./textcontent.js";
export type Content = TextContent | ImageContent | AudioContent | ResourceLink | EmbeddedResource;
/**
 * Response from calling an MCP tool.
 *
 * @remarks
 *
 * We override mcp_types.CallToolResult because:
 * - Models only support `content`, not `structuredContent` at top level
 * - Downstream consumers (le-chat, etc.) need structuredContent/isError/_meta via metadata
 *
 * SYNC: Keep in sync with Harmattan (orchestrator) for harmonized tool result processing.
 */
export type MCPToolCallResponse = {
    content: Array<TextContent | ImageContent | AudioContent | ResourceLink | EmbeddedResource>;
    metadata?: MCPToolCallMetadata | null | undefined;
    additionalProperties?: {
        [k: string]: any;
    } | undefined;
};
/** @internal */
export declare const Content$inboundSchema: z.ZodType<Content, z.ZodTypeDef, unknown>;
export declare function contentFromJSON(jsonString: string): SafeParseResult<Content, SDKValidationError>;
/** @internal */
export declare const MCPToolCallResponse$inboundSchema: z.ZodType<MCPToolCallResponse, z.ZodTypeDef, unknown>;
export declare function mcpToolCallResponseFromJSON(jsonString: string): SafeParseResult<MCPToolCallResponse, SDKValidationError>;
//# sourceMappingURL=mcptoolcallresponse.d.ts.map