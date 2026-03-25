import "./types.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";

//#region src/connection.d.ts
interface Client$1 extends Client {
  /**
   * Fork the client with a new set of headers, it either returns a new client or the same client if the headers are the same
   * @param headers - The headers to fork the client with
   * @returns The forked client
   */
  fork: (headers: Record<string, string>) => Promise<Client$1>;
}
//#endregion
export { Client$1 as Client };
//# sourceMappingURL=connection.d.ts.map