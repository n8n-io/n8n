"use strict";
/**
 * OAuth provider extensions for specialized authentication flows.
 *
 * This module provides ready-to-use OAuthClientProvider implementations
 * for common machine-to-machine authentication scenarios.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticPrivateKeyJwtProvider = exports.PrivateKeyJwtProvider = exports.ClientCredentialsProvider = void 0;
exports.createPrivateKeyJwtAuth = createPrivateKeyJwtAuth;
/**
 * Helper to produce a private_key_jwt client authentication function.
 *
 * Usage:
 *   const addClientAuth = createPrivateKeyJwtAuth({ issuer, subject, privateKey, alg, audience? });
 *   // pass addClientAuth as provider.addClientAuthentication implementation
 */
function createPrivateKeyJwtAuth(options) {
    return async (_headers, params, url, metadata) => {
        // Lazy import to avoid heavy dependency unless used
        if (typeof globalThis.crypto === 'undefined') {
            throw new TypeError('crypto is not available, please ensure you add have Web Crypto API support for older Node.js versions (see https://github.com/modelcontextprotocol/typescript-sdk#nodejs-web-crypto-globalthiscrypto-compatibility)');
        }
        const jose = await Promise.resolve().then(() => __importStar(require('jose')));
        const audience = String(options.audience ?? metadata?.issuer ?? url);
        const lifetimeSeconds = options.lifetimeSeconds ?? 300;
        const now = Math.floor(Date.now() / 1000);
        const jti = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const baseClaims = {
            iss: options.issuer,
            sub: options.subject,
            aud: audience,
            exp: now + lifetimeSeconds,
            iat: now,
            jti
        };
        const claims = options.claims ? { ...baseClaims, ...options.claims } : baseClaims;
        // Import key for the requested algorithm
        const alg = options.alg;
        let key;
        if (typeof options.privateKey === 'string') {
            if (alg.startsWith('RS') || alg.startsWith('ES') || alg.startsWith('PS')) {
                key = await jose.importPKCS8(options.privateKey, alg);
            }
            else if (alg.startsWith('HS')) {
                key = new TextEncoder().encode(options.privateKey);
            }
            else {
                throw new Error(`Unsupported algorithm ${alg}`);
            }
        }
        else if (options.privateKey instanceof Uint8Array) {
            if (alg.startsWith('HS')) {
                key = options.privateKey;
            }
            else {
                // Assume PKCS#8 DER in Uint8Array for asymmetric algorithms
                key = await jose.importPKCS8(new TextDecoder().decode(options.privateKey), alg);
            }
        }
        else {
            // Treat as JWK
            key = await jose.importJWK(options.privateKey, alg);
        }
        // Sign JWT
        const assertion = await new jose.SignJWT(claims)
            .setProtectedHeader({ alg, typ: 'JWT' })
            .setIssuer(options.issuer)
            .setSubject(options.subject)
            .setAudience(audience)
            .setIssuedAt(now)
            .setExpirationTime(now + lifetimeSeconds)
            .setJti(jti)
            .sign(key);
        params.set('client_assertion', assertion);
        params.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    };
}
/**
 * OAuth provider for client_credentials grant with client_secret_basic authentication.
 *
 * This provider is designed for machine-to-machine authentication where
 * the client authenticates using a client_id and client_secret.
 *
 * @example
 * const provider = new ClientCredentialsProvider({
 *   clientId: 'my-client',
 *   clientSecret: 'my-secret'
 * });
 *
 * const transport = new StreamableHTTPClientTransport(serverUrl, {
 *   authProvider: provider
 * });
 */
