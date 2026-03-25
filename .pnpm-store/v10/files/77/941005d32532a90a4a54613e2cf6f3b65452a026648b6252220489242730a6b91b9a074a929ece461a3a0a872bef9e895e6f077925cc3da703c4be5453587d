import { OpenAI as OpenAI$1 } from "openai";
import { ServerTool } from "@langchain/core/tools";

//#region src/tools/mcp.d.ts

/**
 * Available connector IDs for OpenAI's built-in service connectors.
 * These are OpenAI-maintained MCP wrappers for popular services.
 */
type McpConnectorId = "connector_dropbox" | "connector_gmail" | "connector_googlecalendar" | "connector_googledrive" | "connector_microsoftteams" | "connector_outlookcalendar" | "connector_outlookemail" | "connector_sharepoint";
/**
 * Filter object to specify which tools are allowed.
 */
interface McpToolFilter {
  /**
   * List of allowed tool names.
   */
  toolNames?: string[];
  /**
   * Indicates whether or not a tool modifies data or is read-only.
   * If an MCP server is annotated with `readOnlyHint`, it will match this filter.
   */
  readOnly?: boolean;
}
/**
 * Filter object for approval requirements.
 */
interface McpApprovalFilter {
  /**
   * Tools that always require approval before execution.
   */
  always?: McpToolFilter;
  /**
   * Tools that never require approval.
   */
  never?: McpToolFilter;
}
/**
 * Base options shared between remote MCP servers and connectors.
 */
interface McpBaseOptions {
  /**
   * A label for this MCP server, used to identify it in tool calls.
   */
  serverLabel: string;
  /**
   * List of allowed tool names or a filter object.
   * Use this to limit which tools from the MCP server are available to the model.
   */
  allowedTools?: string[] | McpToolFilter;
  /**
   * An OAuth access token for authentication with the MCP server.
   * Your application must handle the OAuth authorization flow and provide the token here.
   */
  authorization?: string;
  /**
   * Optional HTTP headers to send to the MCP server.
   * Use for authentication or other purposes.
   */
  headers?: Record<string, string>;
  /**
   * Specify which of the MCP server's tools require approval before execution.
   * - `"always"`: All tools require approval
   * - `"never"`: No tools require approval
   * - `McpApprovalFilter`: Fine-grained control over which tools require approval
   *
   * @default "always" (approval required for all tools)
   */
  requireApproval?: "always" | "never" | McpApprovalFilter;
  /**
   * Optional description of the MCP server, used to provide more context to the model.
   */
  serverDescription?: string;
}
/**
 * Options for connecting to a remote MCP server via URL.
 */
interface McpRemoteServerOptions extends McpBaseOptions {
  /**
   * The URL for the MCP server.
   * The server must implement the Streamable HTTP or HTTP/SSE transport protocol.
   */
  serverUrl: string;
}
/**
 * Options for connecting to an OpenAI-maintained service connector.
 */
interface McpConnectorOptions extends McpBaseOptions {
  /**
   * Identifier for the service connector.
   * These are OpenAI-maintained MCP wrappers for popular services.
   *
   * Available connectors:
   * - `connector_dropbox`: Dropbox file access
   * - `connector_gmail`: Gmail email access
   * - `connector_googlecalendar`: Google Calendar access
   * - `connector_googledrive`: Google Drive file access
   * - `connector_microsoftteams`: Microsoft Teams access
   * - `connector_outlookcalendar`: Outlook Calendar access
   * - `connector_outlookemail`: Outlook Email access
   * - `connector_sharepoint`: SharePoint file access
   */
  connectorId: McpConnectorId;
}
/**
 * OpenAI MCP tool type for the Responses API.
 */
type McpTool = OpenAI$1.Responses.Tool.Mcp;
/**
 * Creates an MCP tool that connects to a remote MCP server or OpenAI service connector.
 * This allows OpenAI models to access external tools and services via the Model Context Protocol.
 *
 * There are two ways to use MCP tools:
 * 1. **Remote MCP servers**: Connect to any server on the public Internet that implements
 *    the MCP protocol using `serverUrl`.
 * 2. **Connectors**: Use OpenAI-maintained MCP wrappers for popular services like
 *    Google Workspace or Dropbox using `connectorId`.
 *
 * @see {@link https://platform.openai.com/docs/guides/tools-remote-mcp | OpenAI MCP Documentation}
 *
 * @param options - Configuration options for the MCP tool
 * @returns An MCP tool definition to be passed to the OpenAI Responses API
 *
 * @example
 * ```typescript
 * import { ChatOpenAI, tools } from "@langchain/openai";
 *
 * const model = new ChatOpenAI({ model: "gpt-4o" });
 *
 * // Using a remote MCP server
 * const response = await model.invoke("Roll 2d4+1", {
 *   tools: [tools.mcp({
 *     serverLabel: "dmcp",
 *     serverDescription: "A D&D MCP server for dice rolling",
 *     serverUrl: "https://dmcp-server.deno.dev/sse",
 *     requireApproval: "never",
 *   })],
 * });
 *
 * // Using a connector (e.g., Google Calendar)
 * const calendarResponse = await model.invoke("What's on my calendar today?", {
 *   tools: [tools.mcp({
 *     serverLabel: "google_calendar",
 *     connectorId: "connector_googlecalendar",
 *     authorization: "<oauth-access-token>",
 *     requireApproval: "never",
 *   })],
 * });
 *
 * // With tool filtering - only allow specific tools
 * const filteredResponse = await model.invoke("Roll some dice", {
 *   tools: [tools.mcp({
 *     serverLabel: "dmcp",
 *     serverUrl: "https://dmcp-server.deno.dev/sse",
 *     allowedTools: ["roll"],  // Only allow the "roll" tool
 *     requireApproval: "never",
 *   })],
 * });
 *
 * // With fine-grained approval control
 * const controlledResponse = await model.invoke("Search and modify files", {
 *   tools: [tools.mcp({
 *     serverLabel: "deepwiki",
 *     serverUrl: "https://mcp.deepwiki.com/mcp",
 *     requireApproval: {
 *       never: { toolNames: ["ask_question", "read_wiki_structure"] },
 *       // All other tools will require approval
 *     },
 *   })],
 * });
 * ```
 */
declare function mcp(options: McpRemoteServerOptions): ServerTool;
declare function mcp(options: McpConnectorOptions): ServerTool;
//#endregion
export { McpApprovalFilter, McpConnectorId, McpConnectorOptions, McpRemoteServerOptions, McpTool, McpToolFilter, mcp };
//# sourceMappingURL=mcp.d.ts.map