/** * Copyright (c) Microsoft Corporation. All rights reserved. * Licensed under the MIT License. */
import { AxiosInstance } from 'axios';
import { AuthConfiguration } from '../auth/authConfiguration';
import { AuthProvider } from '../auth/authProvider';
import { Activity, ChannelAccount, ConversationParameters } from '@microsoft/agents-activity';
import { ConversationsResult } from './conversationsResult';
import { ConversationResourceResponse } from './conversationResourceResponse';
import { ResourceResponse } from './resourceResponse';
import { AttachmentInfo } from './attachmentInfo';
import { AttachmentData } from './attachmentData';
import { getProductInfo } from '../getProductInfo';
import { HeaderPropagationCollection } from '../headerPropagation';
export { getProductInfo };
/**
 * ConnectorClient is a client for interacting with the Microsoft Connector API.
 */
export declare class ConnectorClient {
    protected readonly _axiosInstance: AxiosInstance;
    /**
     * Private constructor for the ConnectorClient.
     * @param axInstance - The AxiosInstance to use for HTTP requests.
     */
    protected constructor(axInstance: AxiosInstance);
    get axiosInstance(): AxiosInstance;
    /**
     * Creates a new instance of ConnectorClient with authentication.
     * @param baseURL - The base URL for the API.
     * @param authConfig - The authentication configuration.
     * @param authProvider - The authentication provider.
     * @param scope - The scope for the authentication token.
     * @param headers - Optional headers to propagate in the request.
     * @returns A new instance of ConnectorClient.
     */
    static createClientWithAuth(baseURL: string, authConfig: AuthConfiguration, authProvider: AuthProvider, scope: string, headers?: HeaderPropagationCollection): Promise<ConnectorClient>;
    /**
     * Creates a new instance of ConnectorClient with token.
     * @param baseURL - The base URL for the API.
     * @param token - The authentication token.
     * @param headers - Optional headers to propagate in the request.
     * @returns A new instance of ConnectorClient.
     */
    static createClientWithToken(baseURL: string, token: string, headers?: HeaderPropagationCollection): ConnectorClient;
    /**
     * Retrieves a list of conversations.
     * @param continuationToken - The continuation token for pagination.
     * @returns A list of conversations.
     */
    getConversations(continuationToken?: string): Promise<ConversationsResult>;
    getConversationMember(userId: string, conversationId: string): Promise<ChannelAccount>;
    /**
     * Creates a new conversation.
     * @param body - The conversation parameters.
     * @returns The conversation resource response.
     */
    createConversation(body: ConversationParameters): Promise<ConversationResourceResponse>;
    /**
     * Replies to an activity in a conversation.
     * @param conversationId - The ID of the conversation.
     * @param activityId - The ID of the activity.
     * @param body - The activity object.
     * @returns The resource response.
     */
    replyToActivity(conversationId: string, activityId: string, body: Activity): Promise<ResourceResponse>;
    /**
     * Trim the conversationId to a fixed length when creating the URL. This is applied only in specific API calls for agentic calls.
     * @param conversationId The ID of the conversation to potentially truncate.
     * @param activity The activity object used to determine if truncation is necessary.
     * @returns The original or truncated conversationId, depending on the channel and activity role.
     */
    private conditionallyTruncateConversationId;
    /**
     * Sends an activity to a conversation.
     * @param conversationId - The ID of the conversation.
     * @param body - The activity object.
     * @returns The resource response.
     */
    sendToConversation(conversationId: string, body: Activity): Promise<ResourceResponse>;
    /**
     * Updates an activity in a conversation.
     * @param conversationId - The ID of the conversation.
     * @param activityId - The ID of the activity.
     * @param body - The activity object.
     * @returns The resource response.
     */
    updateActivity(conversationId: string, activityId: string, body: Activity): Promise<ResourceResponse>;
    /**
     * Deletes an activity from a conversation.
     * @param conversationId - The ID of the conversation.
     * @param activityId - The ID of the activity.
     * @returns A promise that resolves when the activity is deleted.
     */
    deleteActivity(conversationId: string, activityId: string): Promise<void>;
    /**
       * Uploads an attachment to a conversation.
       * @param conversationId - The ID of the conversation.
       * @param body - The attachment data.
       * @returns The resource response.
       */
    uploadAttachment(conversationId: string, body: AttachmentData): Promise<ResourceResponse>;
    /**
     * Retrieves attachment information by attachment ID.
     * @param attachmentId - The ID of the attachment.
     * @returns The attachment information.
     */
    getAttachmentInfo(attachmentId: string): Promise<AttachmentInfo>;
    /**
     * Retrieves an attachment by attachment ID and view ID.
     * @param attachmentId - The ID of the attachment.
     * @param viewId - The ID of the view.
     * @returns The attachment as a readable stream.
     */
    getAttachment(attachmentId: string, viewId: string): Promise<NodeJS.ReadableStream>;
}
