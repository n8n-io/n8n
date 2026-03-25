"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../client/index.js");
const streamableHttp_js_1 = require("../../client/streamableHttp.js");
const types_js_1 = require("../../types.js");
/**
 * Multiple Clients MCP Example
 *
 * This client demonstrates how to:
 * 1. Create multiple MCP clients in parallel
 * 2. Each client calls a single tool
 * 3. Track notifications from each client independently
 */
// Command line args processing
const args = process.argv.slice(2);
const serverUrl = args[0] || 'http://localhost:3000/mcp';
async function createAndRunClient(config) {
    console.log(`[${config.id}] Creating client: ${config.name}`);
    const client = new index_js_1.Client({
        name: config.name,
        version: '1.0.0'
    });
    const transport = new streamableHttp_js_1.StreamableHTTPClientTransport(new URL(serverUrl));
    // Set up client-specific error handler
    client.onerror = error => {
        console.error(`[${config.id}] Client error:`, error);
    };
    // Set up client-specific notification handler
    client.setNotificationHandler(types_js_1.LoggingMessageNotificationSchema, notification => {
        console.log(`[${config.id}] Notification: ${notification.params.data}`);
    });
    try {
        // Connect to the server
        await client.connect(transport);
        console.log(`[${config.id}] Connected to MCP server`);
        // Call the specified tool
        console.log(`[${config.id}] Calling tool: ${config.toolName}`);
        const toolRequest = {
            method: 'tools/call',
            params: {
                name: config.toolName,
                arguments: {
                    ...config.toolArguments,
                    // Add client ID to arguments for identification in notifications
                    caller: config.id
                }
            }
        };
        const result = await client.request(toolRequest, types_js_1.CallToolResultSchema);
        console.log(`[${config.id}] Tool call completed`);
        // Keep the connection open for a bit to receive notifications
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Disconnect
        await transport.close();
        console.log(`[${config.id}] Disconnected from MCP server`);
        return { id: config.id, result };
    }
    catch (error) {
        console.error(`[${config.id}] Error:`, error);
        throw error;
    }
}
async function main() {
    console.log('MCP Multiple Clients Example');
    console.log('============================');
    console.log(`Server URL: ${serverUrl}`);
    console.log('');
    try {
        // Define client configurations
        const clientConfigs = [
            {
                id: 'client1',
                name: 'basic-client-1',
                toolName: 'start-notification-stream',
                toolArguments: {
                    interval: 3, // 1 second between notifications
                    count: 5 // Send 5 notifications
                }
            },
            {
                id: 'client2',
                name: 'basic-client-2',
                toolName: 'start-notification-stream',
                toolArguments: {
                    interval: 2, // 2 seconds between notifications
                    count: 3 // Send 3 notifications
                }
            },
            {
                id: 'client3',
                name: 'basic-client-3',
                toolName: 'start-notification-stream',
                toolArguments: {
                    interval: 1, // 0.5 second between notifications
                    count: 8 // Send 8 notifications
                }
            }
        ];
        // Start all clients in parallel
        console.log(`Starting ${clientConfigs.length} clients in parallel...`);
        console.log('');
        const clientPromises = clientConfigs.map(config => createAndRunClient(config));
        const results = await Promise.all(clientPromises);
        // Display results from all clients
        console.log('\n=== Final Results ===');
        results.forEach(({ id, result }) => {
            console.log(`\n[${id}] Tool result:`);
            if (Array.isArray(result.content)) {
                result.content.forEach((item) => {
                    if (item.type === 'text' && item.text) {
                        console.log(`  ${item.text}`);
                    }
                    else {
                        console.log(`  ${item.type} content:`, item);
                    }
                });
            }
            else {
                console.log(`  Unexpected result format:`, result);
            }
        });
        console.log('\n=== All clients completed successfully ===');
    }
    catch (error) {
        console.error('Error running multiple clients:', error);
        process.exit(1);
    }
}
// Start the example
main().catch((error) => {
    console.error('Error running MCP multiple clients example:', error);
    process.exit(1);
});
//# sourceMappingURL=multipleClientsParallel.js.map