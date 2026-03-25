/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { AgentHandler } from './activityHandler';
import { BaseAdapter } from './baseAdapter';
import { TurnContext } from './turnContext';
import { Response } from 'express';
import { Request } from './auth/request';
import { ConnectorClient } from './connector-client/connectorClient';
import { AuthConfiguration } from './auth/authConfiguration';
import { AuthProvider } from './auth/authProvider';
import { Activity, ConversationReference, ConversationParameters } from '@microsoft/agents-activity';
import { ResourceResponse } from './connector-client/resourceResponse';
import { InvokeResponse } from './invoke/invokeResponse';
import { AttachmentData } from './connector-client/attachmentData';
import { AttachmentInfo } from './connector-client/attachmentInfo';
import { UserTokenClient } from './oauth';
import { HeaderPropagationCollection, HeaderPropagationDefinition } from './headerPropagation';
import { JwtPayload } from 'jsonwebtoken';
import { Connections } from './auth/connections';
/**
 * Adapter for handling agent interactions with various channels through cloud-based services.
 *
 * @remarks
 * CloudAdapter processes incoming HTTP requests from Azure Bot Service channels,
 * authenticates them, and generates outgoing responses. It manages the communication
 * flow between agents and users across different channels, handling activities, attachments,
 * and conversation continuations.
 */
