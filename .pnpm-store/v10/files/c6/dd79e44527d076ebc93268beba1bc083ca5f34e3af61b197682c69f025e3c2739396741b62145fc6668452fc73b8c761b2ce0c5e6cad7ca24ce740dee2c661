"use strict";
/**
 * Example MCP server using Hono with WebStandardStreamableHTTPServerTransport
 *
 * This example demonstrates using the Web Standard transport directly with Hono,
 * which works on any runtime: Node.js, Cloudflare Workers, Deno, Bun, etc.
 *
 * Run with: npx tsx src/examples/server/honoWebStandardStreamableHttp.ts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const node_server_1 = require("@hono/node-server");
const z = __importStar(require("zod/v4"));
const mcp_js_1 = require("../../server/mcp.js");
const webStandardStreamableHttp_js_1 = require("../../server/webStandardStreamableHttp.js");
// Factory function to create a new MCP server per request (stateless mode)
const getServer = () => {
    const server = new mcp_js_1.McpServer({
        name: 'hono-webstandard-mcp-server',
        version: '1.0.0'
    });
    // Register a simple greeting tool
    server.registerTool('greet', {
        title: 'Greeting Tool',
        description: 'A simple greeting tool',
        inputSchema: { name: z.string().describe('Name to greet') }
    }, async ({ name }) => {
        return {
            content: [{ type: 'text', text: `Hello, ${name}! (from Hono + WebStandard transport)` }]
        };
    });
    return server;
};
// Create the Hono app
const app = new hono_1.Hono();
// Enable CORS for all origins
app.use('*', (0, cors_1.cors)({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version']
}));
// Health check endpoint
app.get('/health', c => c.json({ status: 'ok' }));
// MCP endpoint - create a fresh transport and server per request (stateless)
app.all('/mcp', async (c) => {
    const transport = new webStandardStreamableHttp_js_1.WebStandardStreamableHTTPServerTransport();
    const server = getServer();
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
});
// Start the server
const PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3000;
console.log(`Starting Hono MCP server on port ${PORT}`);
console.log(`Health check: http://localhost:${PORT}/health`);
console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
(0, node_server_1.serve)({
    fetch: app.fetch,
    port: PORT
});
//# sourceMappingURL=honoWebStandardStreamableHttp.js.map