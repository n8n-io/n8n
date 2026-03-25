/**
 * Example MCP server using Hono with WebStandardStreamableHTTPServerTransport
 *
 * This example demonstrates using the Web Standard transport directly with Hono,
 * which works on any runtime: Node.js, Cloudflare Workers, Deno, Bun, etc.
 *
 * Run with: npx tsx src/examples/server/honoWebStandardStreamableHttp.ts
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import * as z from 'zod/v4';
import { McpServer } from '../../server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '../../server/webStandardStreamableHttp.js';
// Factory function to create a new MCP server per request (stateless mode)
const getServer = () => {
    const server = new McpServer({
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
const app = new Hono();
// Enable CORS for all origins
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
    exposeHeaders: ['mcp-session-id', 'mcp-protocol-version']
}));
// Health check endpoint
app.get('/health', c => c.json({ status: 'ok' }));
// MCP endpoint - create a fresh transport and server per request (stateless)
app.all('/mcp', async (c) => {
    const transport = new WebStandardStreamableHTTPServerTransport();
    const server = getServer();
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
});
// Start the server
const PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3000;
console.log(`Starting Hono MCP server on port ${PORT}`);
console.log(`Health check: http://localhost:${PORT}/health`);
console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
serve({
    fetch: app.fetch,
    port: PORT
});
//# sourceMappingURL=honoWebStandardStreamableHttp.js.map