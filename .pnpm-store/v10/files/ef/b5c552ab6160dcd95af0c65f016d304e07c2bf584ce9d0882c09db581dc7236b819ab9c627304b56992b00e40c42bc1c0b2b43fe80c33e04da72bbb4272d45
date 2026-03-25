"use strict";
// Run with: npx tsx src/examples/client/elicitationUrlExample.ts
//
// This example demonstrates how to use URL elicitation to securely
// collect user input in a remote (HTTP) server.
// URL elicitation allows servers to prompt the end-user to open a URL in their browser
// to collect sensitive information.
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../client/index.js");
const streamableHttp_js_1 = require("../../client/streamableHttp.js");
const node_readline_1 = require("node:readline");
const types_js_1 = require("../../types.js");
const metadataUtils_js_1 = require("../../shared/metadataUtils.js");
const node_child_process_1 = require("node:child_process");
const simpleOAuthClientProvider_js_1 = require("./simpleOAuthClientProvider.js");
const auth_js_1 = require("../../client/auth.js");
const node_http_1 = require("node:http");
// Set up OAuth (required for this example)
const OAUTH_CALLBACK_PORT = 8090; // Use different port than auth server (3001)
const OAUTH_CALLBACK_URL = `http://localhost:${OAUTH_CALLBACK_PORT}/callback`;
let oauthProvider = undefined;
console.log('Getting OAuth token...');
const clientMetadata = {
    client_name: 'Elicitation MCP Client',
    redirect_uris: [OAUTH_CALLBACK_URL],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post',
    scope: 'mcp:tools'
};
oauthProvider = new simpleOAuthClientProvider_js_1.InMemoryOAuthClientProvider(OAUTH_CALLBACK_URL, clientMetadata, (redirectUrl) => {
    console.log(`🌐 Opening browser for OAuth redirect: ${redirectUrl.toString()}`);
    openBrowser(redirectUrl.toString());
});
// Create readline interface for user input
const readline = (0, node_readline_1.createInterface)({
    input: process.stdin,
    output: process.stdout
});
let abortCommand = new AbortController();
// Global client and transport for interactive commands
let client = null;
let transport = null;
let serverUrl = 'http://localhost:3000/mcp';
let sessionId = undefined;
let isProcessingCommand = false;
let isProcessingElicitations = false;
const elicitationQueue = [];
let elicitationQueueSignal = null;
let elicitationsCompleteSignal = null;
// Map to track pending URL elicitations waiting for completion notifications
const pendingURLElicitations = new Map();
async function main() {
    console.log('MCP Interactive Client');
    console.log('=====================');
    // Connect to server immediately with default settings
    await connect();
    // Start the elicitation loop in the background
    elicitationLoop().catch(error => {
        console.error('Unexpected error in elicitation loop:', error);
        process.exit(1);
    });
    // Short delay allowing the server to send any SSE elicitations on connection
    await new Promise(resolve => setTimeout(resolve, 200));
    // Wait until we are done processing any initial elicitations
    await waitForElicitationsToComplete();
    // Print help and start the command loop
    printHelp();
    await commandLoop();
}
async function waitForElicitationsToComplete() {
    // Wait until the queue is empty and nothing is being processed
    while (elicitationQueue.length > 0 || isProcessingElicitations) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}