class ClientCredentialsProvider {
    constructor(options) {
        this._clientInfo = {
            client_id: options.clientId,
            client_secret: options.clientSecret
        };
        this._clientMetadata = {
            client_name: options.clientName ?? 'client-credentials-client',
            redirect_uris: [],
            grant_types: ['client_credentials'],
            token_endpoint_auth_method: 'client_secret_basic',
            scope: options.scope
        };
    }
    get redirectUrl() {
        return undefined;
    }
    get clientMetadata() {
        return this._clientMetadata;
    }
    clientInformation() {
        return this._clientInfo;
    }
    saveClientInformation(info) {
        this._clientInfo = info;
    }
    tokens() {
        return this._tokens;
    }
    saveTokens(tokens) {
        this._tokens = tokens;
    }
    redirectToAuthorization() {
        throw new Error('redirectToAuthorization is not used for client_credentials flow');
    }
    saveCodeVerifier() {
        // Not used for client_credentials
    }
    codeVerifier() {
        throw new Error('codeVerifier is not used for client_credentials flow');
    }
    prepareTokenRequest(scope) {
        const params = new URLSearchParams({ grant_type: 'client_credentials' });
        if (scope)
            params.set('scope', scope);
        return params;
    }
}
exports.ClientCredentialsProvider = ClientCredentialsProvider;
/**
 * OAuth provider for client_credentials grant with private_key_jwt authentication.
 *
 * This provider is designed for machine-to-machine authentication where
 * the client authenticates using a signed JWT assertion (RFC 7523 Section 2.2).
 *
 * @example
 * const provider = new PrivateKeyJwtProvider({
 *   clientId: 'my-client',
 *   privateKey: pemEncodedPrivateKey,
 *   algorithm: 'RS256'
 * });
 *
 * const transport = new StreamableHTTPClientTransport(serverUrl, {
 *   authProvider: provider
 * });
 */
class PrivateKeyJwtProvider {
    constructor(options) {
        this._clientInfo = {
            client_id: options.clientId
        };
        this._clientMetadata = {
            client_name: options.clientName ?? 'private-key-jwt-client',
            redirect_uris: [],
            grant_types: ['client_credentials'],
            token_endpoint_auth_method: 'private_key_jwt',
            scope: options.scope
        };
        this.addClientAuthentication = createPrivateKeyJwtAuth({
            issuer: options.clientId,
            subject: options.clientId,
            privateKey: options.privateKey,
            alg: options.algorithm,
            lifetimeSeconds: options.jwtLifetimeSeconds
        });
    }
    get redirectUrl() {
        return undefined;
    }
    get clientMetadata() {
        return this._clientMetadata;
    }
    clientInformation() {
        return this._clientInfo;
    }
    saveClientInformation(info) {
        this._clientInfo = info;
    }
    tokens() {
        return this._tokens;
    }
    saveTokens(tokens) {
        this._tokens = tokens;
    }
    redirectToAuthorization() {
        throw new Error('redirectToAuthorization is not used for client_credentials flow');
    }
    saveCodeVerifier() {
        // Not used for client_credentials
    }
    codeVerifier() {
        throw new Error('codeVerifier is not used for client_credentials flow');
    }
    prepareTokenRequest(scope) {
        const params = new URLSearchParams({ grant_type: 'client_credentials' });
        if (scope)
            params.set('scope', scope);
        return params;
    }
}
exports.PrivateKeyJwtProvider = PrivateKeyJwtProvider;
/**
 * OAuth provider for client_credentials grant with a static private_key_jwt assertion.
 *
 * This provider mirrors {@link PrivateKeyJwtProvider} but instead of constructing and
 * signing a JWT on each request, it accepts a pre-built JWT assertion string and
 * uses it directly for authentication.
 */
class StaticPrivateKeyJwtProvider {
    constructor(options) {
        this._clientInfo = {
            client_id: options.clientId
        };
        this._clientMetadata = {
            client_name: options.clientName ?? 'static-private-key-jwt-client',
            redirect_uris: [],
            grant_types: ['client_credentials'],
            token_endpoint_auth_method: 'private_key_jwt',
            scope: options.scope
        };
        const assertion = options.jwtBearerAssertion;
        this.addClientAuthentication = async (_headers, params) => {
            params.set('client_assertion', assertion);
            params.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
        };
    }
    get redirectUrl() {
        return undefined;
    }
    get clientMetadata() {
        return this._clientMetadata;
    }
    clientInformation() {
        return this._clientInfo;
    }
    saveClientInformation(info) {
        this._clientInfo = info;
    }
    tokens() {
        return this._tokens;
    }
    saveTokens(tokens) {
        this._tokens = tokens;
    }
    redirectToAuthorization() {
        throw new Error('redirectToAuthorization is not used for client_credentials flow');
    }
    saveCodeVerifier() {
        // Not used for client_credentials
    }
    codeVerifier() {
        throw new Error('codeVerifier is not used for client_credentials flow');
    }
    prepareTokenRequest(scope) {
        const params = new URLSearchParams({ grant_type: 'client_credentials' });
        if (scope)
            params.set('scope', scope);
        return params;
    }
}
exports.StaticPrivateKeyJwtProvider = StaticPrivateKeyJwtProvider;
//# sourceMappingURL=auth-extensions.js.map