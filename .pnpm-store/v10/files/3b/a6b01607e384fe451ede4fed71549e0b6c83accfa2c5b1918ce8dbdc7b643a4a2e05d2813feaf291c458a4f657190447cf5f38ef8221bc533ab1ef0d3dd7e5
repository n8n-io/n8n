#!/usr/bin/env node
"use strict";
/**
 * Example demonstrating client_credentials grant for machine-to-machine authentication.
 *
 * Supports two authentication methods based on environment variables:
 *
 * 1. client_secret_basic (default):
 *    MCP_CLIENT_ID - OAuth client ID (required)
 *    MCP_CLIENT_SECRET - OAuth client secret (required)
 *
 * 2. private_key_jwt (when MCP_CLIENT_PRIVATE_KEY_PEM is set):
 *    MCP_CLIENT_ID - OAuth client ID (required)
 *    MCP_CLIENT_PRIVATE_KEY_PEM - PEM-encoded private key for JWT signing (required)
 *    MCP_CLIENT_ALGORITHM - Signing algorithm (default: RS256)
 *
 * Common:
 *    MCP_SERVER_URL - Server URL (default: http://localhost:3000/mcp)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../client/index.js");
const streamableHttp_js_1 = require("../../client/streamableHttp.js");
const auth_extensions_js_1 = require("../../client/auth-extensions.js");
const DEFAULT_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp';
function createProvider() {
    const clientId = process.env.MCP_CLIENT_ID;
    if (!clientId) {
        console.error('MCP_CLIENT_ID environment variable is required');
        process.exit(1);
    }
    // If private key is provided, use private_key_jwt authentication
    const privateKeyPem = process.env.MCP_CLIENT_PRIVATE_KEY_PEM;
    if (privateKeyPem) {
        const algorithm = process.env.MCP_CLIENT_ALGORITHM || 'RS256';
        console.log('Using private_key_jwt authentication');
        return new auth_extensions_js_1.PrivateKeyJwtProvider({
            clientId,
            privateKey: privateKeyPem,
            algorithm
        });
    }
    // Otherwise, use client_secret_basic authentication
    const clientSecret = process.env.MCP_CLIENT_SECRET;
    if (!clientSecret) {
        console.error('MCP_CLIENT_SECRET or MCP_CLIENT_PRIVATE_KEY_PEM environment variable is required');
        process.exit(1);
    }
    console.log('Using client_secret_basic authentication');
    return new auth_extensions_js_1.ClientCredentialsProvider({
        clientId,
        clientSecret
    });
}
async function main() {
    const provider = createProvider();
    const client = new index_js_1.Client({ name: 'client-credentials-example', version: '1.0.0' }, { capabilities: {} });
    const transport = new streamableHttp_js_1.StreamableHTTPClientTransport(new URL(DEFAULT_SERVER_URL), {
        authProvider: provider
    });
    await client.connect(transport);
    console.log('Connected successfully.');
    const tools = await client.listTools();
    console.log('Available tools:', tools.tools.map(t => t.name).join(', ') || '(none)');
    await transport.close();
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=simpleClientCredentials.js.map