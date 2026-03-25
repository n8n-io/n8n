import { randomUUID } from 'node:crypto';
import { McpServer } from '../../server/mcp.js';
import { StreamableHTTPServerTransport } from '../../server/streamableHttp.js';
import * as z from 'zod/v4';
import { isInitializeRequest } from '../../types.js';
import { createMcpExpressApp } from '../../server/express.js';
// Create an MCP server with implementation details
const getServer = () => {
    const server = new McpServer({
        name: 'json-response-streamable-http-server',
        version: '1.0.0'
    }, {
        capabilities: {
            logging: {}
        }
    });
    // Register a simple tool that returns a greeting
    server.registerTool('greet', {
        description: 'A simple greeting tool',
        inputSchema: {
            name: z.string().describe('Name to greet')
        }
    }, async ({ name }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: `Hello, ${name}!`
                }
            ]
        };
    });
    // Register a tool that sends multiple greetings with notifications
    server.registerTool('multi-greet', {
        description: 'A tool that sends different greetings with delays between them',
        inputSchema: {
            name: z.string().describe('Name to greet')
        }
    }, async ({ name }, extra) => {
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await server.sendLoggingMessage({
            level: 'debug',
            data: `Starting multi-greet for ${name}`
        }, extra.sessionId);
        await sleep(1000); // Wait 1 second before first greeting
        await server.sendLoggingMessage({
            level: 'info',
            data: `Sending first greeting to ${name}`
        }, extra.sessionId);
        await sleep(1000); // Wait another second before second greeting
        await server.sendLoggingMessage({
            level: 'info',
            data: `Sending second greeting to ${name}`
        }, extra.sessionId);
        return {
            content: [
                {
                    type: 'text',
                    text: `Good morning, ${name}!`
                }
            ]
        };
    });
    return server;
};
const app = createMcpExpressApp();
// Map to store transports by session ID
const transports = {};
app.post('/mcp', async (req, res) => {
    console.log('Received MCP request:', req.body);
    try {
        // Check for existing session ID
        const sessionId = req.headers['mcp-session-id'];
        let transport;
        if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
        }
        else if (!sessionId && isInitializeRequest(req.body)) {
            // New initialization request - use JSON response mode
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                enableJsonResponse: true, // Enable JSON response mode
                onsessioninitialized: sessionId => {
                    // Store the transport by session ID when session is initialized
                    // This avoids race conditions where requests might come in before the session is stored
                    console.log(`Session initialized with ID: ${sessionId}`);
                    transports[sessionId] = transport;
                }
            });
            // Connect the transport to the MCP server BEFORE handling the request
            const server = getServer();
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
            return; // Already handled
        }
        else {
            // Invalid request - no session ID or not initialization request
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Bad Request: No valid session ID provided'
                },
                id: null
            });
            return;
        }
        // Handle the request with existing transport - no need to reconnect
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error'
                },
                id: null
            });
        }
    }
});
// Handle GET requests for SSE streams according to spec
app.get('/mcp', async (req, res) => {
    // Since this is a very simple example, we don't support GET requests for this server
    // The spec requires returning 405 Method Not Allowed in this case
    res.status(405).set('Allow', 'POST').send('Method Not Allowed');
});
// Start the server
const PORT = 3000;
app.listen(PORT, error => {
    if (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
    console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
});
// Handle server shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    process.exit(0);
});
//# sourceMappingURL=jsonResponseStreamableHttp.js.map