export declare class CloudAdapter extends BaseAdapter {
    /**
     * Client for connecting to the Azure Bot Service
     */
    connectionManager: Connections;
    /**
     * Creates an instance of CloudAdapter.
     * @param authConfig - The authentication configuration for securing communications.
     * @param authProvider - No longer used.
     * @param userTokenClient - No longer used.
     */
    constructor(authConfig?: AuthConfiguration, authProvider?: AuthProvider, userTokenClient?: UserTokenClient);
    /**
     * Determines whether a connector client is needed based on the delivery mode and service URL of the given activity.
     *
     * @param activity - The activity to evaluate.
     * @returns true if a ConnectorClient is needed, false otherwise.
     *  A connector client is required if the activity's delivery mode is not "ExpectReplies"
     *  and the service URL is not null or empty.
     * @protected
     */
    protected resolveIfConnectorClientIsNeeded(activity: Activity): boolean;
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
    protected createConnectorClient(serviceUrl: string, scope: string, identity: JwtPayload, headers?: HeaderPropagationCollection): Promise<ConnectorClient>;
    /**
     * Creates a connector client for a specific identity and activity.
     *
     * @param identity - The identity used to select the token provider.
     * @param activity - The activity used to select the token provider.
     * @param headers - Optional headers to propagate in the request.
     * @returns A promise that resolves to a ConnectorClient instance.
     * @protected
     */
    protected createConnectorClientWithIdentity(identity: JwtPayload, activity: Activity, headers?: HeaderPropagationCollection): Promise<ConnectorClient>;
    /**
     * Creates the JwtPayload object with the provided appId.
     * @param appId The bot's appId.
     * @returns The JwtPayload object containing the appId as aud.
     */
    static createIdentity(appId: string): JwtPayload;
    /**
     * Sets the connector client on the turn context.
     *
     * @param context - The current turn context.
     * @protected
     */
    protected setConnectorClient(context: TurnContext, connectorClient?: ConnectorClient): void;
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
    protected createUserTokenClient(identity: JwtPayload, tokenServiceEndpoint?: string, scope?: string, audience?: string, headers?: HeaderPropagationCollection): Promise<UserTokenClient>;
    /**
     * Sets the user token client on the turn context.
     *
     * @param context - The current turn context.
     * @protected
     */
    protected setUserTokenClient(context: TurnContext, userTokenClient?: UserTokenClient): void;
    /**
     * @deprecated This function will not be supported in future versions.  Create TurnContext directly.
     * Creates a TurnContext for the given activity and logic.
     * @param activity - The activity to process.
     * @param logic - The logic to execute.
     * @param identity - The identity used for the new context.
     * @returns The created TurnContext.
     */
    createTurnContext(activity: Activity, logic: AgentHandler, identity?: JwtPayload): TurnContext;
    /**
     * Sends multiple activities to the conversation.
     * @param context - The TurnContext for the current turn.
     * @param activities - The activities to send.
     * @returns A promise representing the array of ResourceResponses for the sent activities.
     */
    sendActivities(context: TurnContext, activities: Activity[]): Promise<ResourceResponse[]>;
    /**
     * Processes an incoming request and sends the response.
     * @param request - The incoming request.
     * @param res - The response to send.
     * @param logic - The logic to execute.
     * @param headerPropagation - Optional function to handle header propagation.
     */
    process(request: Request, res: Response, logic: (context: TurnContext) => Promise<void>, headerPropagation?: HeaderPropagationDefinition): Promise<void>;
    private isValidChannelActivity;
    /**
     * Updates an activity.
     * @param context - The TurnContext for the current turn.
     * @param activity - The activity to update.
     * @returns A promise representing the ResourceResponse for the updated activity.
     */
    updateActivity(context: TurnContext, activity: Activity): Promise<ResourceResponse | void>;
    /**
     * Deletes an activity.
     * @param context - The TurnContext for the current turn.
     * @param reference - The conversation reference of the activity to delete.
     * @returns A promise representing the completion of the delete operation.
     */
    deleteActivity(context: TurnContext, reference: Partial<ConversationReference>): Promise<void>;
    /**
     * Continues a conversation.
     * @param botAppIdOrIdentity - The bot identity to use when continuing the conversation. This can be either:
     * a string containing the bot's App ID (botId) or a JwtPayload object containing identity claims (must include aud).
     * @param reference - The conversation reference to continue.
     * @param logic - The logic to execute.
     * @param isResponse - No longer used.
     * @returns A promise representing the completion of the continue operation.
     */
    continueConversation(botAppIdOrIdentity: string | JwtPayload, reference: ConversationReference, logic: (revocableContext: TurnContext) => Promise<void>, isResponse?: Boolean): Promise<void>;
    /**
    * Processes the turn results and returns an InvokeResponse if applicable.
    * @param context - The TurnContext for the current turn.
    * @returns The InvokeResponse if applicable, otherwise undefined.
    */
    protected processTurnResults(context: TurnContext): InvokeResponse | undefined;
    /**
     * Creates an activity to represent the result of creating a conversation.
     * @param createdConversationId - The ID of the created conversation.
     * @param channelId - The channel ID.
     * @param serviceUrl - The service URL.
     * @param conversationParameters - The conversation parameters.
     * @returns The created activity.
     */
    protected createCreateActivity(createdConversationId: string | undefined, channelId: string, serviceUrl: string, conversationParameters: ConversationParameters): Activity;
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
    createConversationAsync(agentAppId: string, channelId: string, serviceUrl: string, audience: string, conversationParameters: ConversationParameters, logic: (context: TurnContext) => Promise<void>): Promise<void>;
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Uploads an attachment.
     * @param context - The context for the turn.
     * @param conversationId - The conversation ID.
     * @param attachmentData - The attachment data.
     * @returns A promise representing the ResourceResponse for the uploaded attachment.
     */
    uploadAttachment(context: TurnContext, conversationId: string, attachmentData: AttachmentData): Promise<ResourceResponse>;
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Gets attachment information.
     * @param context - The context for the turn.
     * @param attachmentId - The attachment ID.
     * @returns A promise representing the AttachmentInfo for the requested attachment.
     */
    getAttachmentInfo(context: TurnContext, attachmentId: string): Promise<AttachmentInfo>;
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Gets an attachment.
     * @param context - The context for the turn.
     * @param attachmentId - The attachment ID.
     * @param viewId - The view ID.
     * @returns A promise representing the NodeJS.ReadableStream for the requested attachment.
     */
    getAttachment(context: TurnContext, attachmentId: string, viewId: string): Promise<NodeJS.ReadableStream>;
}
