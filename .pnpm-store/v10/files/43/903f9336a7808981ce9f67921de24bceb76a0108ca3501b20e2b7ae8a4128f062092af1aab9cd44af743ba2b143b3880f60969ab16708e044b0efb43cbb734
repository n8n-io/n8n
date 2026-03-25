"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudAdapter = void 0;
const activityHandler_1 = require("./activityHandler");
const baseAdapter_1 = require("./baseAdapter");
const turnContext_1 = require("./turnContext");
const connectorClient_1 = require("./connector-client/connectorClient");
const authConfiguration_1 = require("./auth/authConfiguration");
const authConstants_1 = require("./auth/authConstants");
const msalConnectionManager_1 = require("./auth/msalConnectionManager");
const agents_activity_1 = require("@microsoft/agents-activity");
const errorHelper_1 = require("./errorHelper");
const uuid = __importStar(require("uuid"));
const logger_1 = require("@microsoft/agents-activity/logger");
const statusCodes_1 = require("./statusCodes");
const activityWireCompat_1 = require("./activityWireCompat");
const oauth_1 = require("./oauth");
const headerPropagation_1 = require("./headerPropagation");
const customUserTokenAPI_1 = require("./oauth/customUserTokenAPI");
const logger = (0, logger_1.debug)('agents:cloud-adapter');
/**
 * Adapter for handling agent interactions with various channels through cloud-based services.
 *
 * @remarks
 * CloudAdapter processes incoming HTTP requests from Azure Bot Service channels,
 * authenticates them, and generates outgoing responses. It manages the communication
 * flow between agents and users across different channels, handling activities, attachments,
 * and conversation continuations.
 */
