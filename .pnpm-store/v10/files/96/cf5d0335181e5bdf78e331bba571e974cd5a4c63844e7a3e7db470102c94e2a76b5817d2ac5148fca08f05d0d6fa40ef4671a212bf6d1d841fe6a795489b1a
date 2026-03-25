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
const z = __importStar(require("zod/v4"));
const mcp_js_1 = require("../../server/mcp.js");
const streamableHttp_js_1 = require("../../server/streamableHttp.js");
const router_js_1 = require("../../server/auth/router.js");
const bearerAuth_js_1 = require("../../server/auth/middleware/bearerAuth.js");
const express_js_1 = require("../../server/express.js");
const types_js_1 = require("../../types.js");
const inMemoryEventStore_js_1 = require("../shared/inMemoryEventStore.js");
const in_memory_js_1 = require("../../experimental/tasks/stores/in-memory.js");
const demoInMemoryOAuthProvider_js_1 = require("./demoInMemoryOAuthProvider.js");
const auth_utils_js_1 = require("../../shared/auth-utils.js");
// Check for OAuth flag
const useOAuth = process.argv.includes('--oauth');
const strictOAuth = process.argv.includes('--oauth-strict');
// Create shared task store for demonstration
const taskStore = new in_memory_js_1.InMemoryTaskStore();
// Create an MCP server with implementation details
const getServer = () => {
    const server = new mcp_js_1.McpServer({
        name: 'simple-streamable-http-server',
        version: '1.0.0',
        icons: [{ src: './mcp.svg', sizes: ['512x512'], mimeType: 'image/svg+xml' }],
        websiteUrl: 'https://github.com/modelcontextprotocol/typescript-sdk'
    }, {
        capabilities: { logging: {}, tasks: { requests: { tools: { call: {} } } } },
        taskStore, // Enable task support
        taskMessageQueue: new in_memory_js_1.InMemoryTaskMessageQueue()
    });
    // Register a simple tool that returns a greeting
    server.registerTool('greet', {
        title: 'Greeting Tool', // Display name for UI
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
    // Register a tool that sends multiple greetings with notifications (with annotations)
    server.registerTool('multi-greet', {
        description: 'A tool that sends different greetings with delays between them',
        inputSchema: {
            name: z.string().describe('Name to greet')
        },
        annotations: {
            title: 'Multiple Greeting Tool',
            readOnlyHint: true,
            openWorldHint: false
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
    // Register a tool that demonstrates form elicitation (user input collection with a schema)
    // This creates a closure that captures the server instance
    server.registerTool('collect-user-info', {
        description: 'A tool that collects user information through form elicitation',
        inputSchema: {
            infoType: z.enum(['contact', 'preferences', 'feedback']).describe('Type of information to collect')
        }
    }, async ({ infoType }, extra) => {
        let message;
        let requestedSchema;
        switch (infoType) {
            case 'contact':
                message = 'Please provide your contact information';
                requestedSchema = {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            title: 'Full Name',
                            description: 'Your full name'
                        },
                        email: {
                            type: 'string',
                            title: 'Email Address',
                            description: 'Your email address',
                            format: 'email'
                        },
                        phone: {
                            type: 'string',
                            title: 'Phone Number',
                            description: 'Your phone number (optional)'
                        }
                    },
                    required: ['name', 'email']
                };
                break;
            case 'preferences':
                message = 'Please set your preferences';
                requestedSchema = {
                    type: 'object',
                    properties: {
                        theme: {
                            type: 'string',
                            title: 'Theme',
                            description: 'Choose your preferred theme',
                            enum: ['light', 'dark', 'auto'],
                            enumNames: ['Light', 'Dark', 'Auto']
                        },
                        notifications: {
                            type: 'boolean',
                            title: 'Enable Notifications',
                            description: 'Would you like to receive notifications?',
                            default: true
                        },
                        frequency: {
                            type: 'string',
                            title: 'Notification Frequency',
                            description: 'How often would you like notifications?',
                            enum: ['daily', 'weekly', 'monthly'],
                            enumNames: ['Daily', 'Weekly', 'Monthly']
                        }
                    },
                    required: ['theme']
                };
                break;
            case 'feedback':
                message = 'Please provide your feedback';
                requestedSchema = {
                    type: 'object',
                    properties: {
                        rating: {
                            type: 'integer',
                            title: 'Rating',
                            description: 'Rate your experience (1-5)',
                            minimum: 1,
                            maximum: 5
                        },
                        comments: {
                            type: 'string',
                            title: 'Comments',
                            description: 'Additional comments (optional)',
                            maxLength: 500
                        },
                        recommend: {
                            type: 'boolean',
                            title: 'Would you recommend this?',
                            description: 'Would you recommend this to others?'
                        }
                    },
                    required: ['rating', 'recommend']
                };
                break;
            default:
                throw new Error(`Unknown info type: ${infoType}`);
        }
        try {
            // Use sendRequest through the extra parameter to elicit input
            const result = await extra.sendRequest({
                method: 'elicitation/create',
                params: {
                    mode: 'form',
                    message,
                    requestedSchema
                }
            }, types_js_1.ElicitResultSchema);
            if (result.action === 'accept') {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Thank you! Collected ${infoType} information: ${JSON.stringify(result.content, null, 2)}`
                        }
                    ]
                };
            }
            else if (result.action === 'decline') {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `No information was collected. User declined ${infoType} information request.`
                        }
                    ]
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Information collection was cancelled by the user.`
                        }
                    ]
                };
            }
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error collecting ${infoType} information: ${error}`
                    }
                ]
            };
        }
    });
    // Register a simple prompt with title
    server.registerPrompt('greeting-template', {
        title: 'Greeting Template', // Display name for UI
        description: 'A simple greeting prompt template',
        argsSchema: {
            name: z.string().describe('Name to include in greeting')
        }
    }, async ({ name }) => {
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Please greet ${name} in a friendly manner.`
                    }
                }
            ]
        };
    });
    // Register a tool specifically for testing resumability
    server.registerTool('start-notification-stream', {
        description: 'Starts sending periodic notifications for testing resumability',
        inputSchema: {
            interval: z.number().describe('Interval in milliseconds between notifications').default(100),
            count: z.number().describe('Number of notifications to send (0 for 100)').default(50)
        }
    }, async ({ interval, count }, extra) => {
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        let counter = 0;
        while (count === 0 || counter < count) {
            counter++;
            try {
                await server.sendLoggingMessage({
                    level: 'info',
                    data: `Periodic notification #${counter} at ${new Date().toISOString()}`
                }, extra.sessionId);
            }
            catch (error) {
                console.error('Error sending notification:', error);
            }
            // Wait for the specified interval
            await sleep(interval);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Started sending periodic notifications every ${interval}ms`
                }
            ]
        };
    });
    // Create a simple resource at a fixed URI
    server.registerResource('greeting-resource', 'https://example.com/greetings/default', {
        title: 'Default Greeting', // Display name for UI
        description: 'A simple greeting resource',
        mimeType: 'text/plain'
    }, async () => {
        return {
            contents: [
                {
                    uri: 'https://example.com/greetings/default',
                    text: 'Hello, world!'
                }
            ]
        };
    });
    // Create additional resources for ResourceLink demonstration
    server.registerResource('example-file-1', 'file:///example/file1.txt', {
        title: 'Example File 1',
        description: 'First example file for ResourceLink demonstration',
        mimeType: 'text/plain'
    }, async () => {
        return {
            contents: [
                {
                    uri: 'file:///example/file1.txt',
                    text: 'This is the content of file 1'
                }
            ]
        };
    });
    server.registerResource('example-file-2', 'file:///example/file2.txt', {
        title: 'Example File 2',
        description: 'Second example file for ResourceLink demonstration',
        mimeType: 'text/plain'
    }, async () => {
        return {
            contents: [
                {
                    uri: 'file:///example/file2.txt',
                    text: 'This is the content of file 2'
                }
            ]
        };
    });
    // Register a tool that returns ResourceLinks
    server.registerTool('list-files', {
        title: 'List Files with ResourceLinks',
        description: 'Returns a list of files as ResourceLinks without embedding their content',
        inputSchema: {
            includeDescriptions: z.boolean().optional().describe('Whether to include descriptions in the resource links')
        }
    }, async ({ includeDescriptions = true }) => {
        const resourceLinks = [
            {
                type: 'resource_link',
                uri: 'https://example.com/greetings/default',
                name: 'Default Greeting',
                mimeType: 'text/plain',
                ...(includeDescriptions && { description: 'A simple greeting resource' })
            },
            {
                type: 'resource_link',
                uri: 'file:///example/file1.txt',
                name: 'Example File 1',
                mimeType: 'text/plain',
                ...(includeDescriptions && { description: 'First example file for ResourceLink demonstration' })
            },
            {
                type: 'resource_link',
                uri: 'file:///example/file2.txt',
                name: 'Example File 2',
                mimeType: 'text/plain',
                ...(includeDescriptions && { description: 'Second example file for ResourceLink demonstration' })
            }
        ];
        return {
            content: [
                {
                    type: 'text',
                    text: 'Here are the available files as resource links:'
                },
                ...resourceLinks,
                {
                    type: 'text',
                    text: '\nYou can read any of these resources using their URI.'
                }
            ]
        };
    });
    // Register a long-running tool that demonstrates task execution
    // Using the experimental tasks API - WARNING: may change without notice
    server.experimental.tasks.registerToolTask('delay', {
        title: 'Delay',
        description: 'A simple tool that delays for a specified duration, useful for testing task execution',
        inputSchema: {
            duration: z.number().describe('Duration in milliseconds').default(5000)
        }
    }, {
        async createTask({ duration }, { taskStore, taskRequestedTtl }) {
            // Create the task
            const task = await taskStore.createTask({
                ttl: taskRequestedTtl
            });
            // Simulate out-of-band work
            (async () => {
                await new Promise(resolve => setTimeout(resolve, duration));
                await taskStore.storeTaskResult(task.taskId, 'completed', {
                    content: [
                        {
                            type: 'text',
                            text: `Completed ${duration}ms delay`
                        }
                    ]
                });
            })();
            // Return CreateTaskResult with the created task
            return {
                task
            };
        },
        async getTask(_args, { taskId, taskStore }) {
            return await taskStore.getTask(taskId);
        },
        async getTaskResult(_args, { taskId, taskStore }) {
            const result = await taskStore.getTaskResult(taskId);
            return result;
        }
    });
    return server;
};
const MCP_PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3000;
const AUTH_PORT = process.env.MCP_AUTH_PORT ? parseInt(process.env.MCP_AUTH_PORT, 10) : 3001;
const app = (0, express_js_1.createMcpExpressApp)();
// Set up OAuth if enabled
let authMiddleware = null;
if (useOAuth) {
    // Create auth middleware for MCP endpoints
    const mcpServerUrl = new URL(`http://localhost:${MCP_PORT}/mcp`);
    const authServerUrl = new URL(`http://localhost:${AUTH_PORT}`);
    const oauthMetadata = (0, demoInMemoryOAuthProvider_js_1.setupAuthServer)({ authServerUrl, mcpServerUrl, strictResource: strictOAuth });
    const tokenVerifier = {
        verifyAccessToken: async (token) => {
            const endpoint = oauthMetadata.introspection_endpoint;
            if (!endpoint) {
                throw new Error('No token verification endpoint available in metadata');
            }
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    token: token
                }).toString()
            });
            if (!response.ok) {
                const text = await response.text().catch(() => null);
                throw new Error(`Invalid or expired token: ${text}`);
            }
            const data = await response.json();
            if (strictOAuth) {
                if (!data.aud) {
                    throw new Error(`Resource Indicator (RFC8707) missing`);
                }
                if (!(0, auth_utils_js_1.checkResourceAllowed)({ requestedResource: data.aud, configuredResource: mcpServerUrl })) {
                    throw new Error(`Expected resource indicator ${mcpServerUrl}, got: ${data.aud}`);
                }
            }
            // Convert the response to AuthInfo format
            return {
                token,
                clientId: data.client_id,
                scopes: data.scope ? data.scope.split(' ') : [],
                expiresAt: data.exp
            };
        }
    };
    // Add metadata routes to the main MCP server
    app.use((0, router_js_1.mcpAuthMetadataRouter)({
        oauthMetadata,
        resourceServerUrl: mcpServerUrl,
        scopesSupported: ['mcp:tools'],
        resourceName: 'MCP Demo Server'
    }));
    authMiddleware = (0, bearerAuth_js_1.requireBearerAuth)({
        verifier: tokenVerifier,
        requiredScopes: [],
        resourceMetadataUrl: (0, router_js_1.getOAuthProtectedResourceMetadataUrl)(mcpServerUrl)
    });
}
// Map to store transports by session ID
const transports = {};
// MCP POST endpoint with optional auth
const mcpPostHandler = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (sessionId) {
        console.log(`Received MCP request for session: ${sessionId}`);
    }
    else {
        console.log('Request body:', req.body);
    }
    if (useOAuth && req.auth) {
        console.log('Authenticated user:', req.auth);
    }
    try {
        let transport;
        if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
        }
        else if (!sessionId && (0, types_js_1.isInitializeRequest)(req.body)) {
            // New initialization request
            const eventStore = new inMemoryEventStore_js_1.InMemoryEventStore();
            transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
                sessionIdGenerator: () => (0, node_crypto_1.randomUUID)(),
                eventStore, // Enable resumability
                onsessioninitialized: sessionId => {
                    // Store the transport by session ID when session is initialized
                    // This avoids race conditions where requests might come in before the session is stored
                    console.log(`Session initialized with ID: ${sessionId}`);
                    transports[sessionId] = transport;
                }
            });
            // Set up onclose handler to clean up transport when closed
            transport.onclose = () => {
                const sid = transport.sessionId;
                if (sid && transports[sid]) {
                    console.log(`Transport closed for session ${sid}, removing from transports map`);
                    delete transports[sid];
                }
            };
            // Connect the transport to the MCP server BEFORE handling the request
            // so responses can flow back through the same transport
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
        // The existing transport is already connected to the server
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
};
// Set up routes with conditional auth middleware
if (useOAuth && authMiddleware) {
    app.post('/mcp', authMiddleware, mcpPostHandler);
}
else {
    app.post('/mcp', mcpPostHandler);
}
// Handle GET requests for SSE streams (using built-in support from StreamableHTTP)
const mcpGetHandler = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }
    if (useOAuth && req.auth) {
        console.log('Authenticated SSE connection from user:', req.auth);
    }
    // Check for Last-Event-ID header for resumability
    const lastEventId = req.headers['last-event-id'];
    if (lastEventId) {
        console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
    }
    else {
        console.log(`Establishing new SSE stream for session ${sessionId}`);
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
};
// Set up GET route with conditional auth middleware
if (useOAuth && authMiddleware) {
    app.get('/mcp', authMiddleware, mcpGetHandler);
}
else {
    app.get('/mcp', mcpGetHandler);
}
// Handle DELETE requests for session termination (according to MCP spec)
const mcpDeleteHandler = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }
    console.log(`Received session termination request for session ${sessionId}`);
    try {
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
    }
    catch (error) {
        console.error('Error handling session termination:', error);
        if (!res.headersSent) {
            res.status(500).send('Error processing session termination');
        }
    }
};
// Set up DELETE route with conditional auth middleware
if (useOAuth && authMiddleware) {
    app.delete('/mcp', authMiddleware, mcpDeleteHandler);
}
else {
    app.delete('/mcp', mcpDeleteHandler);
}
app.listen(MCP_PORT, error => {
    if (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
    console.log(`MCP Streamable HTTP Server listening on port ${MCP_PORT}`);
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
//# sourceMappingURL=simpleStreamableHttp.js.map