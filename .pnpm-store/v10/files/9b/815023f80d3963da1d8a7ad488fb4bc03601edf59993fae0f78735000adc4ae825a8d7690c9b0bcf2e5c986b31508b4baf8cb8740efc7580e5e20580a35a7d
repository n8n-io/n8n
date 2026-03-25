// Run with: npx tsx src/examples/server/elicitationUrlExample.ts
//
// This example demonstrates how to use URL elicitation to securely collect
// *sensitive* user input in a remote (HTTP) server.
// URL elicitation allows servers to prompt the end-user to open a URL in their browser
// to collect sensitive information.
// Note: See also elicitationFormExample.ts for an example of using form (not URL) elicitation
// to collect *non-sensitive* user input with a structured schema.
import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { McpServer } from '../../server/mcp.js';
import { createMcpExpressApp } from '../../server/express.js';
import { StreamableHTTPServerTransport } from '../../server/streamableHttp.js';
import { getOAuthProtectedResourceMetadataUrl, mcpAuthMetadataRouter } from '../../server/auth/router.js';
import { requireBearerAuth } from '../../server/auth/middleware/bearerAuth.js';
import { UrlElicitationRequiredError, isInitializeRequest } from '../../types.js';
import { InMemoryEventStore } from '../shared/inMemoryEventStore.js';
import { setupAuthServer } from './demoInMemoryOAuthProvider.js';
import { checkResourceAllowed } from '../../shared/auth-utils.js';
import cors from 'cors';
// Create an MCP server with implementation details
const getServer = () => {
    const mcpServer = new McpServer({
        name: 'url-elicitation-http-server',
        version: '1.0.0'
    }, {
        capabilities: { logging: {} }
    });
    mcpServer.registerTool('payment-confirm', {
        description: 'A tool that confirms a payment directly with a user',
        inputSchema: {
            cartId: z.string().describe('The ID of the cart to confirm')
        }
    }, async ({ cartId }, extra) => {
        /*
    In a real world scenario, there would be some logic here to check if the user has the provided cartId.
    For the purposes of this example, we'll throw an error (-> elicits the client to open a URL to confirm payment)
    */
        const sessionId = extra.sessionId;
        if (!sessionId) {
            throw new Error('Expected a Session ID');
        }
        // Create and track the elicitation
        const elicitationId = generateTrackedElicitation(sessionId, elicitationId => mcpServer.server.createElicitationCompletionNotifier(elicitationId));
        throw new UrlElicitationRequiredError([
            {
                mode: 'url',
                message: 'This tool requires a payment confirmation. Open the link to confirm payment!',
                url: `http://localhost:${MCP_PORT}/confirm-payment?session=${sessionId}&elicitation=${elicitationId}&cartId=${encodeURIComponent(cartId)}`,
                elicitationId
            }
        ]);
    });
    mcpServer.registerTool('third-party-auth', {
        description: 'A demo tool that requires third-party OAuth credentials',
        inputSchema: {
            param1: z.string().describe('First parameter')
        }
    }, async (_, extra) => {
        /*
    In a real world scenario, there would be some logic here to check if we already have a valid access token for the user.
    Auth info (with a subject or `sub` claim) can be typically be found in `extra.authInfo`.
    If we do, we can just return the result of the tool call.
    If we don't, we can throw an ElicitationRequiredError to request the user to authenticate.
    For the purposes of this example, we'll throw an error (-> elicits the client to open a URL to authenticate).
  */
        const sessionId = extra.sessionId;
        if (!sessionId) {
            throw new Error('Expected a Session ID');
        }
        // Create and track the elicitation
        const elicitationId = generateTrackedElicitation(sessionId, elicitationId => mcpServer.server.createElicitationCompletionNotifier(elicitationId));
        // Simulate OAuth callback and token exchange after 5 seconds
        // In a real app, this would be called from your OAuth callback handler
        setTimeout(() => {
            console.log(`Simulating OAuth token received for elicitation ${elicitationId}`);
            completeURLElicitation(elicitationId);
        }, 5000);
        throw new UrlElicitationRequiredError([
            {
                mode: 'url',
                message: 'This tool requires access to your example.com account. Open the link to authenticate!',
                url: 'https://www.example.com/oauth/authorize',
                elicitationId
            }
        ]);
    });
    return mcpServer;
};
const elicitationsMap = new Map();
// Clean up old elicitations after 1 hour to prevent memory leaks
const ELICITATION_TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
function cleanupOldElicitations() {
    const now = new Date();
    for (const [id, metadata] of elicitationsMap.entries()) {
        if (now.getTime() - metadata.createdAt.getTime() > ELICITATION_TTL_MS) {
            elicitationsMap.delete(id);
            console.log(`Cleaned up expired elicitation: ${id}`);
        }
    }
}
setInterval(cleanupOldElicitations, CLEANUP_INTERVAL_MS);
/**
 * Elicitation IDs must be unique strings within the MCP session
 * UUIDs are used in this example for simplicity
 */
