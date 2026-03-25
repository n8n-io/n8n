/**
 * SSE Polling Example Client (SEP-1699)
 *
 * This example demonstrates client-side behavior during server-initiated
 * SSE stream disconnection and automatic reconnection.
 *
 * Key features demonstrated:
 * - Automatic reconnection when server closes SSE stream
 * - Event replay via Last-Event-ID header
 * - Resumption token tracking via onresumptiontoken callback
 *
 * Run with: npx tsx src/examples/client/ssePollingClient.ts
 * Requires: ssePollingExample.ts server running on port 3001
 */
import { Client } from '../../client/index.js';
import { StreamableHTTPClientTransport } from '../../client/streamableHttp.js';
import { CallToolResultSchema, LoggingMessageNotificationSchema } from '../../types.js';
const SERVER_URL = 'http://localhost:3001/mcp';
async function main() {
    console.log('SSE Polling Example Client');
    console.log('==========================');
    console.log(`Connecting to ${SERVER_URL}...`);
    console.log('');
    // Create transport with reconnection options
    const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL), {
    // Use default reconnection options - SDK handles automatic reconnection
    });
    // Track the last event ID for debugging
    let lastEventId;
    // Set up transport error handler to observe disconnections
    // Filter out expected errors from SSE reconnection
    transport.onerror = error => {
        // Skip abort errors during intentional close
        if (error.message.includes('AbortError'))
            return;
        // Show SSE disconnect (expected when server closes stream)
        if (error.message.includes('Unexpected end of JSON')) {
            console.log('[Transport] SSE stream disconnected - client will auto-reconnect');
            return;
        }
        console.log(`[Transport] Error: ${error.message}`);
    };
    // Set up transport close handler
    transport.onclose = () => {
        console.log('[Transport] Connection closed');
    };
    // Create and connect client
    const client = new Client({
        name: 'sse-polling-client',
        version: '1.0.0'
    });
    // Set up notification handler to receive progress updates
    client.setNotificationHandler(LoggingMessageNotificationSchema, notification => {
        const data = notification.params.data;
        console.log(`[Notification] ${data}`);
    });
    try {
        await client.connect(transport);
        console.log('[Client] Connected successfully');
        console.log('');
        // Call the long-task tool
        console.log('[Client] Calling long-task tool...');
        console.log('[Client] Server will disconnect mid-task to demonstrate polling');
        console.log('');
        const result = await client.request({
            method: 'tools/call',
            params: {
                name: 'long-task',
                arguments: {}
            }
        }, CallToolResultSchema, {
            // Track resumption tokens for debugging
            onresumptiontoken: token => {
                lastEventId = token;
                console.log(`[Event ID] ${token}`);
            }
        });
        console.log('');
        console.log('[Client] Tool completed!');
        console.log(`[Result] ${JSON.stringify(result.content, null, 2)}`);
        console.log('');
        console.log(`[Debug] Final event ID: ${lastEventId}`);
    }
    catch (error) {
        console.error('[Error]', error);
    }
    finally {
        await transport.close();
        console.log('[Client] Disconnected');
    }
}
main().catch(console.error);
//# sourceMappingURL=ssePollingClient.js.map