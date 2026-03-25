/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { Middleware, MiddlewareHandler, MiddlewareSet } from './middlewareSet';
import { TurnContext } from './turnContext';
import { Activity, ConversationReference } from '@microsoft/agents-activity';
import { ResourceResponse } from './connector-client/resourceResponse';
import { AttachmentData } from './connector-client/attachmentData';
import { AttachmentInfo } from './connector-client/attachmentInfo';
import { JwtPayload } from 'jsonwebtoken';
/**
 * Abstract base class for all adapters in the Agents framework.
 *
 * @remarks
 * This class provides core functionality for handling conversations, managing middleware,
 * authentication, and error handling. Adapters are responsible for translating between
 * the Agents framework and specific communication channels (like Teams, Web Chat, etc.).
 *
 * Key features:
 * - Middleware pipeline for processing incoming and outgoing activities
 * - Error handling and recovery mechanisms
 * - Authentication provider integration
 * - Abstract methods for channel-specific operations
 * - Context management with revocable proxies for security
 */
export declare abstract class BaseAdapter {
    /**
     * The middleware set used to process the pipeline of middleware handlers.
     */
    protected middleware: MiddlewareSet;
    private turnError;
    /**
     * Symbol key used to store connector client instances in the TurnContext.
     */
    readonly ConnectorClientKey: symbol;
    /**
     * Symbol key used to store User Token Client instances in the TurnContext.
     */
    readonly UserTokenClientKey: symbol;
    /**
     * Sends a set of activities to the conversation.
     * @param context - The TurnContext for the current turn.
     * @param activities - The activities to send.
     * @returns A promise representing the array of ResourceResponses for the sent activities.
     */
    abstract sendActivities(context: TurnContext, activities: Activity[]): Promise<ResourceResponse[]>;
    /**
     * Updates an existing activity.
     * @param context - The TurnContext for the current turn.
     * @param activity - The activity to update.
     * @returns A promise representing the ResourceResponse for the updated activity.
     */
    abstract updateActivity(context: TurnContext, activity: Activity): Promise<ResourceResponse | void>;
    /**
     * Deletes an existing activity.
     * @param context - The TurnContext for the current turn.
     * @param reference - The conversation reference of the activity to delete.
     * @returns A promise representing the completion of the delete operation.
     */
    abstract deleteActivity(context: TurnContext, reference: Partial<ConversationReference>): Promise<void>;
    /**
     * Continues a conversation.
     * @param reference - The conversation reference to continue.
     * @param logic - The logic to execute.
     * @returns A promise representing the completion of the continue operation.
     */
    abstract continueConversation(botAppIdOrIdentity: string | JwtPayload, reference: Partial<ConversationReference>, logic: (revocableContext: TurnContext) => Promise<void>): Promise<void>;
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Uploads an attachment.
     * @param conversationId - The conversation ID.
     * @param attachmentData - The attachment data.
     * @returns A promise representing the ResourceResponse for the uploaded attachment.
     */
    abstract uploadAttachment(context: TurnContext, conversationId: string, attachmentData: AttachmentData): Promise<ResourceResponse>;
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Gets attachment information.
     * @param attachmentId - The attachment ID.
     * @returns A promise representing the AttachmentInfo for the requested attachment.
     */
    abstract getAttachmentInfo(context: TurnContext, attachmentId: string): Promise<AttachmentInfo>;
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Gets an attachment.
     * @param attachmentId - The attachment ID.
     * @param viewId - The view ID.
     * @returns A promise representing the NodeJS.ReadableStream for the requested attachment.
     */
    abstract getAttachment(context: TurnContext, attachmentId: string, viewId: string): Promise<NodeJS.ReadableStream>;
    /**
     * Gets the error handler for the adapter.
     * @returns The current error handler function.
     */
    get onTurnError(): (context: TurnContext, error: Error) => Promise<void>;
    /**
     * Sets the error handler for the adapter.
     * @param value - The error handler function to set.
     */
    set onTurnError(value: (context: TurnContext, error: Error) => Promise<void>);
    /**
     * Adds middleware to the adapter's middleware pipeline.
     * @param middlewares - The middleware to add.
     * @returns The adapter instance.
     */
    use(...middlewares: Array<MiddlewareHandler | Middleware>): this;
    /**
     * This method creates a revocable proxy for the given target object.
     * If the environment does not support Proxy.revocable, it returns the original object.
     * @remarks
     * This is used to enhance security by allowing the proxy to be revoked after use,
     * preventing further access to the underlying object.
     *
     * @param target The target object to be proxied.
     * @param handler Optional proxy handler to customize behavior.
     * @returns An object containing the proxy and a revoke function.
     */
    private makeRevocable;
    /**
     * Runs the middleware pipeline in sequence.
     * @param context - The TurnContext for the current turn.
     * @param next - The next function to call in the pipeline.
     * @returns A promise representing the completion of the middleware pipeline.
     */
    protected runMiddleware(context: TurnContext, next: (revocableContext: TurnContext) => Promise<void>): Promise<void>;
}
