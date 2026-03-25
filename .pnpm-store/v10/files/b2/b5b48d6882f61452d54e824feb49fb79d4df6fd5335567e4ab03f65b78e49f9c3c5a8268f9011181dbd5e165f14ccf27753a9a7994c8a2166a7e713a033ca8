"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserTokenClient = void 0;
const axios_1 = __importDefault(require("axios"));
const agents_activity_1 = require("@microsoft/agents-activity");
const logger_1 = require("@microsoft/agents-activity/logger");
const activityWireCompat_1 = require("../activityWireCompat");
const getProductInfo_1 = require("../getProductInfo");
const customUserTokenAPI_1 = require("./customUserTokenAPI");
const logger = (0, logger_1.debug)('agents:user-token-client');
/**
 * Client for managing user tokens.
 */
class UserTokenClient {
    constructor(param) {
        this.msAppId = '';
        if (typeof param === 'string') {
            const baseURL = (0, customUserTokenAPI_1.getTokenServiceEndpoint)();
            this.client = axios_1.default.create({
                baseURL,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': (0, getProductInfo_1.getProductInfo)(),
                }
            });
        }
        else {
            this.client = param;
        }
        this.client.interceptors.request.use((config) => {
            const { method, url, data, headers, params } = config;
            const { Authorization, authorization, ...headersToLog } = headers || {};
            logger.debug('Request: ', {
                host: this.client.getUri(),
                url,
                data,
                method,
                params,
                headers: headersToLog
            });
            return config;
        });
        this.client.interceptors.response.use((config) => {
            const { status, statusText, config: requestConfig, headers } = config;
            const { Authorization, authorization, ...headersToLog } = headers || {};
            const { token, ...redactedData } = (requestConfig === null || requestConfig === void 0 ? void 0 : requestConfig.data) || {};
            logger.debug('Response: ', {
                status,
                statusText,
                host: this.client.getUri(),
                url: requestConfig === null || requestConfig === void 0 ? void 0 : requestConfig.url,
                data: redactedData,
                method: requestConfig === null || requestConfig === void 0 ? void 0 : requestConfig.method,
                headers: headersToLog
            });
            return config;
        }, (error) => {
            const { code, status, message, stack, response } = error;
            const { headers } = response || {};
            const errorDetails = {
                code,
                host: this.client.getUri(),
                url: error.config.url,
                method: error.config.method,
                data: error.config.data,
                message: message + JSON.stringify(response === null || response === void 0 ? void 0 : response.data),
                headers,
                stack,
            };
            logger.debug('Response error: ', errorDetails);
            if (errorDetails.url === '/api/usertoken/GetToken' && status !== 404) {
                return Promise.reject(errorDetails);
            }
        });
    }
    /**
     * Creates a new instance of UserTokenClient with authentication.
     * @param baseURL - The base URL for the API.
     * @param authConfig - The authentication configuration.
     * @param authProvider - The authentication provider.
     * @param scope - The scope for the authentication token.
     * @param headers - Optional headers to propagate in the request.
     * @returns A new instance of ConnectorClient.
     */
    static async createClientWithScope(baseURL, authProvider, scope, headers) {
        // TODO: add header propagation logic
        const axiosInstance = axios_1.default.create({
            baseURL,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json', // Required by transformRequest
                'User-Agent': (0, getProductInfo_1.getProductInfo)(),
            },
        });
        if (authProvider) {
            const token = await authProvider.getAccessToken(scope);
            if (token.length > 1) {
                axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
            }
        }
        return new UserTokenClient(axiosInstance);
    }
    /**
     * Gets the user token.
     * @param connectionName The connection name.
     * @param channelIdComposite The channel ID.
     * @param userId The user ID.
     * @param code The optional code.
     * @returns A promise that resolves to the user token.
     */
    async getUserToken(connectionName, channelIdComposite, userId, code) {
        const [channelId] = agents_activity_1.Activity.parseChannelId(channelIdComposite);
        const params = { connectionName, channelId, userId, code };
        const response = await this.client.get('/api/usertoken/GetToken', { params });
        if (response === null || response === void 0 ? void 0 : response.data) {
            return response.data;
        }
        return { token: undefined };
    }
    /**
     * Signs the user out.
     * @param userId The user ID.
     * @param connectionName The connection name.
     * @param channelIdComposite The channel ID.
     * @returns A promise that resolves when the sign-out operation is complete.
     */
    async signOut(userId, connectionName, channelIdComposite) {
        const [channelId] = agents_activity_1.Activity.parseChannelId(channelIdComposite);
        const params = { userId, connectionName, channelId };
        const response = await this.client.delete('/api/usertoken/SignOut', { params });
        if (response.status !== 200) {
            throw new Error('Failed to sign out');
        }
    }
    /**
     * Gets the sign-in resource.
     * @param msAppId The application ID.
     * @param connectionName The connection name.
     * @param conversation The conversation reference.
     * @param relatesTo Optional. The related conversation reference.
     * @returns A promise that resolves to the signing resource.
     */
    async getSignInResource(msAppId, connectionName, conversation, relatesTo) {
        const tokenExchangeState = {
            connectionName,
            conversation,
            relatesTo,
            msAppId
        };
        const tokenExchangeStateNormalized = (0, activityWireCompat_1.normalizeTokenExchangeState)(tokenExchangeState);
        const state = Buffer.from(JSON.stringify(tokenExchangeStateNormalized)).toString('base64');
        const params = { state };
        const response = await this.client.get('/api/botsignin/GetSignInResource', { params });
        return response.data;
    }
    /**
     * Exchanges the token.
     * @param userId The user ID.
     * @param connectionName The connection name.
     * @param channelIdComposite The channel ID.
     * @param tokenExchangeRequest The token exchange request.
     * @returns A promise that resolves to the exchanged token.
     */
    async exchangeTokenAsync(userId, connectionName, channelIdComposite, tokenExchangeRequest) {
        const [channelId] = agents_activity_1.Activity.parseChannelId(channelIdComposite);
        const params = { userId, connectionName, channelId };
        const response = await this.client.post('/api/usertoken/exchange', tokenExchangeRequest, { params });
        if (response === null || response === void 0 ? void 0 : response.data) {
            return response.data;
        }
        else {
            return { token: undefined };
        }
    }
    /**
     * Gets the token or sign-in resource.
     * @param userId The user ID.
     * @param connectionName The connection name.
     * @param channelIdComposite The channel ID.
     * @param conversation The conversation reference.
     * @param relatesTo The related conversation reference.
     * @param code The code.
     * @param finalRedirect The final redirect URL.
     * @param fwdUrl The forward URL.
     * @returns A promise that resolves to the token or sign-in resource response.
     */
    async getTokenOrSignInResource(userId, connectionName, channelIdComposite, conversation, relatesTo, code, finalRedirect = '', fwdUrl = '') {
        const [channelId] = agents_activity_1.Activity.parseChannelId(channelIdComposite);
        const state = Buffer.from(JSON.stringify({ conversation, relatesTo, connectionName, msAppId: this.msAppId })).toString('base64');
        const params = { userId, connectionName, channelId, state, code, finalRedirect, fwdUrl };
        const response = await this.client.get('/api/usertoken/GetTokenOrSignInResource', { params });
        return response.data;
    }
    /**
     * Gets the token status.
     * @param userId The user ID.
     * @param channelIdComposite The channel ID.
     * @param include The optional include parameter.
     * @returns A promise that resolves to the token status.
     */
    async getTokenStatus(userId, channelIdComposite, include = null) {
        const [channelId] = agents_activity_1.Activity.parseChannelId(channelIdComposite);
        const params = { userId, channelId, include };
        const response = await this.client.get('/api/usertoken/GetTokenStatus', { params });
        return response.data;
    }
    /**
     * Gets the AAD tokens.
     * @param userId The user ID.
     * @param connectionName The connection name.
     * @param channelIdComposite The channel ID.
     * @param resourceUrls The resource URLs.
     * @returns A promise that resolves to the AAD tokens.
     */
    async getAadTokens(userId, connectionName, channelIdComposite, resourceUrls) {
        const [channelId] = agents_activity_1.Activity.parseChannelId(channelIdComposite);
        const params = { userId, connectionName, channelId };
        const response = await this.client.post('/api/usertoken/GetAadTokens', resourceUrls, { params });
        return response.data;
    }
    updateAuthToken(token) {
        this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
}
exports.UserTokenClient = UserTokenClient;
//# sourceMappingURL=userTokenClient.js.map