function generateElicitationId() {
    return randomUUID();
}
/**
 * Helper function to create and track a new elicitation.
 */
function generateTrackedElicitation(sessionId, createCompletionNotifier) {
    const elicitationId = generateElicitationId();
    // Create a Promise and its resolver for tracking completion
    let completeResolver;
    const completedPromise = new Promise(resolve => {
        completeResolver = resolve;
    });
    const completionNotifier = createCompletionNotifier ? createCompletionNotifier(elicitationId) : undefined;
    // Store the elicitation in our map
    elicitationsMap.set(elicitationId, {
        status: 'pending',
        completedPromise,
        completeResolver: completeResolver,
        createdAt: new Date(),
        sessionId,
        completionNotifier
    });
    return elicitationId;
}
/**
 * Helper function to complete an elicitation.
 */
function completeURLElicitation(elicitationId) {
    const elicitation = elicitationsMap.get(elicitationId);
    if (!elicitation) {
        console.warn(`Attempted to complete unknown elicitation: ${elicitationId}`);
        return;
    }
    if (elicitation.status === 'complete') {
        console.warn(`Elicitation already complete: ${elicitationId}`);
        return;
    }
    // Update metadata
    elicitation.status = 'complete';
    // Send completion notification to the client
    if (elicitation.completionNotifier) {
        console.log(`Sending notifications/elicitation/complete notification for elicitation ${elicitationId}`);
        elicitation.completionNotifier().catch(error => {
            console.error(`Failed to send completion notification for elicitation ${elicitationId}:`, error);
        });
    }
    // Resolve the promise to unblock any waiting code
    elicitation.completeResolver();
}
const MCP_PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3000;
const AUTH_PORT = process.env.MCP_AUTH_PORT ? parseInt(process.env.MCP_AUTH_PORT, 10) : 3001;
const app = createMcpExpressApp();
// Allow CORS all domains, expose the Mcp-Session-Id header
app.use(cors({
    origin: '*', // Allow all origins
    exposedHeaders: ['Mcp-Session-Id'],
    credentials: true // Allow cookies to be sent cross-origin
}));
// Set up OAuth (required for this example)
let authMiddleware = null;
// Create auth middleware for MCP endpoints
const mcpServerUrl = new URL(`http://localhost:${MCP_PORT}/mcp`);
const authServerUrl = new URL(`http://localhost:${AUTH_PORT}`);
const oauthMetadata = setupAuthServer({ authServerUrl, mcpServerUrl, strictResource: true });
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
        if (!data.aud) {
            throw new Error(`Resource Indicator (RFC8707) missing`);
        }
        if (!checkResourceAllowed({ requestedResource: data.aud, configuredResource: mcpServerUrl })) {
            throw new Error(`Expected resource indicator ${mcpServerUrl}, got: ${data.aud}`);
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
app.use(mcpAuthMetadataRouter({
    oauthMetadata,
    resourceServerUrl: mcpServerUrl,
    scopesSupported: ['mcp:tools'],
    resourceName: 'MCP Demo Server'
}));
authMiddleware = requireBearerAuth({
    verifier: tokenVerifier,
    requiredScopes: [],
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpServerUrl)
});
/**
 * API Key Form Handling
 *
 * Many servers today require an API key to operate, but there's no scalable way to do this dynamically for remote servers within MCP protocol.
 * URL-mode elicitation enables the server to host a simple form and get the secret data securely from the user without involving the LLM or client.
 **/
