"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../client/index.js");
const streamableHttp_js_1 = require("../../client/streamableHttp.js");
const types_js_1 = require("../../types.js");
/**
 * Parallel Tool Calls MCP Client
 *
 * This client demonstrates how to:
 * 1. Start multiple tool calls in parallel
 * 2. Track notifications from each tool call using a caller parameter
 */
// Command line args processing
const args = process.argv.slice(2);
const serverUrl = args[0] || 'http://localhost:3000/mcp';
async function main() {
    console.log('MCP Parallel Tool Calls Client');
    console.log('==============================');
    console.log(`Connecting to server at: ${serverUrl}`);
    let client;
    let transport;
    try {
        // Create client with streamable HTTP transport
        client = new index_js_1.Client({
            name: 'parallel-tool-calls-client',
            version: '1.0.0'
        });
        client.onerror = error => {
            console.error('Client error:', error);
        };
        // Connect to the server
        transport = new streamableHttp_js_1.StreamableHTTPClientTransport(new URL(serverUrl));
        await client.connect(transport);
        console.log('Successfully connected to MCP server');
        // Set up notification handler with caller identification
        client.setNotificationHandler(types_js_1.LoggingMessageNotificationSchema, notification => {
            console.log(`Notification: ${notification.params.data}`);
        });
        console.log('List tools');
        const toolsRequest = await listTools(client);
        console.log('Tools: ', toolsRequest);
        // 2. Start multiple notification tools in parallel
        console.log('\n=== Starting Multiple Notification Streams in Parallel ===');
        const toolResults = await startParallelNotificationTools(client);
        // Log the results from each tool call
        for (const [caller, result] of Object.entries(toolResults)) {
            console.log(`\n=== Tool result for ${caller} ===`);
            result.content.forEach((item) => {
                if (item.type === 'text') {
                    console.log(`  ${item.text}`);
                }
                else {
                    console.log(`  ${item.type} content:`, item);
                }
            });
        }
        // 3. Wait for all notifications (10 seconds)
        console.log('\n=== Waiting for all notifications ===');
        await new Promise(resolve => setTimeout(resolve, 10000));
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
 * Start multiple notification tools in parallel with different configurations
 * Each tool call includes a caller parameter to identify its notifications
 */
async function startParallelNotificationTools(client) {
    try {
        // Define multiple tool calls with different configurations
        const toolCalls = [
            {
                caller: 'fast-notifier',
                request: {
                    method: 'tools/call',
                    params: {
                        name: 'start-notification-stream',
                        arguments: {
                            interval: 2, // 0.5 second between notifications
                            count: 10, // Send 10 notifications
                            caller: 'fast-notifier' // Identify this tool call
                        }
                    }
                }
            },
            {
                caller: 'slow-notifier',
                request: {
                    method: 'tools/call',
                    params: {
                        name: 'start-notification-stream',
                        arguments: {
                            interval: 5, // 2 seconds between notifications
                            count: 5, // Send 5 notifications
                            caller: 'slow-notifier' // Identify this tool call
                        }
                    }
                }
            },
            {
                caller: 'burst-notifier',
                request: {
                    method: 'tools/call',
                    params: {
                        name: 'start-notification-stream',
                        arguments: {
                            interval: 1, // 0.1 second between notifications
                            count: 3, // Send just 3 notifications
                            caller: 'burst-notifier' // Identify this tool call
                        }
                    }
                }
            }
        ];
        console.log(`Starting ${toolCalls.length} notification tools in parallel...`);
        // Start all tool calls in parallel
        const toolPromises = toolCalls.map(({ caller, request }) => {
            console.log(`Starting tool call for ${caller}...`);
            return client
                .request(request, types_js_1.CallToolResultSchema)
                .then(result => ({ caller, result }))
                .catch(error => {
                console.error(`Error in tool call for ${caller}:`, error);
                throw error;
            });
        });
        // Wait for all tool calls to complete
        const results = await Promise.all(toolPromises);
        // Organize results by caller
        const resultsByTool = {};
        results.forEach(({ caller, result }) => {
            resultsByTool[caller] = result;
        });
        return resultsByTool;
    }
    catch (error) {
        console.error(`Error starting parallel notification tools:`, error);
        throw error;
    }
}
// Start the client
main().catch((error) => {
    console.error('Error running MCP client:', error);
    process.exit(1);
});
//# sourceMappingURL=parallelToolCallsClient.js.map