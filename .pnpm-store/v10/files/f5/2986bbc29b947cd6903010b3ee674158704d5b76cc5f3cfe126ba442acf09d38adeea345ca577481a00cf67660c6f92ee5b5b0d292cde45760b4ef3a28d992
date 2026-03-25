import { LoadMcpToolsOptions } from "./types.cjs";
import { Client } from "./connection.cjs";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { Client as Client$1 } from "@modelcontextprotocol/sdk/client/index.js";

//#region src/tools.d.ts

/**
 * MCP instance is either a Client or a MCPClient.
 *
 * `MCPClient`: is the base instance from the `@modelcontextprotocol/sdk` package.
 * `Client`: is an extension of the `MCPClient` that adds the `fork` method to easier create a new client with different headers.
 *
 * This distinction is necessary to keep the interface of the `getTools` method simple.
 */
type MCPInstance = Client | Client$1;
/**
 * Custom error class for tool exceptions
 */

/**
 * Load all tools from an MCP client.
 *
 * @param serverName - The name of the server to load tools from
 * @param client - The MCP client
 * @returns A list of LangChain tools
 */
declare function loadMcpTools(serverName: string, client: MCPInstance, options?: LoadMcpToolsOptions): Promise<DynamicStructuredTool[]>;
//#endregion
export { loadMcpTools };
//# sourceMappingURL=tools.d.cts.map