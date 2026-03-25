"use strict";
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
const mcp_js_1 = require("../../server/mcp.js");
const sse_js_1 = require("../../server/sse.js");
const z = __importStar(require("zod/v4"));
const express_js_1 = require("../../server/express.js");
/**
 * This example server demonstrates the deprecated HTTP+SSE transport
 * (protocol version 2024-11-05). It mainly used for testing backward compatible clients.
 *
 * The server exposes two endpoints:
 * - /mcp: For establishing the SSE stream (GET)
 * - /messages: For receiving client messages (POST)
 *
 */
// Create an MCP server instance
const getServer = () => {
    const server = new mcp_js_1.McpServer({
        name: 'simple-sse-server',
        version: '1.0.0'
    }, { capabilities: { logging: {} } });
    server.registerTool('start-notification-stream', {
        description: 'Starts sending periodic notifications',
        inputSchema: {
            interval: z.number().describe('Interval in milliseconds between notifications').default(1000),
            count: z.number().describe('Number of notifications to send').default(10)
        }
    }, async ({ interval, count }, extra) => {
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        let counter = 0;
        // Send the initial notification
        await server.sendLoggingMessage({
            level: 'info',
            data: `Starting notification stream with ${count} messages every ${interval}ms`
        }, extra.sessionId);
        // Send periodic notifications
        while (counter < count) {
            counter++;
            await sleep(interval);
            try {
                await server.sendLoggingMessage({
                    level: 'info',
                    data: `Notification #${counter} at ${new Date().toISOString()}`
                }, extra.sessionId);
            }
            catch (error) {
                console.error('Error sending notification:', error);
            }
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Completed sending ${count} notifications every ${interval}ms`
                }
            ]
        };
    });
    return server;
};
const app = (0, express_js_1.createMcpExpressApp)();
// Store transports by session ID
const transports = {};
// SSE endpoint for establishing the stream
app.get('/mcp', async (req, res) => {
    console.log('Received GET request to /sse (establishing SSE stream)');
    try {
        // Create a new SSE transport for the client
        // The endpoint for POST messages is '/messages'
        const transport = new sse_js_1.SSEServerTransport('/messages', res);
        // Store the transport by session ID
        const sessionId = transport.sessionId;
        transports[sessionId] = transport;
        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
            console.log(`SSE transport closed for session ${sessionId}`);
            delete transports[sessionId];
        };
        // Connect the transport to the MCP server
        const server = getServer();
        await server.connect(transport);
        console.log(`Established SSE stream with session ID: ${sessionId}`);
    }
    catch (error) {
        console.error('Error establishing SSE stream:', error);
        if (!res.headersSent) {
            res.status(500).send('Error establishing SSE stream');
        }
    }
});
// Messages endpoint for receiving client JSON-RPC requests
app.post('/messages', async (req, res) => {
    console.log('Received POST request to /messages');
    // Extract session ID from URL query parameter
    // In the SSE protocol, this is added by the client based on the endpoint event
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        console.error('No session ID provided in request URL');
        res.status(400).send('Missing sessionId parameter');
        return;
    }
    const transport = transports[sessionId];
    if (!transport) {
        console.error(`No active transport found for session ID: ${sessionId}`);
        res.status(404).send('Session not found');
        return;
    }
    try {
        // Handle the POST message with the transport
        await transport.handlePostMessage(req, res, req.body);
    }
    catch (error) {
        console.error('Error handling request:', error);
        if (!res.headersSent) {
            res.status(500).send('Error handling request');
        }
    }
});
// Start the server
const PORT = 3000;
app.listen(PORT, error => {
    if (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
    console.log(`Simple SSE Server (deprecated protocol version 2024-11-05) listening on port ${PORT}`);
});
// Handle server shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    // Close all active transports to properly clean up resources
    for (const sessionId in transports) {
        try {
            console.log(`Closing transport for session ${sessionId}`);
            await transports[sessionId].close();
            delete transports[sessionId];
        }
        catch (error) {
            console.error(`Error closing transport for session ${sessionId}:`, error);
        }
    }
    console.log('Server shutdown complete');
    process.exit(0);
});
//# sourceMappingURL=simpleSseServer.js.map