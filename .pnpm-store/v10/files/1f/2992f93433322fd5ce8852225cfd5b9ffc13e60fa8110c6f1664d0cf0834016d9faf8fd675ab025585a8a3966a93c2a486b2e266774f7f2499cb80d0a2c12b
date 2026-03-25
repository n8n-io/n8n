"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorClient = exports.getProductInfo = void 0;
/** * Copyright (c) Microsoft Corporation. All rights reserved. * Licensed under the MIT License. */
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("@microsoft/agents-activity/logger");
const agents_activity_1 = require("@microsoft/agents-activity");
const errorHelper_1 = require("../errorHelper");
const activityWireCompat_1 = require("../activityWireCompat");
const getProductInfo_1 = require("../getProductInfo");
Object.defineProperty(exports, "getProductInfo", { enumerable: true, get: function () { return getProductInfo_1.getProductInfo; } });
const headerPropagation_1 = require("../headerPropagation");
const logger = (0, logger_1.debug)('agents:connector-client');
/**
 * ConnectorClient is a client for interacting with the Microsoft Connector API.
 */
class ConnectorClient {
    /**
     * Private constructor for the ConnectorClient.
     * @param axInstance - The AxiosInstance to use for HTTP requests.
     */
    constructor(axInstance) {
        this._axiosInstance = axInstance;
        this._axiosInstance.interceptors.request.use((config) => {
            const { method, url, data, headers, params } = config;
            // Clone headers and remove Authorization before logging
            const { Authorization, authorization, ...headersToLog } = headers || {};
            logger.debug('Request: ', {
                host: this._axiosInstance.getUri(),
                url,
                data,
                method,
                params,
                headers: headersToLog
            });
            return config;
        });
        this._axiosInstance.interceptors.response.use((config) => {
            const { status, statusText, config: requestConfig } = config;
            logger.debug('Response: ', {
                status,
                statusText,
                host: this._axiosInstance.getUri(),
                url: requestConfig === null || requestConfig === void 0 ? void 0 : requestConfig.url,
                data: config.config.data,
                method: requestConfig === null || requestConfig === void 0 ? void 0 : requestConfig.method,
            });
            return config;
        }, (error) => {
            const { code, message, stack, response } = error;
            const errorDetails = {
                code,
                host: this._axiosInstance.getUri(),
                url: error.config.url,
                method: error.config.method,
                data: error.config.data,
                message: message + JSON.stringify(response === null || response === void 0 ? void 0 : response.data),
                stack,
            };
            return Promise.reject(errorDetails);
        });
    }
    get axiosInstance() {
        return this._axiosInstance;
    }
    /**
     * Creates a new instance of ConnectorClient with authentication.
     * @param baseURL - The base URL for the API.
     * @param authConfig - The authentication configuration.
     * @param authProvider - The authentication provider.
     * @param scope - The scope for the authentication token.
     * @param headers - Optional headers to propagate in the request.
     * @returns A new instance of ConnectorClient.
     */
    static async createClientWithAuth(baseURL, authConfig, authProvider, scope, headers) {
        const token = await authProvider.getAccessToken(authConfig, scope);
        return this.createClientWithToken(baseURL, token, headers);
    }
    /**
     * Creates a new instance of ConnectorClient with token.
     * @param baseURL - The base URL for the API.
     * @param token - The authentication token.
     * @param headers - Optional headers to propagate in the request.
     * @returns A new instance of ConnectorClient.
     */
    static createClientWithToken(baseURL, token, headers) {
        const headerPropagation = headers !== null && headers !== void 0 ? headers : new headerPropagation_1.HeaderPropagation({ 'User-Agent': '' });
        headerPropagation.concat({ 'User-Agent': (0, getProductInfo_1.getProductInfo)() });
        headerPropagation.override({
            Accept: 'application/json',
            'Content-Type': 'application/json', // Required by transformRequest
        });
        const axiosInstance = axios_1.default.create({
            baseURL,
            headers: headerPropagation.outgoing,
        });
        if (token && token.length > 1) {
            axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
        }
        return new ConnectorClient(axiosInstance);
    }
    /**
     * Retrieves a list of conversations.
     * @param continuationToken - The continuation token for pagination.
     * @returns A list of conversations.
     */
    async getConversations(continuationToken) {
        const config = {
            method: 'get',
            url: '/v3/conversations',
            params: continuationToken ? { continuationToken } : undefined
        };
        const response = await this._axiosInstance(config);
        return response.data;
    }
    async getConversationMember(userId, conversationId) {
        if (!userId || !conversationId) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.UserIdAndConversationIdRequired);
        }
        const config = {
            method: 'get',
            url: `v3/conversations/${conversationId}/members/${userId}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await this._axiosInstance(config);
        return response.data;
    }
    /**
     * Creates a new conversation.
     * @param body - The conversation parameters.
     * @returns The conversation resource response.
     */
    async createConversation(body) {
        const payload = {
            ...body,
            activity: (0, activityWireCompat_1.normalizeOutgoingActivity)(body.activity)
        };
        const config = {
            method: 'post',
            url: '/v3/conversations',
            headers: {
                'Content-Type': 'application/json'
            },
            data: payload
        };
        const response = await this._axiosInstance(config);
        return response.data;
    }
    /**
     * Replies to an activity in a conversation.
     * @param conversationId - The ID of the conversation.
     * @param activityId - The ID of the activity.
     * @param body - The activity object.
     * @returns The resource response.
     */
    async replyToActivity(conversationId, activityId, body) {
        logger.debug(`Replying to activity: ${activityId} in conversation: ${conversationId}`);
        if (!conversationId || !activityId) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ConversationIdAndActivityIdRequired);
        }
        const trimmedConversationId = this.conditionallyTruncateConversationId(conversationId, body);
        const config = {
            method: 'post',
            url: `v3/conversations/${trimmedConversationId}/activities/${encodeURIComponent(activityId)}`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: (0, activityWireCompat_1.normalizeOutgoingActivity)(body)
        };
        const response = await this._axiosInstance(config);
        logger.info('Reply to conversation/activity: ', response.data.id, activityId);
        return response.data;
    }
    /**
     * Trim the conversationId to a fixed length when creating the URL. This is applied only in specific API calls for agentic calls.
     * @param conversationId The ID of the conversation to potentially truncate.
     * @param activity The activity object used to determine if truncation is necessary.
     * @returns The original or truncated conversationId, depending on the channel and activity role.
     */
    conditionallyTruncateConversationId(conversationId, activity) {
        var _a, _b;
        if ((activity.channelIdChannel === agents_activity_1.Channels.Msteams || activity.channelIdChannel === agents_activity_1.Channels.Agents) &&
            (((_a = activity.from) === null || _a === void 0 ? void 0 : _a.role) === agents_activity_1.RoleTypes.AgenticIdentity || ((_b = activity.from) === null || _b === void 0 ? void 0 : _b.role) === agents_activity_1.RoleTypes.AgenticUser)) {
            let maxLength = 150;
            if (process.env.MAX_APX_CONVERSATION_ID_LENGTH && !isNaN(parseInt(process.env.MAX_APX_CONVERSATION_ID_LENGTH, 10))) {
                maxLength = parseInt(process.env.MAX_APX_CONVERSATION_ID_LENGTH, 10);
            }
            return conversationId.length > maxLength ? conversationId.substring(0, maxLength) : conversationId;
        }
        else {
            return conversationId;
        }
    }
    /**
     * Sends an activity to a conversation.
     * @param conversationId - The ID of the conversation.
     * @param body - The activity object.
     * @returns The resource response.
     */
    async sendToConversation(conversationId, body) {
        logger.debug(`Send to conversation: ${conversationId} activity: ${body.id}`);
        if (!conversationId) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ConversationIdRequired);
        }
        const trimmedConversationId = this.conditionallyTruncateConversationId(conversationId, body);
        const config = {
            method: 'post',
            url: `v3/conversations/${trimmedConversationId}/activities`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: (0, activityWireCompat_1.normalizeOutgoingActivity)(body)
        };
        const response = await this._axiosInstance(config);
        return response.data;
    }
    /**
     * Updates an activity in a conversation.
     * @param conversationId - The ID of the conversation.
     * @param activityId - The ID of the activity.
     * @param body - The activity object.
     * @returns The resource response.
     */
    async updateActivity(conversationId, activityId, body) {
        if (!conversationId || !activityId) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ConversationIdAndActivityIdRequired);
        }
        const config = {
            method: 'put',
            url: `v3/conversations/${conversationId}/activities/${activityId}`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: (0, activityWireCompat_1.normalizeOutgoingActivity)(body)
        };
        const response = await this._axiosInstance(config);
        return response.data;
    }
    /**
     * Deletes an activity from a conversation.
     * @param conversationId - The ID of the conversation.
     * @param activityId - The ID of the activity.
     * @returns A promise that resolves when the activity is deleted.
     */
    async deleteActivity(conversationId, activityId) {
        if (!conversationId || !activityId) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ConversationIdAndActivityIdRequired);
        }
        const config = {
            method: 'delete',
            url: `v3/conversations/${conversationId}/activities/${activityId}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await this._axiosInstance(config);
        return response.data;
    }
    /**
       * Uploads an attachment to a conversation.
       * @param conversationId - The ID of the conversation.
       * @param body - The attachment data.
       * @returns The resource response.
       */
    async uploadAttachment(conversationId, body) {
        if (conversationId === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ConversationIdRequired);
        }
        const config = {
            method: 'post',
            url: `v3/conversations/${conversationId}/attachments`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: body
        };
        const response = await this._axiosInstance(config);
        return response.data;
    }
    /**
     * Retrieves attachment information by attachment ID.
     * @param attachmentId - The ID of the attachment.
     * @returns The attachment information.
     */
    async getAttachmentInfo(attachmentId) {
        if (attachmentId === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.AttachmentIdRequired);
        }
        const config = {
            method: 'get',
            url: `v3/attachments/${attachmentId}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await this._axiosInstance(config);
        return response.data;
    }
    /**
     * Retrieves an attachment by attachment ID and view ID.
     * @param attachmentId - The ID of the attachment.
     * @param viewId - The ID of the view.
     * @returns The attachment as a readable stream.
     */
    async getAttachment(attachmentId, viewId) {
        if (attachmentId === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.AttachmentIdRequired);
        }
        if (viewId === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ViewIdRequired);
        }
        const config = {
            method: 'get',
            url: `v3/attachments/${attachmentId}/views/${viewId}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const response = await this._axiosInstance(config);
        return response.data;
    }
}
exports.ConnectorClient = ConnectorClient;
//# sourceMappingURL=connectorClient.js.map