"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const mcp_js_1 = require("../../server/mcp.js");
const streamableHttp_js_1 = require("../../server/streamableHttp.js");
const types_js_1 = require("../../types.js");
const express_js_1 = require("../../server/express.js");
// Factory to create a new MCP server per session.
// Each session needs its own server+transport pair to avoid cross-session contamination.
const getServer = () => {
    const server = new mcp_js_1.McpServer({
        name: 'resource-list-changed-notification-server',
        version: '1.0.0'
    });
    const addResource = (name, content) => {
        const uri = `https://mcp-example.com/dynamic/${encodeURIComponent(name)}`;
        server.registerResource(name, uri, { mimeType: 'text/plain', description: `Dynamic resource: ${name}` }, async () => {
            return {
                contents: [{ uri, text: content }]
            };
        });
    };
    addResource('example-resource', 'Initial content for example-resource');
    // Periodically add new resources to demonstrate notifications
    const resourceChangeInterval = setInterval(() => {
        const name = (0, node_crypto_1.randomUUID)();
        addResource(name, `Content for ${name}`);
    }, 5000);
    // Clean up the interval when the server closes
    server.server.onclose = () => {
        clearInterval(resourceChangeInterval);
    };
    return server;
};
// Store transports by session ID to send notifications
const transports = {};
const app = (0, express_js_1.createMcpExpressApp)();
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
        else if (!sessionId && (0, types_js_1.isInitializeRequest)(req.body)) {
            // New initialization request
            transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
                sessionIdGenerator: () => (0, node_crypto_1.randomUUID)(),
                onsessioninitialized: sessionId => {
                    // Store the transport by session ID when session is initialized
                    // This avoids race conditions where requests might come in before the session is stored
                    console.log(`Session initialized with ID: ${sessionId}`);
                    transports[sessionId] = transport;
                }
            });
            // Create a new server per session and connect it to the transport
            const server = getServer();
            await server.connect(transport);
            // Handle the request - the onsessioninitialized callback will store the transport
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
        // Handle the request with existing transport
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
// Handle GET requests for SSE streams (now using built-in support from StreamableHTTP)
app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }
    console.log(`Establishing SSE stream for session ${sessionId}`);
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
});
// Start the server
const PORT = 3000;
app.listen(PORT, error => {
    if (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
    console.log(`Server listening on port ${PORT}`);
});
// Handle server shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    for (const sessionId in transports) {
        await transports[sessionId].close();
        delete transports[sessionId];
    }
    process.exit(0);
});
//# sourceMappingURL=standaloneSseWithGetStreamableHttp.js.map