function printHelp() {
    console.log('\nAvailable commands:');
    console.log('  connect [url]              - Connect to MCP server (default: http://localhost:3000/mcp)');
    console.log('  disconnect                 - Disconnect from server');
    console.log('  terminate-session          - Terminate the current session');
    console.log('  reconnect                  - Reconnect to the server');
    console.log('  list-tools                 - List available tools');
    console.log('  call-tool <name> [args]    - Call a tool with optional JSON arguments');
    console.log('  payment-confirm            - Test URL elicitation via error response with payment-confirm tool');
    console.log('  third-party-auth           - Test tool that requires third-party OAuth credentials');
    console.log('  help                       - Show this help');
    console.log('  quit                       - Exit the program');
}
async function commandLoop() {
    await new Promise(resolve => {
        if (!isProcessingElicitations) {
            resolve();
        }
        else {
            elicitationsCompleteSignal = resolve;
        }
    });
    readline.question('\n> ', { signal: abortCommand.signal }, async (input) => {
        isProcessingCommand = true;
        const args = input.trim().split(/\s+/);
        const command = args[0]?.toLowerCase();
        try {
            switch (command) {
                case 'connect':
                    await connect(args[1]);
                    break;
                case 'disconnect':
                    await disconnect();
                    break;
                case 'terminate-session':
                    await terminateSession();
                    break;
                case 'reconnect':
                    await reconnect();
                    break;
                case 'list-tools':
                    await listTools();
                    break;
                case 'call-tool':
                    if (args.length < 2) {
                        console.log('Usage: call-tool <name> [args]');
                    }
                    else {
                        const toolName = args[1];
                        let toolArgs = {};
                        if (args.length > 2) {
                            try {
                                toolArgs = JSON.parse(args.slice(2).join(' '));
                            }
                            catch {
                                console.log('Invalid JSON arguments. Using empty args.');
                            }
                        }
                        await callTool(toolName, toolArgs);
                    }
                    break;
                case 'payment-confirm':
                    await callPaymentConfirmTool();
                    break;
                case 'third-party-auth':
                    await callThirdPartyAuthTool();
                    break;
                case 'help':
                    printHelp();
                    break;
                case 'quit':
                case 'exit':
                    await cleanup();
                    return;
                default:
                    if (command) {
                        console.log(`Unknown command: ${command}`);
                    }
                    break;
            }
        }
        catch (error) {
            console.error(`Error executing command: ${error}`);
        }
        finally {
            isProcessingCommand = false;
        }
        // Process another command after we've processed the this one
        await commandLoop();
    });
}
async function elicitationLoop() {
    while (true) {
        // Wait until we have elicitations to process
        await new Promise(resolve => {
            if (elicitationQueue.length > 0) {
                resolve();
            }
            else {
                elicitationQueueSignal = resolve;
            }
        });
        isProcessingElicitations = true;
        abortCommand.abort(); // Abort the command loop if it's running
        // Process all queued elicitations
        while (elicitationQueue.length > 0) {
            const queued = elicitationQueue.shift();
            console.log(`📤 Processing queued elicitation (${elicitationQueue.length} remaining)`);
            try {
                const result = await handleElicitationRequest(queued.request);
                queued.resolve(result);
            }
            catch (error) {
                queued.reject(error instanceof Error ? error : new Error(String(error)));
            }
        }
        console.log('✅ All queued elicitations processed. Resuming command loop...\n');
        isProcessingElicitations = false;
        // Reset the abort controller for the next command loop
        abortCommand = new AbortController();
        // Resume the command loop
        if (elicitationsCompleteSignal) {
            elicitationsCompleteSignal();
            elicitationsCompleteSignal = null;
        }
    }
}
async function openBrowser(url) {
    const command = `open "${url}"`;
    (0, node_child_process_1.exec)(command, error => {
        if (error) {
            console.error(`Failed to open browser: ${error.message}`);
            console.log(`Please manually open: ${url}`);
        }
    });
}
/**
 * Enqueues an elicitation request and returns the result.
 *
 * This function is used so that our CLI (which can only handle one input request at a time)
 * can handle elicitation requests and the command loop.
 *
 * @param request - The elicitation request to be handled
 * @returns The elicitation result
 */
async function elicitationRequestHandler(request) {
    // If we are processing a command, handle this elicitation immediately
    if (isProcessingCommand) {
        console.log('📋 Processing elicitation immediately (during command execution)');
        return await handleElicitationRequest(request);
    }
    // Otherwise, queue the request to be handled by the elicitation loop
    console.log(`📥 Queueing elicitation request (queue size will be: ${elicitationQueue.length + 1})`);
    return new Promise((resolve, reject) => {
        elicitationQueue.push({
            request,
            resolve,
            reject
        });
        // Signal the elicitation loop that there's work to do
        if (elicitationQueueSignal) {
            elicitationQueueSignal();
            elicitationQueueSignal = null;
        }
    });
}
/**
 * Handles an elicitation request.
 *
 * This function is used to handle the elicitation request and return the result.
 *
 * @param request - The elicitation request to be handled
 * @returns The elicitation result
 */
