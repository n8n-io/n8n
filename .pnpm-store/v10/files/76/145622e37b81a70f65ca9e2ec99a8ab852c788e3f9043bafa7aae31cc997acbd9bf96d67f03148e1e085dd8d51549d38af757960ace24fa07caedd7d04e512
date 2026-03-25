// Run with: npx tsx src/examples/server/elicitationFormExample.ts
//
// This example demonstrates how to use form elicitation to collect structured user input
// with JSON Schema validation via a local HTTP server with SSE streaming.
// Form elicitation allows servers to request *non-sensitive* user input through the client
// with schema-based validation.
// Note: See also elicitationUrlExample.ts for an example of using URL elicitation
// to collect *sensitive* user input via a browser.
import { randomUUID } from 'node:crypto';
import { McpServer } from '../../server/mcp.js';
import { StreamableHTTPServerTransport } from '../../server/streamableHttp.js';
import { isInitializeRequest } from '../../types.js';
import { createMcpExpressApp } from '../../server/express.js';
// Factory to create a new MCP server per session.
// Each session needs its own server+transport pair to avoid cross-session contamination.
const getServer = () => {
    // Create MCP server - it will automatically use AjvJsonSchemaValidator with sensible defaults
    // The validator supports format validation (email, date, etc.) if ajv-formats is installed
    const mcpServer = new McpServer({
        name: 'form-elicitation-example-server',
        version: '1.0.0'
    }, {
        capabilities: {}
    });
    /**
     * Example 1: Simple user registration tool
     * Collects username, email, and password from the user
     */
    mcpServer.registerTool('register_user', {
        description: 'Register a new user account by collecting their information',
        inputSchema: {}
    }, async () => {
        try {
            // Request user information through form elicitation
            const result = await mcpServer.server.elicitInput({
                mode: 'form',
                message: 'Please provide your registration information:',
                requestedSchema: {
                    type: 'object',
                    properties: {
                        username: {
                            type: 'string',
                            title: 'Username',
                            description: 'Your desired username (3-20 characters)',
                            minLength: 3,
                            maxLength: 20
                        },
                        email: {
                            type: 'string',
                            title: 'Email',
                            description: 'Your email address',
                            format: 'email'
                        },
                        password: {
                            type: 'string',
                            title: 'Password',
                            description: 'Your password (min 8 characters)',
                            minLength: 8
                        },
                        newsletter: {
                            type: 'boolean',
                            title: 'Newsletter',
                            description: 'Subscribe to newsletter?',
                            default: false
                        }
                    },
                    required: ['username', 'email', 'password']
                }
            });
            // Handle the different possible actions
            if (result.action === 'accept' && result.content) {
                const { username, email, newsletter } = result.content;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Registration successful!\n\nUsername: ${username}\nEmail: ${email}\nNewsletter: ${newsletter ? 'Yes' : 'No'}`
                        }
                    ]
                };
            }
            else if (result.action === 'decline') {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Registration cancelled by user.'
                        }
                    ]
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Registration was cancelled.'
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
                        text: `Registration failed: ${error instanceof Error ? error.message : String(error)}`
                    }
                ],
                isError: true
            };
        }
    });
    /**
     * Example 2: Multi-step workflow with multiple form elicitation requests
     * Demonstrates how to collect information in multiple steps
     */
    mcpServer.registerTool('create_event', {
        description: 'Create a calendar event by collecting event details',
        inputSchema: {}
    }, async () => {
        try {
            // Step 1: Collect basic event information
            const basicInfo = await mcpServer.server.elicitInput({
                mode: 'form',
                message: 'Step 1: Enter basic event information',
                requestedSchema: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            title: 'Event Title',
                            description: 'Name of the event',
                            minLength: 1
                        },
                        description: {
                            type: 'string',
                            title: 'Description',
                            description: 'Event description (optional)'
                        }
                    },
                    required: ['title']
                }
            });
            if (basicInfo.action !== 'accept' || !basicInfo.content) {
                return {
                    content: [{ type: 'text', text: 'Event creation cancelled.' }]
                };
            }
            // Step 2: Collect date and time
            const dateTime = await mcpServer.server.elicitInput({
                mode: 'form',
                message: 'Step 2: Enter date and time',
                requestedSchema: {
                    type: 'object',
                    properties: {
                        date: {
                            type: 'string',
                            title: 'Date',
                            description: 'Event date',
                            format: 'date'
                        },
                        startTime: {
                            type: 'string',
                            title: 'Start Time',
                            description: 'Event start time (HH:MM)'
                        },
                        duration: {
                            type: 'integer',
                            title: 'Duration',
                            description: 'Duration in minutes',
                            minimum: 15,
                            maximum: 480
                        }
                    },
                    required: ['date', 'startTime', 'duration']
                }
            });
            if (dateTime.action !== 'accept' || !dateTime.content) {
                return {
                    content: [{ type: 'text', text: 'Event creation cancelled.' }]
                };
            }
            // Combine all collected information
            const event = {
                ...basicInfo.content,
                ...dateTime.content
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: `Event created successfully!\n\n${JSON.stringify(event, null, 2)}`
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Event creation failed: ${error instanceof Error ? error.message : String(error)}`
                    }
                ],
                isError: true
            };
        }
    });
    /**
     * Example 3: Collecting address information
     * Demonstrates validation with patterns and optional fields
     */
    mcpServer.registerTool('update_shipping_address', {
        description: 'Update shipping address with validation',
        inputSchema: {}
    }, async () => {
        try {
            const result = await mcpServer.server.elicitInput({
                mode: 'form',
                message: 'Please provide your shipping address:',
                requestedSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            title: 'Full Name',
                            description: 'Recipient name',
                            minLength: 1
                        },
                        street: {
                            type: 'string',
                            title: 'Street Address',
                            minLength: 1
                        },
                        city: {
                            type: 'string',
                            title: 'City',
                            minLength: 1
                        },
                        state: {
                            type: 'string',
                            title: 'State/Province',
                            minLength: 2,
                            maxLength: 2
                        },
                        zipCode: {
                            type: 'string',
                            title: 'ZIP/Postal Code',
                            description: '5-digit ZIP code'
                        },
                        phone: {
                            type: 'string',
                            title: 'Phone Number (optional)',
                            description: 'Contact phone number'
                        }
                    },
                    required: ['name', 'street', 'city', 'state', 'zipCode']
                }
            });
            if (result.action === 'accept' && result.content) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Address updated successfully!\n\n${JSON.stringify(result.content, null, 2)}`
                        }
                    ]
                };
            }
            else if (result.action === 'decline') {
                return {
                    content: [{ type: 'text', text: 'Address update cancelled by user.' }]
                };
            }
            else {
                return {
                    content: [{ type: 'text', text: 'Address update was cancelled.' }]
                };
            }
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Address update failed: ${error instanceof Error ? error.message : String(error)}`
                    }
                ],
                isError: true
            };
        }
    });
    return mcpServer;
};
async function main() {
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const app = createMcpExpressApp();
    // Map to store transports by session ID
    const transports = {};
    // MCP POST endpoint
    const mcpPostHandler = async (req, res) => {
        const sessionId = req.headers['mcp-session-id'];
        if (sessionId) {
            console.log(`Received MCP request for session: ${sessionId}`);
        }
        try {
            let transport;
            if (sessionId && transports[sessionId]) {
                // Reuse existing transport for this session
                transport = transports[sessionId];
            }
            else if (!sessionId && isInitializeRequest(req.body)) {
                // New initialization request - create new transport
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: sessionId => {
                        // Store the transport by session ID when session is initialized
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
                // Create a new server per session and connect it to the transport
                const mcpServer = getServer();
                await mcpServer.connect(transport);
                await transport.handleRequest(req, res, req.body);
                return;
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
    };
    app.post('/mcp', mcpPostHandler);
    // Handle GET requests for SSE streams
    const mcpGetHandler = async (req, res) => {
        const sessionId = req.headers['mcp-session-id'];
        if (!sessionId || !transports[sessionId]) {
            res.status(400).send('Invalid or missing session ID');
            return;
        }
        console.log(`Establishing SSE stream for session ${sessionId}`);
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
    };
    app.get('/mcp', mcpGetHandler);
    // Handle DELETE requests for session termination
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
    app.delete('/mcp', mcpDeleteHandler);
    // Start listening
    app.listen(PORT, error => {
        if (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
        console.log(`Form elicitation example server is running on http://localhost:${PORT}/mcp`);
        console.log('Available tools:');
        console.log('  - register_user: Collect user registration information');
        console.log('  - create_event: Multi-step event creation');
        console.log('  - update_shipping_address: Collect and validate address');
        console.log('\nConnect your MCP client to this server using the HTTP transport.');
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
}
main().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=elicitationFormExample.js.map