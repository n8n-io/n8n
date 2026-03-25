"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../client/index.js");
const streamableHttp_js_1 = require("../../client/streamableHttp.js");
const sse_js_1 = require("../../client/sse.js");
const types_js_1 = require("../../types.js");
/**
 * Simplified Backwards Compatible MCP Client
 *
 * This client demonstrates backward compatibility with both:
 * 1. Modern servers using Streamable HTTP transport (protocol version 2025-03-26)
 * 2. Older servers using HTTP+SSE transport (protocol version 2024-11-05)
 *
 * Following the MCP specification for backwards compatibility:
 * - Attempts to POST an initialize request to the server URL first (modern transport)
 * - If that fails with 4xx status, falls back to GET request for SSE stream (older transport)
 */
// Command line args processing
const args = process.argv.slice(2);
const serverUrl = args[0] || 'http://localhost:3000/mcp';
async function main() {
    console.log('MCP Backwards Compatible Client');
    console.log('===============================');
    console.log(`Connecting to server at: ${serverUrl}`);
    let client;
    let transport;
    try {
        // Try connecting with automatic transport detection
        const connection = await connectWithBackwardsCompatibility(serverUrl);
        client = connection.client;
        transport = connection.transport;
        // Set up notification handler
        client.setNotificationHandler(types_js_1.LoggingMessageNotificationSchema, notification => {
            console.log(`Notification: ${notification.params.level} - ${notification.params.data}`);
        });
        // DEMO WORKFLOW:
        // 1. List available tools
        console.log('\n=== Listing Available Tools ===');
        await listTools(client);
        // 2. Call the notification tool
        console.log('\n=== Starting Notification Stream ===');
        await startNotificationTool(client);
        // 3. Wait for all notifications (5 seconds)
        console.log('\n=== Waiting for all notifications ===');
        await new Promise(resolve => setTimeout(resolve, 5000));
        // 4. Disconnect
        console.log('\n=== Disconnecting ===');
        await transport.close();
        console.log('Disconnected from MCP server');
    }
    catch (error) {
        console.error('Error running client:', error);
        process.exit(1);
    }
}
/**
 * Connect to an MCP server with backwards compatibility
 * Following the spec for client backward compatibility
 */
async function connectWithBackwardsCompatibility(url) {
    console.log('1. Trying Streamable HTTP transport first...');
    // Step 1: Try Streamable HTTP transport first
    const client = new index_js_1.Client({
        name: 'backwards-compatible-client',
        version: '1.0.0'
    });
    client.onerror = error => {
        console.error('Client error:', error);
    };
    const baseUrl = new URL(url);
    try {
        // Create modern transport
        const streamableTransport = new streamableHttp_js_1.StreamableHTTPClientTransport(baseUrl);
        await client.connect(streamableTransport);
        console.log('Successfully connected using modern Streamable HTTP transport.');
        return {
            client,
            transport: streamableTransport,
            transportType: 'streamable-http'
        };
    }
    catch (error) {
        // Step 2: If transport fails, try the older SSE transport
        console.log(`StreamableHttp transport connection failed: ${error}`);
        console.log('2. Falling back to deprecated HTTP+SSE transport...');
        try {
            // Create SSE transport pointing to /sse endpoint
            const sseTransport = new sse_js_1.SSEClientTransport(baseUrl);
            const sseClient = new index_js_1.Client({
                name: 'backwards-compatible-client',
                version: '1.0.0'
            });
            await sseClient.connect(sseTransport);
            console.log('Successfully connected using deprecated HTTP+SSE transport.');
            return {
                client: sseClient,
                transport: sseTransport,
                transportType: 'sse'
            };
        }
        catch (sseError) {
            console.error(`Failed to connect with either transport method:\n1. Streamable HTTP error: ${error}\n2. SSE error: ${sseError}`);
            throw new Error('Could not connect to server with any available transport');
        }
    }
}
/**
 * List available tools on the server
 */
async function listTools(client) {
    try {
        const toolsRequest = {
            method: 'tools/list',
            params: {}
        };
        const toolsResult = await client.request(toolsRequest, types_js_1.ListToolsResultSchema);
        console.log('Available tools:');
        if (toolsResult.tools.length === 0) {
            console.log('  No tools available');
        }
        else {
            for (const tool of toolsResult.tools) {
                console.log(`  - ${tool.name}: ${tool.description}`);
            }
        }
    }
    catch (error) {
        console.log(`Tools not supported by this server: ${error}`);
    }
}
/**
 * Start a notification stream by calling the notification tool
 */
async function startNotificationTool(client) {
    try {
        // Call the notification tool using reasonable defaults
        const request = {
            method: 'tools/call',
            params: {
                name: 'start-notification-stream',
                arguments: {
                    interval: 1000, // 1 second between notifications
                    count: 5 // Send 5 notifications
                }
            }
        };
        console.log('Calling notification tool...');
        const result = await client.request(request, types_js_1.CallToolResultSchema);
        console.log('Tool result:');
        result.content.forEach(item => {
            if (item.type === 'text') {
                console.log(`  ${item.text}`);
            }
            else {
                console.log(`  ${item.type} content:`, item);
            }
        });
    }
    catch (error) {
        console.log(`Error calling notification tool: ${error}`);
    }
}
// Start the client
main().catch((error) => {
    console.error('Error running MCP client:', error);
    process.exit(1);
});
//# sourceMappingURL=streamableHttpWithSseFallbackClient.js.map