async function handleElicitationRequest(request) {
    const mode = request.params.mode;
    console.log('\n🔔 Elicitation Request Received:');
    console.log(`Mode: ${mode}`);
    if (mode === 'url') {
        return {
            action: await handleURLElicitation(request.params)
        };
    }
    else {
        // Should not happen because the client declares its capabilities to the server,
        // but being defensive is a good practice:
        throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Unsupported elicitation mode: ${mode}`);
    }
}
/**
 * Handles a URL elicitation by opening the URL in the browser.
 *
 * Note: This is a shared code for both request handlers and error handlers.
 * As a result of sharing schema, there is no big forking of logic for the client.
 *
 * @param params - The URL elicitation request parameters
 * @returns The action to take (accept, cancel, or decline)
 */
async function handleURLElicitation(params) {
    const url = params.url;
    const elicitationId = params.elicitationId;
    const message = params.message;
    console.log(`🆔 Elicitation ID: ${elicitationId}`); // Print for illustration
    // Parse URL to show domain for security
    let domain = 'unknown domain';
    try {
        const parsedUrl = new URL(url);
        domain = parsedUrl.hostname;
    }
    catch {
        console.error('Invalid URL provided by server');
        return 'decline';
    }
    // Example security warning to help prevent phishing attacks
    console.log('\n⚠️  \x1b[33mSECURITY WARNING\x1b[0m ⚠️');
    console.log('\x1b[33mThe server is requesting you to open an external URL.\x1b[0m');
    console.log('\x1b[33mOnly proceed if you trust this server and understand why it needs this.\x1b[0m\n');
    console.log(`🌐 Target domain: \x1b[36m${domain}\x1b[0m`);
    console.log(`🔗 Full URL: \x1b[36m${url}\x1b[0m`);
    console.log(`\nℹ️ Server's reason:\n\n\x1b[36m${message}\x1b[0m\n`);
    // 1. Ask for user consent to open the URL
    const consent = await new Promise(resolve => {
        readline.question('\nDo you want to open this URL in your browser? (y/n): ', input => {
            resolve(input.trim().toLowerCase());
        });
    });
    // 2. If user did not consent, return appropriate result
    if (consent === 'no' || consent === 'n') {
        console.log('❌ URL navigation declined.');
        return 'decline';
    }
    else if (consent !== 'yes' && consent !== 'y') {
        console.log('🚫 Invalid response. Cancelling elicitation.');
        return 'cancel';
    }
    // 3. Wait for completion notification in the background
    const completionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pendingURLElicitations.delete(elicitationId);
            console.log(`\x1b[31m❌ Elicitation ${elicitationId} timed out waiting for completion.\x1b[0m`);
            reject(new Error('Elicitation completion timeout'));
        }, 5 * 60 * 1000); // 5 minute timeout
        pendingURLElicitations.set(elicitationId, {
            resolve: () => {
                clearTimeout(timeout);
                resolve();
            },
            reject,
            timeout
        });
    });
    completionPromise.catch(error => {
        console.error('Background completion wait failed:', error);
    });
    // 4. Open the URL in the browser
    console.log(`\n🚀 Opening browser to: ${url}`);
    await openBrowser(url);
    console.log('\n⏳ Waiting for you to complete the interaction in your browser...');
    console.log('   The server will send a notification once you complete the action.');
    // 5. Acknowledge the user accepted the elicitation
    return 'accept';
}
/**
 * Example OAuth callback handler - in production, use a more robust approach
 * for handling callbacks and storing tokens
 */
/**
 * Starts a temporary HTTP server to receive the OAuth callback
 */
async function waitForOAuthCallback() {
    return new Promise((resolve, reject) => {
        const server = (0, node_http_1.createServer)((req, res) => {
            // Ignore favicon requests
            if (req.url === '/favicon.ico') {
                res.writeHead(404);
                res.end();
                return;
            }
            console.log(`📥 Received callback: ${req.url}`);
            const parsedUrl = new URL(req.url || '', 'http://localhost');
            const code = parsedUrl.searchParams.get('code');
            const error = parsedUrl.searchParams.get('error');
            if (code) {
                console.log(`✅ Authorization code received: ${code?.substring(0, 10)}...`);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
          <html>
            <body>
              <h1>Authorization Successful!</h1>
              <p>This simulates successful authorization of the MCP client, which now has an access token for the MCP server.</p>
              <p>This window will close automatically in 10 seconds.</p>
              <script>setTimeout(() => window.close(), 10000);</script>
            </body>
          </html>
        `);
                resolve(code);
                setTimeout(() => server.close(), 15000);
            }
            else if (error) {
                console.log(`❌ Authorization error: ${error}`);
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end(`
          <html>
            <body>
              <h1>Authorization Failed</h1>
              <p>Error: ${error}</p>
            </body>
          </html>
        `);
                reject(new Error(`OAuth authorization failed: ${error}`));
            }
            else {
                console.log(`❌ No authorization code or error in callback`);
                res.writeHead(400);
                res.end('Bad request');
                reject(new Error('No authorization code provided'));
            }
        });
        server.listen(OAUTH_CALLBACK_PORT, () => {
            console.log(`OAuth callback server started on http://localhost:${OAUTH_CALLBACK_PORT}`);
        });
    });
}
/**
 * Attempts to connect to the MCP server with OAuth authentication.
 * Handles OAuth flow recursively if authorization is required.
 */
async function attemptConnection(oauthProvider) {
    console.log('🚢 Creating transport with OAuth provider...');
    const baseUrl = new URL(serverUrl);
    transport = new streamableHttp_js_1.StreamableHTTPClientTransport(baseUrl, {
        sessionId: sessionId,
        authProvider: oauthProvider
    });
    console.log('🚢 Transport created');
    try {
        console.log('🔌 Attempting connection (this will trigger OAuth redirect if needed)...');
        await client.connect(transport);
        sessionId = transport.sessionId;
        console.log('Transport created with session ID:', sessionId);
        console.log('✅ Connected successfully');
    }
    catch (error) {
        if (error instanceof auth_js_1.UnauthorizedError) {
            console.log('🔐 OAuth required - waiting for authorization...');
            const callbackPromise = waitForOAuthCallback();
            const authCode = await callbackPromise;
            await transport.finishAuth(authCode);
            console.log('🔐 Authorization code received:', authCode);
            console.log('🔌 Reconnecting with authenticated transport...');
            // Recursively retry connection after OAuth completion
            await attemptConnection(oauthProvider);
        }
        else {
            console.error('❌ Connection failed with non-auth error:', error);
            throw error;
        }
    }
}
async function connect(url) {
    if (client) {
        console.log('Already connected. Disconnect first.');
        return;
    }
    if (url) {
        serverUrl = url;
    }
    console.log(`🔗 Attempting to connect to ${serverUrl}...`);
    // Create a new client with elicitation capability
    console.log('👤 Creating MCP client...');
    client = new index_js_1.Client({
        name: 'example-client',
        version: '1.0.0'
    }, {
        capabilities: {
            elicitation: {
                // Only URL elicitation is supported in this demo
                // (see server/elicitationExample.ts for a demo of form mode elicitation)
                url: {}
            }
        }
    });
    console.log('👤 Client created');
    // Set up elicitation request handler with proper validation
    client.setRequestHandler(types_js_1.ElicitRequestSchema, elicitationRequestHandler);
    // Set up notification handler for elicitation completion
    client.setNotificationHandler(types_js_1.ElicitationCompleteNotificationSchema, notification => {
        const { elicitationId } = notification.params;
        const pending = pendingURLElicitations.get(elicitationId);
        if (pending) {
            clearTimeout(pending.timeout);
            pendingURLElicitations.delete(elicitationId);
            console.log(`\x1b[32m✅ Elicitation ${elicitationId} completed!\x1b[0m`);
            pending.resolve();
        }
        else {
            // Shouldn't happen - discard it!
            console.warn(`Received completion notification for unknown elicitation: ${elicitationId}`);
        }
    });
    try {
        console.log('🔐 Starting OAuth flow...');
        await attemptConnection(oauthProvider);
        console.log('Connected to MCP server');
        // Set up error handler after connection is established so we don't double log errors
        client.onerror = error => {
            console.error('\x1b[31mClient error:', error, '\x1b[0m');
        };
    }
    catch (error) {
        console.error('Failed to connect:', error);
        client = null;
        transport = null;
        return;
    }
}
async function disconnect() {
    if (!client || !transport) {
        console.log('Not connected.');
        return;
    }
    try {
        await transport.close();
        console.log('Disconnected from MCP server');
        client = null;
        transport = null;
    }
    catch (error) {
        console.error('Error disconnecting:', error);
    }
}
async function terminateSession() {
    if (!client || !transport) {
        console.log('Not connected.');
        return;
    }
    try {
        console.log('Terminating session with ID:', transport.sessionId);
        await transport.terminateSession();
        console.log('Session terminated successfully');
        // Check if sessionId was cleared after termination
        if (!transport.sessionId) {
            console.log('Session ID has been cleared');
            sessionId = undefined;
            // Also close the transport and clear client objects
            await transport.close();
            console.log('Transport closed after session termination');
            client = null;
            transport = null;
        }
        else {
            console.log('Server responded with 405 Method Not Allowed (session termination not supported)');
            console.log('Session ID is still active:', transport.sessionId);
        }
    }
    catch (error) {
        console.error('Error terminating session:', error);
    }
}
async function reconnect() {
    if (client) {
        await disconnect();
    }
    await connect();
}
async function listTools() {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
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
                console.log(`  - id: ${tool.name}, name: ${(0, metadataUtils_js_1.getDisplayName)(tool)}, description: ${tool.description}`);
            }
        }
    }
    catch (error) {
        console.log(`Tools not supported by this server (${error})`);
    }
}
async function callTool(name, args) {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    try {
        const request = {
            method: 'tools/call',
            params: {
                name,
                arguments: args
            }
        };
        console.log(`Calling tool '${name}' with args:`, args);
        const result = await client.request(request, types_js_1.CallToolResultSchema);
        console.log('Tool result:');
        const resourceLinks = [];
        result.content.forEach(item => {
            if (item.type === 'text') {
                console.log(`  ${item.text}`);
            }
            else if (item.type === 'resource_link') {
                const resourceLink = item;
                resourceLinks.push(resourceLink);
                console.log(`  📁 Resource Link: ${resourceLink.name}`);
                console.log(`     URI: ${resourceLink.uri}`);
                if (resourceLink.mimeType) {
                    console.log(`     Type: ${resourceLink.mimeType}`);
                }
                if (resourceLink.description) {
                    console.log(`     Description: ${resourceLink.description}`);
                }
            }
            else if (item.type === 'resource') {
                console.log(`  [Embedded Resource: ${item.resource.uri}]`);
            }
            else if (item.type === 'image') {
                console.log(`  [Image: ${item.mimeType}]`);
            }
            else if (item.type === 'audio') {
                console.log(`  [Audio: ${item.mimeType}]`);
            }
            else {
                console.log(`  [Unknown content type]:`, item);
            }
        });
        // Offer to read resource links
        if (resourceLinks.length > 0) {
            console.log(`\nFound ${resourceLinks.length} resource link(s). Use 'read-resource <uri>' to read their content.`);
        }
    }
    catch (error) {
        if (error instanceof types_js_1.UrlElicitationRequiredError) {
            console.log('\n🔔 Elicitation Required Error Received:');
            console.log(`Message: ${error.message}`);
            for (const e of error.elicitations) {
                await handleURLElicitation(e); // For the error handler, we discard the action result because we don't respond to an error response
            }
            return;
        }
        console.log(`Error calling tool ${name}: ${error}`);
    }
}
async function cleanup() {
    if (client && transport) {
        try {
            // First try to terminate the session gracefully
            if (transport.sessionId) {
                try {
                    console.log('Terminating session before exit...');
                    await transport.terminateSession();
                    console.log('Session terminated successfully');
                }
                catch (error) {
                    console.error('Error terminating session:', error);
                }
            }
            // Then close the transport
            await transport.close();
        }
        catch (error) {
            console.error('Error closing transport:', error);
        }
    }
    process.stdin.setRawMode(false);
    readline.close();
    console.log('\nGoodbye!');
    process.exit(0);
}
async function callPaymentConfirmTool() {
    console.log('Calling payment-confirm tool...');
    await callTool('payment-confirm', { cartId: 'cart_123' });
}
async function callThirdPartyAuthTool() {
    console.log('Calling third-party-auth tool...');
    await callTool('third-party-auth', { param1: 'test' });
}
// Set up raw mode for keyboard input to capture Escape key
process.stdin.setRawMode(true);
process.stdin.on('data', async (data) => {
    // Check for Escape key (27)
    if (data.length === 1 && data[0] === 27) {
        console.log('\nESC key pressed. Disconnecting from server...');
        // Abort current operation and disconnect from server
        if (client && transport) {
            await disconnect();
            console.log('Disconnected. Press Enter to continue.');
        }
        else {
            console.log('Not connected to server.');
        }
        // Re-display the prompt
        process.stdout.write('> ');
    }
});
// Handle Ctrl+C
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Cleaning up...');
    await cleanup();
});
// Start the interactive client
main().catch((error) => {
    console.error('Error running MCP client:', error);
    process.exit(1);
});
//# sourceMappingURL=elicitationUrlExample.js.map