class CloudAdapter extends baseAdapter_1.BaseAdapter {
    /**
     * Creates an instance of CloudAdapter.
     * @param authConfig - The authentication configuration for securing communications.
     * @param authProvider - No longer used.
     * @param userTokenClient - No longer used.
     */
    constructor(authConfig, authProvider, userTokenClient) {
        super();
        authConfig = (0, authConfiguration_1.getAuthConfigWithDefaults)(authConfig);
        this.connectionManager = new msalConnectionManager_1.MsalConnectionManager(undefined, undefined, authConfig);
    }
    /**
     * Determines whether a connector client is needed based on the delivery mode and service URL of the given activity.
     *
     * @param activity - The activity to evaluate.
     * @returns true if a ConnectorClient is needed, false otherwise.
     *  A connector client is required if the activity's delivery mode is not "ExpectReplies"
     *  and the service URL is not null or empty.
     * @protected
     */
    resolveIfConnectorClientIsNeeded(activity) {
        if (!activity) {
            throw new TypeError('`activity` parameter required');
        }
        switch (activity.deliveryMode) {
            case agents_activity_1.DeliveryModes.ExpectReplies:
                if (!activity.serviceUrl) {
                    logger.debug('DeliveryMode = ExpectReplies, connector client is not needed');
                    return false;
                }
                break;
            default:
                break;
        }
        return true;
    }
    /**
     * Creates a connector client for a specific service URL and scope.
     *
     * @param serviceUrl - The URL of the service to connect to.
     * @param scope - The authentication scope to use.
     * @param identity - The identity used to select the token provider.
     * @param headers - Optional headers to propagate in the request.
     * @returns A promise that resolves to a ConnectorClient instance.
     * @protected
     */
    async createConnectorClient(serviceUrl, scope, identity, headers) {
        // get the correct token provider
        const tokenProvider = this.connectionManager.getTokenProvider(identity, serviceUrl);
        const token = await tokenProvider.getAccessToken(scope);
        return connectorClient_1.ConnectorClient.createClientWithToken(serviceUrl, token, headers);
    }
    /**
     * Creates a connector client for a specific identity and activity.
     *
     * @param identity - The identity used to select the token provider.
     * @param activity - The activity used to select the token provider.
     * @param headers - Optional headers to propagate in the request.
     * @returns A promise that resolves to a ConnectorClient instance.
     * @protected
     */
    async createConnectorClientWithIdentity(identity, activity, headers) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        if (!(identity === null || identity === void 0 ? void 0 : identity.aud)) {
            // anonymous
            return connectorClient_1.ConnectorClient.createClientWithToken(activity.serviceUrl, null, headers);
        }
        let connectorClient;
        const tokenProvider = this.connectionManager.getTokenProviderFromActivity(identity, activity);
        if (activity.isAgenticRequest()) {
            logger.debug('Activity is from an agentic source, using special scope', activity.recipient);
            const agenticInstanceId = activity.getAgenticInstanceId();
            const agenticUserId = activity.getAgenticUser();
            if (((_b = (_a = activity.recipient) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === agents_activity_1.RoleTypes.AgenticIdentity.toLowerCase() && agenticInstanceId) {
                // get agentic instance token
                const token = await tokenProvider.getAgenticInstanceToken((_c = activity.getAgenticTenantId()) !== null && _c !== void 0 ? _c : '', agenticInstanceId);
                connectorClient = connectorClient_1.ConnectorClient.createClientWithToken(activity.serviceUrl, token, headers);
            }
            else if (((_e = (_d = activity.recipient) === null || _d === void 0 ? void 0 : _d.role) === null || _e === void 0 ? void 0 : _e.toLowerCase()) === agents_activity_1.RoleTypes.AgenticUser.toLowerCase() && agenticInstanceId && agenticUserId) {
                const scope = (_g = (_f = tokenProvider.connectionSettings) === null || _f === void 0 ? void 0 : _f.scope) !== null && _g !== void 0 ? _g : authConstants_1.ApxProductionScope;
                const token = await tokenProvider.getAgenticUserToken((_h = activity.getAgenticTenantId()) !== null && _h !== void 0 ? _h : '', agenticInstanceId, agenticUserId, [scope]);
                connectorClient = connectorClient_1.ConnectorClient.createClientWithToken(activity.serviceUrl, token, headers);
            }
            else {
                throw new Error('Could not create connector client for agentic user');
            }
        }
        else {
            // ABS tokens will not have an azp/appid so use the botframework scope.
            // Otherwise use the appId.  This will happen when communicating back to another agent.
            const scope = (_k = (_j = identity.azp) !== null && _j !== void 0 ? _j : identity.appid) !== null && _k !== void 0 ? _k : 'https://api.botframework.com';
            const token = await tokenProvider.getAccessToken(scope);
            connectorClient = connectorClient_1.ConnectorClient.createClientWithToken(activity.serviceUrl, token, headers);
        }
        return connectorClient;
    }
    /**
     * Creates the JwtPayload object with the provided appId.
     * @param appId The bot's appId.
     * @returns The JwtPayload object containing the appId as aud.
     */
    static createIdentity(appId) {
        return {
            aud: appId
        };
    }
    /**
     * Sets the connector client on the turn context.
     *
     * @param context - The current turn context.
     * @protected
     */
    setConnectorClient(context, connectorClient) {
        context.turnState.set(this.ConnectorClientKey, connectorClient);
    }
    /**
     * Creates a user token client for a specific service URL and scope.
     *
     * @param identity - The identity used to select the token provider.
     * @param tokenServiceEndpoint - The endpoint to connect to.
     * @param scope - The authentication scope to use.
     * @param audience - No longer used.
     * @param headers - Optional headers to propagate in the request
     * @returns A promise that resolves to a UserTokenClient instance.
     * @protected
     */
    async createUserTokenClient(identity, tokenServiceEndpoint = (0, customUserTokenAPI_1.getTokenServiceEndpoint)(), scope = 'https://api.botframework.com', audience = 'https://api.botframework.com', headers) {
        if (!(identity === null || identity === void 0 ? void 0 : identity.aud)) {
            // anonymous
            return oauth_1.UserTokenClient.createClientWithScope(tokenServiceEndpoint, null, scope, headers);
        }
        // get the correct token provider
        const tokenProvider = this.connectionManager.getTokenProvider(identity, tokenServiceEndpoint);
        return oauth_1.UserTokenClient.createClientWithScope(tokenServiceEndpoint, tokenProvider, scope, headers);
    }
    /**
     * Sets the user token client on the turn context.
     *
     * @param context - The current turn context.
     * @protected
     */
    setUserTokenClient(context, userTokenClient) {
        context.turnState.set(this.UserTokenClientKey, userTokenClient);
    }
    /**
     * @deprecated This function will not be supported in future versions.  Create TurnContext directly.
     * Creates a TurnContext for the given activity and logic.
     * @param activity - The activity to process.
     * @param logic - The logic to execute.
     * @param identity - The identity used for the new context.
     * @returns The created TurnContext.
     */
    createTurnContext(activity, logic, identity) {
        return new turnContext_1.TurnContext(this, activity, identity);
    }
    /**
     * Sends multiple activities to the conversation.
     * @param context - The TurnContext for the current turn.
     * @param activities - The activities to send.
     * @returns A promise representing the array of ResourceResponses for the sent activities.
     */
    async sendActivities(context, activities) {
        var _a;
        if (!context) {
            throw agents_activity_1.ExceptionHelper.generateException(TypeError, errorHelper_1.Errors.ContextParameterRequired);
        }
        if (!activities) {
            throw agents_activity_1.ExceptionHelper.generateException(TypeError, errorHelper_1.Errors.ActivitiesParameterRequired);
        }
        if (activities.length === 0) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.EmptyActivitiesArray);
        }
        const responses = [];
        for (const activity of activities) {
            delete activity.id;
            let response = { id: '' };
            if (activity.type === agents_activity_1.ActivityTypes.InvokeResponse) {
                context.turnState.set(activityHandler_1.INVOKE_RESPONSE_KEY, activity);
            }
            else if (activity.type === agents_activity_1.ActivityTypes.Trace && activity.channelId !== agents_activity_1.Channels.Emulator) {
                // no-op
            }
            else {
                if (!activity.serviceUrl || (activity.conversation == null) || !activity.conversation.id) {
                    throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.InvalidActivityObject);
                }
                if (activity.replyToId) {
                    response = await context.turnState.get(this.ConnectorClientKey).replyToActivity(activity.conversation.id, activity.replyToId, activity);
                }
                else {
                    response = await context.turnState.get(this.ConnectorClientKey).sendToConversation(activity.conversation.id, activity);
                }
            }
            if (!response) {
                response = { id: (_a = activity.id) !== null && _a !== void 0 ? _a : '' };
            }
            responses.push(response);
        }
        return responses;
    }
    /**
     * Processes an incoming request and sends the response.
     * @param request - The incoming request.
     * @param res - The response to send.
     * @param logic - The logic to execute.
     * @param headerPropagation - Optional function to handle header propagation.
     */
    async process(request, res, logic, headerPropagation) {
        var _a, _b;
        const headers = new headerPropagation_1.HeaderPropagation(request.headers);
        if (headerPropagation && typeof headerPropagation === 'function') {
            headerPropagation(headers);
            logger.debug('Headers to propagate: ', headers);
        }
        const end = (status, body, isInvokeResponseOrExpectReplies = false) => {
            res.status(status);
            if (isInvokeResponseOrExpectReplies) {
                res.setHeader('content-type', 'application/json');
            }
            if (body) {
                res.send(body);
            }
            res.end();
        };
        if (!request.body) {
            throw new TypeError('`request.body` parameter required, make sure express.json() is used as middleware');
        }
        const incoming = (0, activityWireCompat_1.normalizeIncomingActivity)(request.body);
        const activity = agents_activity_1.Activity.fromObject(incoming);
        logger.info(`--> Processing incoming activity, type:${activity.type} channel:${activity.channelId}`);
        if (!this.isValidChannelActivity(activity)) {
            return end(statusCodes_1.StatusCodes.BAD_REQUEST);
        }
        logger.debug('Received activity: ', activity);
        const context = new turnContext_1.TurnContext(this, activity, request.user);
        // if Delivery Mode == ExpectReplies, we don't need a connector client.
        if (this.resolveIfConnectorClientIsNeeded(activity)) {
            const connectorClient = await this.createConnectorClientWithIdentity(request.user, activity, headers);
            this.setConnectorClient(context, connectorClient);
        }
        if (!activity.isAgenticRequest()) {
            const userTokenClient = await this.createUserTokenClient(request.user);
            this.setUserTokenClient(context, userTokenClient);
        }
        if ((activity === null || activity === void 0 ? void 0 : activity.type) === agents_activity_1.ActivityTypes.InvokeResponse ||
            (activity === null || activity === void 0 ? void 0 : activity.type) === agents_activity_1.ActivityTypes.Invoke ||
            (activity === null || activity === void 0 ? void 0 : activity.deliveryMode) === agents_activity_1.DeliveryModes.ExpectReplies) {
            await this.runMiddleware(context, logic);
            const invokeResponse = this.processTurnResults(context);
            logger.debug('Activity Response (invoke/expect replies): ', invokeResponse);
            return end((_a = invokeResponse === null || invokeResponse === void 0 ? void 0 : invokeResponse.status) !== null && _a !== void 0 ? _a : statusCodes_1.StatusCodes.OK, invokeResponse === null || invokeResponse === void 0 ? void 0 : invokeResponse.body, true);
        }
        await this.runMiddleware(context, logic);
        const invokeResponse = this.processTurnResults(context);
        return end((_b = invokeResponse === null || invokeResponse === void 0 ? void 0 : invokeResponse.status) !== null && _b !== void 0 ? _b : statusCodes_1.StatusCodes.OK, invokeResponse === null || invokeResponse === void 0 ? void 0 : invokeResponse.body);
    }
    isValidChannelActivity(activity) {
        var _a, _b;
        if (activity == null) {
            logger.warn('BadRequest: Missing activity');
            return false;
        }
        if (activity.type == null || activity.type === '') {
            logger.warn('BadRequest: Missing activity type');
            return false;
        }
        if (((_a = activity.conversation) === null || _a === void 0 ? void 0 : _a.id) == null || ((_b = activity.conversation) === null || _b === void 0 ? void 0 : _b.id) === '') {
            logger.warn('BadRequest: Missing conversation.Id');
            return false;
        }
        return true;
    }
    /**
     * Updates an activity.
     * @param context - The TurnContext for the current turn.
     * @param activity - The activity to update.
     * @returns A promise representing the ResourceResponse for the updated activity.
     */
    async updateActivity(context, activity) {
        if (!context) {
            throw new TypeError('`context` parameter required');
        }
        if (!activity) {
            throw new TypeError('`activity` parameter required');
        }
        if (!activity.serviceUrl || (activity.conversation == null) || !activity.conversation.id || !activity.id) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.InvalidActivityObject);
        }
        const response = await context.turnState.get(this.ConnectorClientKey).updateActivity(activity.conversation.id, activity.id, activity);
        return response.id ? { id: response.id } : undefined;
    }
    /**
     * Deletes an activity.
     * @param context - The TurnContext for the current turn.
     * @param reference - The conversation reference of the activity to delete.
     * @returns A promise representing the completion of the delete operation.
     */
    async deleteActivity(context, reference) {
        if (!context) {
            throw new TypeError('`context` parameter required');
        }
        if (!reference || !reference.serviceUrl || (reference.conversation == null) || !reference.conversation.id || !reference.activityId) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.InvalidConversationReference);
        }
        await context.turnState.get(this.ConnectorClientKey).deleteActivity(reference.conversation.id, reference.activityId);
    }
    /**
     * Continues a conversation.
     * @param botAppIdOrIdentity - The bot identity to use when continuing the conversation. This can be either:
     * a string containing the bot's App ID (botId) or a JwtPayload object containing identity claims (must include aud).
     * @param reference - The conversation reference to continue.
     * @param logic - The logic to execute.
     * @param isResponse - No longer used.
     * @returns A promise representing the completion of the continue operation.
     */
    async continueConversation(botAppIdOrIdentity, reference, logic, isResponse = false) {
        if (!reference || !reference.serviceUrl || (reference.conversation == null) || !reference.conversation.id) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ContinueConversationInvalidReference);
        }
        if (!botAppIdOrIdentity) {
            throw new TypeError('continueConversation: botAppIdOrIdentity is required');
        }
        const botAppId = typeof botAppIdOrIdentity === 'string' ? botAppIdOrIdentity : botAppIdOrIdentity.aud;
        // Only having the botId will only work against ABS or Agentic.  Proactive to other agents will
        // not work with just botId.  Use a JwtPayload with property aud (which is botId) and appid populated.
        const identity = typeof botAppIdOrIdentity !== 'string'
            ? botAppIdOrIdentity
            : CloudAdapter.createIdentity(botAppId);
        const context = new turnContext_1.TurnContext(this, agents_activity_1.Activity.getContinuationActivity(reference), identity);
        const connectorClient = await this.createConnectorClientWithIdentity(identity, context.activity);
        this.setConnectorClient(context, connectorClient);
        if (!context.activity.isAgenticRequest()) {
            const userTokenClient = await this.createUserTokenClient(identity);
            this.setUserTokenClient(context, userTokenClient);
        }
        await this.runMiddleware(context, logic);
    }
    /**
    * Processes the turn results and returns an InvokeResponse if applicable.
    * @param context - The TurnContext for the current turn.
    * @returns The InvokeResponse if applicable, otherwise undefined.
    */
    processTurnResults(context) {
        logger.info('<--Sending back turn results');
        // Handle ExpectedReplies scenarios where all activities have been buffered and sent back at once in an invoke response.
        if (context.activity.deliveryMode === agents_activity_1.DeliveryModes.ExpectReplies) {
            return {
                status: statusCodes_1.StatusCodes.OK,
                body: {
                    activities: context.bufferedReplyActivities
                }
            };
        }
        // Handle Invoke scenarios where the agent will return a specific body and return code.
        if (context.activity.type === agents_activity_1.ActivityTypes.Invoke) {
            const activityInvokeResponse = context.turnState.get(activityHandler_1.INVOKE_RESPONSE_KEY);
            if (!activityInvokeResponse) {
                return { status: statusCodes_1.StatusCodes.NOT_IMPLEMENTED };
            }
            return activityInvokeResponse.value;
        }
        // No body to return.
        return undefined;
    }
    /**
     * Creates an activity to represent the result of creating a conversation.
     * @param createdConversationId - The ID of the created conversation.
     * @param channelId - The channel ID.
     * @param serviceUrl - The service URL.
     * @param conversationParameters - The conversation parameters.
     * @returns The created activity.
     */
    createCreateActivity(createdConversationId, channelId, serviceUrl, conversationParameters) {
        // Create a conversation update activity to represent the result.
        const activity = new agents_activity_1.Activity(agents_activity_1.ActivityTypes.Event);
        activity.name = agents_activity_1.ActivityEventNames.CreateConversation;
        activity.channelId = channelId;
        activity.serviceUrl = serviceUrl;
        activity.id = createdConversationId !== null && createdConversationId !== void 0 ? createdConversationId : uuid.v4();
        activity.conversation = {
            conversationType: undefined,
            id: createdConversationId,
            isGroup: conversationParameters.isGroup,
            name: undefined,
            tenantId: conversationParameters.tenantId,
        };
        activity.channelData = conversationParameters.channelData;
        activity.recipient = conversationParameters.agent;
        return activity;
    }
    /**
     * Creates a conversation.
     * @param agentAppId - The agent application ID.
     * @param channelId - The channel ID.
     * @param serviceUrl - The service URL.
     * @param audience - The audience.
     * @param conversationParameters - The conversation parameters.
     * @param logic - The logic to execute.
     * @returns A promise representing the completion of the create operation.
     */
    async createConversationAsync(agentAppId, channelId, serviceUrl, audience, conversationParameters, logic) {
        if (typeof serviceUrl !== 'string' || !serviceUrl) {
            throw new TypeError('`serviceUrl` must be a non-empty string');
        }
        if (!conversationParameters)
            throw new TypeError('`conversationParameters` must be defined');
        if (!logic)
            throw new TypeError('`logic` must be defined');
        const identity = CloudAdapter.createIdentity(audience);
        const restClient = await this.createConnectorClient(serviceUrl, audience, identity);
        const userTokenClient = await this.createUserTokenClient(identity);
        const createConversationResult = await restClient.createConversation(conversationParameters);
        const createActivity = this.createCreateActivity(createConversationResult.id, channelId, serviceUrl, conversationParameters);
        const context = new turnContext_1.TurnContext(this, createActivity, CloudAdapter.createIdentity(agentAppId));
        this.setConnectorClient(context, restClient);
        this.setUserTokenClient(context, userTokenClient);
        await this.runMiddleware(context, logic);
    }
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Uploads an attachment.
     * @param context - The context for the turn.
     * @param conversationId - The conversation ID.
     * @param attachmentData - The attachment data.
     * @returns A promise representing the ResourceResponse for the uploaded attachment.
     */
    async uploadAttachment(context, conversationId, attachmentData) {
        if (context === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ContextRequired);
        }
        if (conversationId === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ConversationIdRequired);
        }
        if (attachmentData === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.AttachmentDataRequired);
        }
        return await context.turnState.get(this.ConnectorClientKey).uploadAttachment(conversationId, attachmentData);
    }
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Gets attachment information.
     * @param context - The context for the turn.
     * @param attachmentId - The attachment ID.
     * @returns A promise representing the AttachmentInfo for the requested attachment.
     */
    async getAttachmentInfo(context, attachmentId) {
        if (context === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ContextRequired);
        }
        if (attachmentId === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.AttachmentIdRequired);
        }
        return await context.turnState.get(this.ConnectorClientKey).getAttachmentInfo(attachmentId);
    }
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Gets an attachment.
     * @param context - The context for the turn.
     * @param attachmentId - The attachment ID.
     * @param viewId - The view ID.
     * @returns A promise representing the NodeJS.ReadableStream for the requested attachment.
     */
    async getAttachment(context, attachmentId, viewId) {
        if (context === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ContextRequired);
        }
        if (attachmentId === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.AttachmentIdRequired);
        }
        if (viewId === undefined) {
            throw agents_activity_1.ExceptionHelper.generateException(Error, errorHelper_1.Errors.ViewIdRequired);
        }
        return await context.turnState.get(this.ConnectorClientKey).getAttachment(attachmentId, viewId);
    }
}
exports.CloudAdapter = CloudAdapter;
//# sourceMappingURL=cloudAdapter.js.map