async function sendApiKeyElicitation(sessionId, sender, createCompletionNotifier) {
    if (!sessionId) {
        console.error('No session ID provided');
        throw new Error('Expected a Session ID to track elicitation');
    }
    console.log('🔑 URL elicitation demo: Requesting API key from client...');
    const elicitationId = generateTrackedElicitation(sessionId, createCompletionNotifier);
    try {
        const result = await sender({
            mode: 'url',
            message: 'Please provide your API key to authenticate with this server',
            // Host the form on the same server. In a real app, you might coordinate passing these state variables differently.
            url: `http://localhost:${MCP_PORT}/api-key-form?session=${sessionId}&elicitation=${elicitationId}`,
            elicitationId
        });
        switch (result.action) {
            case 'accept':
                console.log('🔑 URL elicitation demo: Client accepted the API key elicitation (now pending form submission)');
                // Wait for the API key to be submitted via the form
                // The form submission will complete the elicitation
                break;
            default:
                console.log('🔑 URL elicitation demo: Client declined to provide an API key');
                // In a real app, this might close the connection, but for the demo, we'll continue
                break;
        }
    }
    catch (error) {
        console.error('Error during API key elicitation:', error);
    }
}
// API Key Form endpoint - serves a simple HTML form
app.get('/api-key-form', (req, res) => {
    const mcpSessionId = req.query.session;
    const elicitationId = req.query.elicitation;
    if (!mcpSessionId || !elicitationId) {
        res.status(400).send('<h1>Error</h1><p>Missing required parameters</p>');
        return;
    }
    // Check for user session cookie
    // In production, this is often handled by some user auth middleware to ensure the user has a valid session
    // This session is different from the MCP session.
    // This userSession is the cookie that the MCP Server's Authorization Server sets for the user when they log in.
    const userSession = getUserSessionCookie(req.headers.cookie);
    if (!userSession) {
        res.status(401).send('<h1>Error</h1><p>Unauthorized - please reconnect to login again</p>');
        return;
    }
    // Serve a simple HTML form
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Submit Your API Key</title>
      <style>
        body { font-family: sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
        input[type="text"] { width: 100%; padding: 8px; margin: 10px 0; box-sizing: border-box; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; cursor: pointer; }
        button:hover { background: #0056b3; }
        .user { background: #d1ecf1; padding: 8px; margin-bottom: 10px; }
        .info { color: #666; font-size: 0.9em; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>API Key Required</h1>
      <div class="user">✓ Logged in as: <strong>${userSession.name}</strong></div>
      <form method="POST" action="/api-key-form">
        <input type="hidden" name="session" value="${mcpSessionId}" />
        <input type="hidden" name="elicitation" value="${elicitationId}" />
        <label>API Key:<br>
          <input type="text" name="apiKey" required placeholder="Enter your API key" />
        </label>
        <button type="submit">Submit</button>
      </form>
      <div class="info">This is a demo showing how a server can securely elicit sensitive data from a user using a URL.</div>
    </body>
    </html>
  `);
});
// Handle API key form submission
app.post('/api-key-form', express.urlencoded(), (req, res) => {
    const { session: sessionId, apiKey, elicitation: elicitationId } = req.body;
    if (!sessionId || !apiKey || !elicitationId) {
        res.status(400).send('<h1>Error</h1><p>Missing required parameters</p>');
        return;
    }
    // Check for user session cookie here too
    const userSession = getUserSessionCookie(req.headers.cookie);
    if (!userSession) {
        res.status(401).send('<h1>Error</h1><p>Unauthorized - please reconnect to login again</p>');
        return;
    }
    // A real app might store this API key to be used later for the user.
    console.log(`🔑 Received API key \x1b[32m${apiKey}\x1b[0m for session ${sessionId}`);
    // If we have an elicitationId, complete the elicitation
    completeURLElicitation(elicitationId);
    // Send a success response
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Success</title>
      <style>
        body { font-family: sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; text-align: center; }
        .success { background: #d4edda; color: #155724; padding: 20px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="success">
        <h1>Success ✓</h1>
        <p>API key received.</p>
      </div>
      <p>You can close this window and return to your MCP client.</p>
    </body>
    </html>
  `);
});
// Helper to get the user session from the demo_session cookie
function getUserSessionCookie(cookieHeader) {
    if (!cookieHeader)
        return null;
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'demo_session' && value) {
            try {
                return JSON.parse(decodeURIComponent(value));
            }
            catch (error) {
                console.error('Failed to parse demo_session cookie:', error);
                return null;
            }
        }
    }
    return null;
}
/**
 * Payment Confirmation Form Handling
 *
 * This demonstrates how a server can use URL-mode elicitation to get user confirmation
 * for sensitive operations like payment processing.
 **/
// Payment Confirmation Form endpoint - serves a simple HTML form
app.get('/confirm-payment', (req, res) => {
    const mcpSessionId = req.query.session;
    const elicitationId = req.query.elicitation;
    const cartId = req.query.cartId;
    if (!mcpSessionId || !elicitationId) {
        res.status(400).send('<h1>Error</h1><p>Missing required parameters</p>');
        return;
    }
    // Check for user session cookie
    // In production, this is often handled by some user auth middleware to ensure the user has a valid session
    // This session is different from the MCP session.
    // This userSession is the cookie that the MCP Server's Authorization Server sets for the user when they log in.
    const userSession = getUserSessionCookie(req.headers.cookie);
    if (!userSession) {
        res.status(401).send('<h1>Error</h1><p>Unauthorized - please reconnect to login again</p>');
        return;
    }
    // Serve a simple HTML form
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Confirm Payment</title>
      <style>
        body { font-family: sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
        button { background: #28a745; color: white; padding: 12px 24px; border: none; cursor: pointer; font-size: 16px; width: 100%; margin: 10px 0; }
        button:hover { background: #218838; }
        button.cancel { background: #6c757d; }
        button.cancel:hover { background: #5a6268; }
        .user { background: #d1ecf1; padding: 8px; margin-bottom: 10px; }
        .cart-info { background: #f8f9fa; padding: 12px; margin: 15px 0; border-left: 4px solid #007bff; }
        .info { color: #666; font-size: 0.9em; margin-top: 20px; }
        .warning { background: #fff3cd; color: #856404; padding: 12px; margin: 15px 0; border-left: 4px solid #ffc107; }
      </style>
    </head>
    <body>
      <h1>Confirm Payment</h1>
      <div class="user">✓ Logged in as: <strong>${userSession.name}</strong></div>
      ${cartId ? `<div class="cart-info"><strong>Cart ID:</strong> ${cartId}</div>` : ''}
      <div class="warning">
        <strong>⚠️ Please review your order before confirming.</strong>
      </div>
      <form method="POST" action="/confirm-payment">
        <input type="hidden" name="session" value="${mcpSessionId}" />
        <input type="hidden" name="elicitation" value="${elicitationId}" />
        ${cartId ? `<input type="hidden" name="cartId" value="${cartId}" />` : ''}
        <button type="submit" name="action" value="confirm">Confirm Payment</button>
        <button type="submit" name="action" value="cancel" class="cancel">Cancel</button>
      </form>
      <div class="info">This is a demo showing how a server can securely get user confirmation for sensitive operations using URL-mode elicitation.</div>
    </body>
    </html>
  `);
});
// Handle Payment Confirmation form submission
app.post('/confirm-payment', express.urlencoded(), (req, res) => {
    const { session: sessionId, elicitation: elicitationId, cartId, action } = req.body;
    if (!sessionId || !elicitationId) {
        res.status(400).send('<h1>Error</h1><p>Missing required parameters</p>');
        return;
    }
    // Check for user session cookie here too
    const userSession = getUserSessionCookie(req.headers.cookie);
    if (!userSession) {
        res.status(401).send('<h1>Error</h1><p>Unauthorized - please reconnect to login again</p>');
        return;
    }
    if (action === 'confirm') {
        // A real app would process the payment here
        console.log(`💳 Payment confirmed for cart ${cartId || 'unknown'} by user ${userSession.name} (session ${sessionId})`);
        // Complete the elicitation
        completeURLElicitation(elicitationId);
        // Send a success response
        res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Confirmed</title>
        <style>
          body { font-family: sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; text-align: center; }
          .success { background: #d4edda; color: #155724; padding: 20px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>Payment Confirmed ✓</h1>
          <p>Your payment has been successfully processed.</p>
          ${cartId ? `<p><strong>Cart ID:</strong> ${cartId}</p>` : ''}
        </div>
        <p>You can close this window and return to your MCP client.</p>
      </body>
      </html>
    `);
    }
    else if (action === 'cancel') {
        console.log(`💳 Payment cancelled for cart ${cartId || 'unknown'} by user ${userSession.name} (session ${sessionId})`);
        // The client will still receive a notifications/elicitation/complete notification,
        // which indicates that the out-of-band interaction is complete (but not necessarily successful)
        completeURLElicitation(elicitationId);
        res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Cancelled</title>
        <style>
          body { font-family: sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; text-align: center; }
          .info { background: #d1ecf1; color: #0c5460; padding: 20px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="info">
          <h1>Payment Cancelled</h1>
          <p>Your payment has been cancelled.</p>
        </div>
        <p>You can close this window and return to your MCP client.</p>
      </body>
      </html>
    `);
    }
    else {
        res.status(400).send('<h1>Error</h1><p>Invalid action</p>');
    }
});
// Map to store transports by session ID
const transports = {};
const sessionsNeedingElicitation = {};
// MCP POST endpoint
const mcpPostHandler = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    console.debug(`Received MCP POST for session: ${sessionId || 'unknown'}`);
    try {
        let transport;
        if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
        }
        else if (!sessionId && isInitializeRequest(req.body)) {
            const server = getServer();
            // New initialization request
            const eventStore = new InMemoryEventStore();
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                eventStore, // Enable resumability
                onsessioninitialized: sessionId => {
                    // Store the transport by session ID when session is initialized
                    // This avoids race conditions where requests might come in before the session is stored
                    console.log(`Session initialized with ID: ${sessionId}`);
                    transports[sessionId] = transport;
                    sessionsNeedingElicitation[sessionId] = {
                        elicitationSender: params => server.server.elicitInput(params),
                        createCompletionNotifier: elicitationId => server.server.createElicitationCompletionNotifier(elicitationId)
                    };
                }
            });
            // Set up onclose handler to clean up transport when closed
            transport.onclose = () => {
                const sid = transport.sessionId;
                if (sid && transports[sid]) {
                    console.log(`Transport closed for session ${sid}, removing from transports map`);
                    delete transports[sid];
                    delete sessionsNeedingElicitation[sid];
                }
            };
            // Connect the transport to the MCP server BEFORE handling the request
            // so responses can flow back through the same transport
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
// Set up routes with auth middleware
app.post('/mcp', authMiddleware, mcpPostHandler);
// Handle GET requests for SSE streams (using built-in support from StreamableHTTP)
const mcpGetHandler = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
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
    if (sessionsNeedingElicitation[sessionId]) {
        const { elicitationSender, createCompletionNotifier } = sessionsNeedingElicitation[sessionId];
        // Send an elicitation request to the client in the background
        sendApiKeyElicitation(sessionId, elicitationSender, createCompletionNotifier)
            .then(() => {
            // Only delete on successful send for this demo
            delete sessionsNeedingElicitation[sessionId];
            console.log(`🔑 URL elicitation demo: Finished sending API key elicitation request for session ${sessionId}`);
        })
            .catch(error => {
            console.error('Error sending API key elicitation:', error);
            // Keep in map to potentially retry on next reconnect
        });
    }
};
// Set up GET route with conditional auth middleware
app.get('/mcp', authMiddleware, mcpGetHandler);
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
// Set up DELETE route with auth middleware
app.delete('/mcp', authMiddleware, mcpDeleteHandler);
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
            delete sessionsNeedingElicitation[sessionId];
        }
        catch (error) {
            console.error(`Error closing transport for session ${sessionId}:`, error);
        }
    }
    console.log('Server shutdown complete');
    process.exit(0);
});
//# sourceMappingURL=elicitationUrlExample.js.map