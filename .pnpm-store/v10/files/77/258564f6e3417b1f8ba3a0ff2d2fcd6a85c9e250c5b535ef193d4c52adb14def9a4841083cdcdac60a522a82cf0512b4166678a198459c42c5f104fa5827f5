import { randomUUID } from 'node:crypto';
import { McpServer } from '../../server/mcp.js';
import { createMcpExpressApp } from '../../server/express.js';
import { StreamableHTTPServerTransport } from '../../server/streamableHttp.js';
import { InMemoryEventStore } from '../shared/inMemoryEventStore.js';
import cors from 'cors';
// Factory to create a new MCP server per session.
// Each session needs its own server+transport pair to avoid cross-session contamination.
const getServer = () => {
    const server = new McpServer({
        name: 'sse-polling-example',
        version: '1.0.0'
    }, {
        capabilities: { logging: {} }
    });
    // Register a long-running tool that demonstrates server-initiated disconnect
    server.tool('long-task', 'A long-running task that sends progress updates. Server will disconnect mid-task to demonstrate polling.', {}, async (_args, extra) => {
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        console.log(`[${extra.sessionId}] Starting long-task...`);
        // Send first progress notification
        await server.sendLoggingMessage({
            level: 'info',
            data: 'Progress: 25% - Starting work...'
        }, extra.sessionId);
        await sleep(1000);
        // Send second progress notification
        await server.sendLoggingMessage({
            level: 'info',
            data: 'Progress: 50% - Halfway there...'
        }, extra.sessionId);
        await sleep(1000);
        // Server decides to disconnect the client to free resources
        // Client will reconnect via GET with Last-Event-ID after the transport's retryInterval
        // Use extra.closeSSEStream callback - available when eventStore is configured
        if (extra.closeSSEStream) {
            console.log(`[${extra.sessionId}] Closing SSE stream to trigger client polling...`);
            extra.closeSSEStream();
        }
        // Continue processing while client is disconnected
        // Events are stored in eventStore and will be replayed on reconnect
        await sleep(500);
        await server.sendLoggingMessage({
            level: 'info',
            data: 'Progress: 75% - Almost done (sent while client disconnected)...'
        }, extra.sessionId);
        await sleep(500);
        await server.sendLoggingMessage({
            level: 'info',
            data: 'Progress: 100% - Complete!'
        }, extra.sessionId);
        console.log(`[${extra.sessionId}] Task complete`);
        return {
            content: [
                {
                    type: 'text',
                    text: 'Long task completed successfully!'
                }
            ]
        };
    });
    return server;
};
// Set up Express app
const app = createMcpExpressApp();
app.use(cors());
// Create event store for resumability
const eventStore = new InMemoryEventStore();
// Track transports by session ID for session reuse
const transports = new Map();
// Handle all MCP requests
app.all('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    // Reuse existing transport or create new one
    let transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            eventStore,
            retryInterval: 2000, // Default retry interval for priming events
            onsessioninitialized: id => {
                console.log(`[${id}] Session initialized`);
                transports.set(id, transport);
            }
        });
        // Create a new server per session and connect it to the transport
        const server = getServer();
        await server.connect(transport);
    }
    await transport.handleRequest(req, res, req.body);
});
// Start the server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`SSE Polling Example Server running on http://localhost:${PORT}/mcp`);
    console.log('');
    console.log('This server demonstrates SEP-1699 SSE polling:');
    console.log('- retryInterval: 2000ms (client waits 2s before reconnecting)');
    console.log('- eventStore: InMemoryEventStore (events are persisted for replay)');
    console.log('');
    console.log('Try calling the "long-task" tool to see server-initiated disconnect in action.');
});
//# sourceMappingURL=ssePollingExample.js.map