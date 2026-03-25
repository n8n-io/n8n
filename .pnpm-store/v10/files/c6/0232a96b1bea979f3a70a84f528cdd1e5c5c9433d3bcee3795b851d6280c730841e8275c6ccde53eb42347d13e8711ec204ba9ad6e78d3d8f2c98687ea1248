"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsalTokenProvider = void 0;
const msal_node_1 = require("@azure/msal-node");
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("@microsoft/agents-activity/logger");
const uuid_1 = require("uuid");
const MemoryCache_1 = require("./MemoryCache");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const audience = 'api://AzureADTokenExchange';
const logger = (0, logger_1.debug)('agents:msal');
/**
 * Provides tokens using MSAL.
 */
class MsalTokenProvider {
    constructor(connectionSettings) {
        this.sysOptions = {
            loggerOptions: {
                logLevel: msal_node_1.LogLevel.Trace,
                loggerCallback: (level, message, containsPii) => {
                    if (containsPii) {
                        return;
                    }
                    switch (level) {
                        case msal_node_1.LogLevel.Error:
                            logger.error(message);
                            return;
                        case msal_node_1.LogLevel.Info:
                            logger.debug(message);
                            return;
                        case msal_node_1.LogLevel.Warning:
                            if (!message.includes('Warning - No client info in response')) {
                                logger.warn(message);
                            }
                            return;
                        case msal_node_1.LogLevel.Verbose:
                            logger.debug(message);
                    }
                },
                piiLoggingEnabled: false
            }
        };
        this._agenticTokenCache = new MemoryCache_1.MemoryCache();
        this.connectionSettings = connectionSettings;
    }
    async getAccessToken(authConfigOrScope, scope) {
        let authConfig;
        let actualScope;
        if (typeof authConfigOrScope === 'string') {
            // Called as getAccessToken(scope)
            if (!this.connectionSettings) {
                throw new Error('Connection settings must be provided to constructor when calling getAccessToken(scope)');
            }
            authConfig = this.connectionSettings;
            actualScope = authConfigOrScope;
        }
        else {
            // Called as getAccessToken(authConfig, scope)
            authConfig = authConfigOrScope;
            actualScope = scope;
        }
        if (!authConfig.clientId && process.env.NODE_ENV !== 'production') {
            return '';
        }
        let token;
        if (authConfig.WIDAssertionFile !== undefined) {
            token = await this.acquireAccessTokenViaWID(authConfig, actualScope);
        }
        else if (authConfig.FICClientId !== undefined) {
            token = await this.acquireAccessTokenViaFIC(authConfig, actualScope);
        }
        else if (authConfig.clientSecret !== undefined) {
            token = await this.acquireAccessTokenViaSecret(authConfig, actualScope);
        }
        else if (authConfig.certPemFile !== undefined &&
            authConfig.certKeyFile !== undefined) {
            token = await this.acquireTokenWithCertificate(authConfig, actualScope);
        }
        else if (authConfig.clientSecret === undefined &&
            authConfig.certPemFile === undefined &&
            authConfig.certKeyFile === undefined) {
            token = await this.acquireTokenWithUserAssignedIdentity(authConfig, actualScope);
        }
        else {
            throw new Error('Invalid authConfig. ');
        }
        if (token === undefined) {
            throw new Error('Failed to acquire token');
        }
        return token;
    }
    async acquireTokenOnBehalfOf(authConfigOrScopes, scopesOrOboAssertion, oboAssertion) {
        let authConfig;
        let actualScopes;
        let actualOboAssertion;
        if (Array.isArray(authConfigOrScopes)) {
            // Called as acquireTokenOnBehalfOf(scopes, oboAssertion)
            if (!this.connectionSettings) {
                throw new Error('Connection settings must be provided to constructor when calling acquireTokenOnBehalfOf(scopes, oboAssertion)');
            }
            authConfig = this.connectionSettings;
            actualScopes = authConfigOrScopes;
            actualOboAssertion = scopesOrOboAssertion;
        }
        else {
            // Called as acquireTokenOnBehalfOf(authConfig, scopes, oboAssertion)
            authConfig = authConfigOrScopes;
            actualScopes = scopesOrOboAssertion;
            actualOboAssertion = oboAssertion;
        }
        const cca = new msal_node_1.ConfidentialClientApplication({
            auth: {
                clientId: authConfig.clientId,
                authority: `${authConfig.authority}/${authConfig.tenantId || 'botframework.com'}`,
                clientSecret: authConfig.clientSecret
            },
            system: this.sysOptions
        });
        const token = await cca.acquireTokenOnBehalfOf({
            oboAssertion: actualOboAssertion,
            scopes: actualScopes
        });
        return token === null || token === void 0 ? void 0 : token.accessToken;
    }
    async getAgenticInstanceToken(tenantId, agentAppInstanceId) {
        logger.debug('Getting agentic instance token');
        if (!this.connectionSettings) {
            throw new Error('Connection settings must be provided when calling getAgenticInstanceToken');
        }
        const appToken = await this.getAgenticApplicationToken(tenantId, agentAppInstanceId);
        const cca = new msal_node_1.ConfidentialClientApplication({
            auth: {
                clientId: agentAppInstanceId,
                clientAssertion: appToken,
                authority: this.resolveAuthority(tenantId),
            },
            system: this.sysOptions
        });
        const token = await cca.acquireTokenByClientCredential({
            scopes: ['api://AzureAdTokenExchange/.default'],
            correlationId: (0, uuid_1.v4)()
        });
        if (!(token === null || token === void 0 ? void 0 : token.accessToken)) {
            throw new Error(`Failed to acquire instance token for agent instance: ${agentAppInstanceId}`);
        }
        return token.accessToken;
    }
    /**
     * This method can optionally accept a tenant ID that overrides the tenant ID in the connection settings, if the connection settings authority contains "common".
     * @param tenantId
     * @returns
     */
    resolveAuthority(tenantId) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // if for some reason the agentic tenant ID is not in the message, fall back to the original configured auth settings
        if (!tenantId) {
            return ((_a = this.connectionSettings) === null || _a === void 0 ? void 0 : _a.authority) ? `${this.connectionSettings.authority}/${(_b = this.connectionSettings) === null || _b === void 0 ? void 0 : _b.tenantId}` : `https://login.microsoftonline.com/${((_c = this.connectionSettings) === null || _c === void 0 ? void 0 : _c.tenantId) || 'botframework.com'}`;
        }
        if (((_d = this.connectionSettings) === null || _d === void 0 ? void 0 : _d.tenantId) === 'common') {
            return ((_e = this.connectionSettings) === null || _e === void 0 ? void 0 : _e.authority) ? `${this.connectionSettings.authority}/${tenantId}` : `https://login.microsoftonline.com/${tenantId}`;
        }
        else {
            return ((_f = this.connectionSettings) === null || _f === void 0 ? void 0 : _f.authority) ? `${this.connectionSettings.authority}/${(_g = this.connectionSettings) === null || _g === void 0 ? void 0 : _g.tenantId}` : `https://login.microsoftonline.com/${((_h = this.connectionSettings) === null || _h === void 0 ? void 0 : _h.tenantId) || 'botframework.com'}`;
        }
    }
    /**
     * Does a direct HTTP call to acquire a token for agentic scenarios - do not use this directly!
     * This method will be removed once MSAL is updated with the necessary features.
     * (This is required in order to pass additional parameters into the auth call)
     * @param tenantId
     * @param clientId
     * @param clientAssertion
     * @param scopes
     * @param tokenBodyParameters
     * @returns
     */
    async acquireTokenForAgenticScenarios(tenantId, clientId, clientAssertion, scopes, tokenBodyParameters) {
        if (!this.connectionSettings) {
            throw new Error('Connection settings must be provided when calling getAgenticInstanceToken');
        }
        // Check cache first
        const cacheKey = `${clientId}/${Object.keys(tokenBodyParameters).map(key => key !== 'user_federated_identity_credential' ? `${key}=${tokenBodyParameters[key]}` : '').join('&')}/${scopes.join(';')}`;
        if (this._agenticTokenCache.get(cacheKey)) {
            return this._agenticTokenCache.get(cacheKey);
        }
        const url = `${this.resolveAuthority(tenantId)}/oauth2/v2.0/token`;
        const data = {
            client_id: clientId,
            scope: scopes.join(' '),
            ...tokenBodyParameters
        };
        if (clientAssertion) {
            data.client_assertion_type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
            data.client_assertion = clientAssertion;
        }
        else {
            data.client_secret = this.connectionSettings.clientSecret;
        }
        if (data.grant_type !== 'user_fic') {
            data.client_info = '2';
        }
        const token = await axios_1.default.post(url, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
            }
        }).catch((error) => {
            logger.error('Error acquiring token: ', error.toJSON());
            throw error;
        });
        // capture token, expire local cache 5 minutes early
        this._agenticTokenCache.set(cacheKey, token.data.access_token, token.data.expires_in - 300);
        return token.data.access_token;
    }
    async getAgenticUserToken(tenantId, agentAppInstanceId, agenticUserId, scopes) {
        logger.debug('Getting agentic user token');
        const agentToken = await this.getAgenticApplicationToken(tenantId, agentAppInstanceId);
        const instanceToken = await this.getAgenticInstanceToken(tenantId, agentAppInstanceId);
        const token = await this.acquireTokenForAgenticScenarios(tenantId, agentAppInstanceId, agentToken, scopes, {
            user_id: agenticUserId,
            user_federated_identity_credential: instanceToken,
            grant_type: 'user_fic',
        });
        if (!token) {
            throw new Error(`Failed to acquire instance token for user token: ${agentAppInstanceId}`);
        }
        return token;
    }
    async getAgenticApplicationToken(tenantId, agentAppInstanceId) {
        var _a;
        if (!((_a = this.connectionSettings) === null || _a === void 0 ? void 0 : _a.clientId)) {
            throw new Error('Connection settings must be provided when calling getAgenticApplicationToken');
        }
        logger.debug('Getting agentic application token');
        let clientAssertion;
        if (this.connectionSettings.WIDAssertionFile !== undefined) {
            clientAssertion = fs_1.default.readFileSync(this.connectionSettings.WIDAssertionFile, 'utf8');
        }
        else if (this.connectionSettings.FICClientId !== undefined) {
            clientAssertion = await this.fetchExternalToken(this.connectionSettings.FICClientId);
        }
        else if (this.connectionSettings.certPemFile !== undefined &&
            this.connectionSettings.certKeyFile !== undefined) {
            clientAssertion = this.getAssertionFromCert(this.connectionSettings);
        }
        const token = await this.acquireTokenForAgenticScenarios(tenantId, this.connectionSettings.clientId, clientAssertion, ['api://AzureAdTokenExchange/.default'], {
            grant_type: 'client_credentials',
            fmi_path: agentAppInstanceId,
        });
        if (!token) {
            throw new Error(`Failed to acquire token for agent instance: ${agentAppInstanceId}`);
        }
        return token;
    }
    /**
     * Generates the client assertion using the provided certificate.
     * @param authConfig The authentication configuration.
     * @returns The client assertion.
     */
    getAssertionFromCert(authConfig) {
        const base64url = (buf) => buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        const privateKeyPem = fs_1.default.readFileSync(authConfig.certKeyFile);
        const pubKeyObject = new crypto_1.default.X509Certificate(fs_1.default.readFileSync(authConfig.certPemFile));
        const der = pubKeyObject.raw;
        const x5tS256 = base64url(crypto_1.default.createHash('sha256').update(der).digest());
        let x5c;
        if (authConfig.sendX5C) {
            x5c = Buffer.from(authConfig.certPemFile, 'base64').toString();
        }
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            aud: `${this.resolveAuthority(authConfig.tenantId)}/oauth2/v2.0/token`,
            iss: authConfig.clientId,
            sub: authConfig.clientId,
            jti: (0, uuid_1.v4)(),
            nbf: now,
            iat: now,
            exp: now + 600, // 10 minutes
        };
        return jsonwebtoken_1.default.sign(payload, privateKeyPem, {
            algorithm: 'PS256',
            header: { alg: 'PS256', typ: 'JWT', 'x5t#S256': x5tS256, x5c }
        });
    }
    /**
     * Acquires a token using a user-assigned identity.
     * @param authConfig The authentication configuration.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    async acquireTokenWithUserAssignedIdentity(authConfig, scope) {
        const mia = new msal_node_1.ManagedIdentityApplication({
            managedIdentityIdParams: {
                userAssignedClientId: authConfig.clientId || ''
            },
            system: this.sysOptions
        });
        const token = await mia.acquireToken({
            resource: scope
        });
        return token === null || token === void 0 ? void 0 : token.accessToken;
    }
    /**
     * Acquires a token using a certificate.
     * @param authConfig The authentication configuration.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    async acquireTokenWithCertificate(authConfig, scope) {
        const privateKeySource = fs_1.default.readFileSync(authConfig.certKeyFile);
        const privateKeyObject = crypto_1.default.createPrivateKey({
            key: privateKeySource,
            format: 'pem'
        });
        const privateKey = privateKeyObject.export({
            format: 'pem',
            type: 'pkcs8'
        });
        const pubKeyObject = new crypto_1.default.X509Certificate(fs_1.default.readFileSync(authConfig.certPemFile));
        const cca = new msal_node_1.ConfidentialClientApplication({
            auth: {
                clientId: authConfig.clientId || '',
                authority: `${authConfig.authority}/${authConfig.tenantId || 'botframework.com'}`,
                clientCertificate: {
                    privateKey: privateKey,
                    thumbprint: pubKeyObject.fingerprint.replaceAll(':', ''),
                    x5c: Buffer.from(authConfig.certPemFile, 'base64').toString()
                }
            },
            system: this.sysOptions
        });
        const token = await cca.acquireTokenByClientCredential({
            scopes: [`${scope}/.default`],
            correlationId: (0, uuid_1.v4)()
        });
        return token === null || token === void 0 ? void 0 : token.accessToken;
    }
    /**
     * Acquires a token using a client secret.
     * @param authConfig The authentication configuration.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    async acquireAccessTokenViaSecret(authConfig, scope) {
        const cca = new msal_node_1.ConfidentialClientApplication({
            auth: {
                clientId: authConfig.clientId,
                authority: `${authConfig.authority}/${authConfig.tenantId || 'botframework.com'}`,
                clientSecret: authConfig.clientSecret
            },
            system: this.sysOptions
        });
        const token = await cca.acquireTokenByClientCredential({
            scopes: [`${scope}/.default`],
            correlationId: (0, uuid_1.v4)()
        });
        return token === null || token === void 0 ? void 0 : token.accessToken;
    }
    /**
     * Acquires a token using a FIC client assertion.
     * @param authConfig The authentication configuration.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    async acquireAccessTokenViaFIC(authConfig, scope) {
        const scopes = [`${scope}/.default`];
        const clientAssertion = await this.fetchExternalToken(authConfig.FICClientId);
        const cca = new msal_node_1.ConfidentialClientApplication({
            auth: {
                clientId: authConfig.clientId,
                authority: `${authConfig.authority}/${authConfig.tenantId}`,
                clientAssertion
            },
            system: this.sysOptions
        });
        const token = await cca.acquireTokenByClientCredential({ scopes });
        logger.debug('got token using FIC client assertion');
        return token === null || token === void 0 ? void 0 : token.accessToken;
    }
    /**
     * Acquires a token using a Workload Identity client assertion.
     * @param authConfig The authentication configuration.
     * @param scope The scope for the token.
     * @returns A promise that resolves to the access token.
     */
    async acquireAccessTokenViaWID(authConfig, scope) {
        const scopes = [`${scope}/.default`];
        const clientAssertion = fs_1.default.readFileSync(authConfig.WIDAssertionFile, 'utf8');
        const cca = new msal_node_1.ConfidentialClientApplication({
            auth: {
                clientId: authConfig.clientId,
                authority: `https://login.microsoftonline.com/${authConfig.tenantId}`,
                clientAssertion
            },
            system: this.sysOptions
        });
        const token = await cca.acquireTokenByClientCredential({ scopes });
        logger.info('got token using WID client assertion');
        return token === null || token === void 0 ? void 0 : token.accessToken;
    }
    /**
     * Fetches an external token.
     * @param FICClientId The FIC client ID.
     * @returns A promise that resolves to the external token.
     */
    async fetchExternalToken(FICClientId) {
        const managedIdentityClientAssertion = new msal_node_1.ManagedIdentityApplication({
            managedIdentityIdParams: {
                userAssignedClientId: FICClientId
            },
            system: this.sysOptions
        });
        const response = await managedIdentityClientAssertion.acquireToken({
            resource: audience,
            forceRefresh: true
        });
        logger.debug('got token for FIC');
        return response.accessToken;
    }
}
exports.MsalTokenProvider = MsalTokenProvider;
//# sourceMappingURL=msalTokenProvider.js.map