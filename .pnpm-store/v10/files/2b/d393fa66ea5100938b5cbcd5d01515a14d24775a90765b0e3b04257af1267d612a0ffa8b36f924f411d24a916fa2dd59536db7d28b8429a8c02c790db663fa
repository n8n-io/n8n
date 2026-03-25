import { randomUUID } from 'node:crypto';
import express from 'express';
import { createOAuthMetadata, mcpAuthRouter } from '../../server/auth/router.js';
import { resourceUrlFromServerUrl } from '../../shared/auth-utils.js';
import { InvalidRequestError } from '../../server/auth/errors.js';
export class DemoInMemoryClientsStore {
    constructor() {
        this.clients = new Map();
    }
    async getClient(clientId) {
        return this.clients.get(clientId);
    }
    async registerClient(clientMetadata) {
        this.clients.set(clientMetadata.client_id, clientMetadata);
        return clientMetadata;
    }
}
/**
 * 🚨 DEMO ONLY - NOT FOR PRODUCTION
 *
 * This example demonstrates MCP OAuth flow but lacks some of the features required for production use,
 * for example:
 * - Persistent token storage
 * - Rate limiting
 */
export class DemoInMemoryAuthProvider {
    constructor(validateResource) {
        this.validateResource = validateResource;
        this.clientsStore = new DemoInMemoryClientsStore();
        this.codes = new Map();
        this.tokens = new Map();
    }
    async authorize(client, params, res) {
        const code = randomUUID();
        const searchParams = new URLSearchParams({
            code
        });
        if (params.state !== undefined) {
            searchParams.set('state', params.state);
        }
        this.codes.set(code, {
            client,
            params
        });
        // Simulate a user login
        // Set a secure HTTP-only session cookie with authorization info
        if (res.cookie) {
            const authCookieData = {
                userId: 'demo_user',
                name: 'Demo User',
                timestamp: Date.now()
            };
            res.cookie('demo_session', JSON.stringify(authCookieData), {
                httpOnly: true,
                secure: false, // In production, this should be true
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000, // 24 hours - for demo purposes
                path: '/' // Available to all routes
            });
        }
        if (!client.redirect_uris.includes(params.redirectUri)) {
            throw new InvalidRequestError('Unregistered redirect_uri');
        }
        const targetUrl = new URL(params.redirectUri);
        targetUrl.search = searchParams.toString();
        res.redirect(targetUrl.toString());
    }
    async challengeForAuthorizationCode(client, authorizationCode) {
        // Store the challenge with the code data
        const codeData = this.codes.get(authorizationCode);
        if (!codeData) {
            throw new Error('Invalid authorization code');
        }
        return codeData.params.codeChallenge;
    }
    async exchangeAuthorizationCode(client, authorizationCode, 
    // Note: code verifier is checked in token.ts by default
    // it's unused here for that reason.
    _codeVerifier) {
        const codeData = this.codes.get(authorizationCode);
        if (!codeData) {
            throw new Error('Invalid authorization code');
        }
        if (codeData.client.client_id !== client.client_id) {
            throw new Error(`Authorization code was not issued to this client, ${codeData.client.client_id} != ${client.client_id}`);
        }
        if (this.validateResource && !this.validateResource(codeData.params.resource)) {
            throw new Error(`Invalid resource: ${codeData.params.resource}`);
        }
        this.codes.delete(authorizationCode);
        const token = randomUUID();
        const tokenData = {
            token,
            clientId: client.client_id,
            scopes: codeData.params.scopes || [],
            expiresAt: Date.now() + 3600000, // 1 hour
            resource: codeData.params.resource,
            type: 'access'
        };
        this.tokens.set(token, tokenData);
        return {
            access_token: token,
            token_type: 'bearer',
            expires_in: 3600,
            scope: (codeData.params.scopes || []).join(' ')
        };
    }
    async exchangeRefreshToken(_client, _refreshToken, _scopes, _resource) {
        throw new Error('Not implemented for example demo');
    }
    async verifyAccessToken(token) {
        const tokenData = this.tokens.get(token);
        if (!tokenData || !tokenData.expiresAt || tokenData.expiresAt < Date.now()) {
            throw new Error('Invalid or expired token');
        }
        return {
            token,
            clientId: tokenData.clientId,
            scopes: tokenData.scopes,
            expiresAt: Math.floor(tokenData.expiresAt / 1000),
            resource: tokenData.resource
        };
    }
}
export const setupAuthServer = ({ authServerUrl, mcpServerUrl, strictResource }) => {
    // Create separate auth server app
    // NOTE: This is a separate app on a separate port to illustrate
    // how to separate an OAuth Authorization Server from a Resource
    // server in the SDK. The SDK is not intended to be provide a standalone
    // authorization server.
    const validateResource = strictResource
        ? (resource) => {
            if (!resource)
                return false;
            const expectedResource = resourceUrlFromServerUrl(mcpServerUrl);
            return resource.toString() === expectedResource.toString();
        }
        : undefined;
    const provider = new DemoInMemoryAuthProvider(validateResource);
    const authApp = express();
    authApp.use(express.json());
    // For introspection requests
    authApp.use(express.urlencoded());
    // Add OAuth routes to the auth server
    // NOTE: this will also add a protected resource metadata route,
    // but it won't be used, so leave it.
    authApp.use(mcpAuthRouter({
        provider,
        issuerUrl: authServerUrl,
        scopesSupported: ['mcp:tools']
    }));
    authApp.post('/introspect', async (req, res) => {
        try {
            const { token } = req.body;
            if (!token) {
                res.status(400).json({ error: 'Token is required' });
                return;
            }
            const tokenInfo = await provider.verifyAccessToken(token);
            res.json({
                active: true,
                client_id: tokenInfo.clientId,
                scope: tokenInfo.scopes.join(' '),
                exp: tokenInfo.expiresAt,
                aud: tokenInfo.resource
            });
            return;
        }
        catch (error) {
            res.status(401).json({
                active: false,
                error: 'Unauthorized',
                error_description: `Invalid token: ${error}`
            });
        }
    });
    const auth_port = authServerUrl.port;
    // Start the auth server
    authApp.listen(auth_port, error => {
        if (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
        console.log(`OAuth Authorization Server listening on port ${auth_port}`);
    });
    // Note: we could fetch this from the server, but then we end up
    // with some top level async which gets annoying.
    const oauthMetadata = createOAuthMetadata({
        provider,
        issuerUrl: authServerUrl,
        scopesSupported: ['mcp:tools']
    });
    oauthMetadata.introspection_endpoint = new URL('/introspect', authServerUrl).href;
    return oauthMetadata;
};
//# sourceMappingURL=demoInMemoryOAuthProvider.js.map