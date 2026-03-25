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
const node_crypto_1 = require("node:crypto");
const mcp_js_1 = require("../../server/mcp.js");
const streamableHttp_js_1 = require("../../server/streamableHttp.js");
const z = __importStar(require("zod/v4"));
const types_js_1 = require("../../types.js");
const express_js_1 = require("../../server/express.js");
// Create an MCP server with implementation details
const getServer = () => {
    const server = new mcp_js_1.McpServer({
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
const app = (0, express_js_1.createMcpExpressApp)();
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
        else if (!sessionId && (0, types_js_1.isInitializeRequest)(req.body)) {
            // New initialization request - use JSON response mode
            transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
                sessionIdGenerator: () => (0, node_crypto_1.randomUUID)(),
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