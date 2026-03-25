import { BaseAdapter } from './baseAdapter';
import { Activity, ConversationReference } from '@microsoft/agents-activity';
import { ResourceResponse } from './connector-client/resourceResponse';
import { TurnContextStateCollection } from './turnContextStateCollection';
import { AttachmentInfo } from './connector-client/attachmentInfo';
import { AttachmentData } from './connector-client/attachmentData';
import { StreamingResponse } from './app/streaming/streamingResponse';
import { JwtPayload } from 'jsonwebtoken';
/**
 * Defines a handler for processing and sending activities.
 * Used for middleware that needs to intercept or modify activities being sent.
 *
 * @param context The current turn context
 * @param activities The activities being sent
 * @param next Function to call to continue the middleware chain
 */
export type SendActivitiesHandler = (context: TurnContext, activities: Activity[], next: () => Promise<ResourceResponse[]>) => Promise<ResourceResponse[]>;
/**
 * Defines a handler for updating an activity.
 * Used for middleware that needs to intercept or modify activity updates.
 *
 * @param context The current turn context
 * @param activity The activity being updated
 * @param next Function to call to continue the middleware chain
 */
export type UpdateActivityHandler = (context: TurnContext, activity: Activity, next: () => Promise<void>) => Promise<void>;
/**
 * Defines a handler for deleting an activity.
 * Used for middleware that needs to intercept or handle activity deletions.
 *
 * @param context The current turn context
 * @param reference Reference to the activity being deleted
 * @param next Function to call to continue the middleware chain
 */
export type DeleteActivityHandler = (context: TurnContext, reference: ConversationReference, next: () => Promise<void>) => Promise<void>;
/**
 * Key for the agent callback handler in TurnState collection.
 */
export declare const AgentCallbackHandlerKey = "agentCallbackHandler";
/**
 * Represents the context for a single turn in a conversation between a user and an agent.
 *
 * @remarks
 * TurnContext is a central concept in the Agents framework - it contains:
 * - The incoming activity that started the turn
 * - Access to the adapter that can be used to send responses
 * - A state collection for storing information during the turn
 * - Methods for sending, updating, and deleting activities
 * - Middleware hooks for intercepting activity operations
 *
 * The TurnContext object is created by the adapter when an activity is received
 * and is passed to the agent's logic to process the turn. It maintains information
 * about the conversation and provides methods to send responses.
 *
 * This class follows the builder pattern for registering middleware handlers.
 */
export declare class TurnContext {
    private readonly _adapter?;
    private readonly _activity?;
    private readonly _respondedRef;
    private readonly _turnState;
    private readonly _onSendActivities;
    private readonly _onUpdateActivity;
    private readonly _onDeleteActivity;
    private readonly _turn;
    private readonly _locale;
    private readonly _streamingResponse;
    private readonly _identity?;
    /**
     * Initializes a new instance of the TurnContext class.
     *
     * @param adapterOrContext The adapter that created this context, or another TurnContext to clone
     * @param request The activity for the turn (required when first parameter is an adapter)
     */
    constructor(adapterOrContext: BaseAdapter, request: Activity, identity?: JwtPayload);
    constructor(adapterOrContext: TurnContext);
    /**
     * A list of reply activities that are buffered until the end of the turn.
     *
     * This is primarily used with the 'expectReplies' delivery mode where all
     * activities during a turn are collected and returned as a single response.
     */
    readonly bufferedReplyActivities: Activity[];
    /**
     * Sends a trace activity for debugging purposes.
     *
     * @param name The name/category of the trace
     * @param value The value/data to include in the trace
     * @param valueType Optional type name for the value
     * @param label Optional descriptive label for the trace
     * @returns A promise that resolves to the resource response or undefined
     *
     * @remarks
     * Trace activities are typically used for debugging and are only visible in
     * channels that support them, like the Bot Framework Emulator.
     */
    sendTraceActivity(name: string, value?: any, valueType?: string, label?: string): Promise<ResourceResponse | undefined>;
    /**
     * Sends an activity to the sender of the incoming activity.
     *
     * @param activityOrText The activity to send or a string for a simple message
     * @param speak Optional text to be spoken by the agent
     * @param inputHint Optional input hint to indicate if the agent is expecting input
     * @returns A promise that resolves to the resource response or undefined
     *
     * @remarks
     * This is the primary method used to respond to the user. It automatically
     * addresses the response to the correct conversation and recipient using
     * information from the incoming activity.
     */
    sendActivity(activityOrText: string | Activity, speak?: string, inputHint?: string): Promise<ResourceResponse | undefined>;
    /**
     * Sends multiple activities to the sender of the incoming activity.
     *
     * @param activities The array of activities to send
     * @returns A promise that resolves to an array of resource responses
     *
     * @remarks
     * This method applies conversation references to each activity and
     * emits them through the middleware chain before sending them to
     * the adapter.
     */
    sendActivities(activities: Activity[]): Promise<ResourceResponse[]>;
    /**
     * Updates an existing activity in the conversation.
     *
     * @param activity The activity to update with its ID specified
     * @returns A promise that resolves when the activity has been updated
     *
     * @remarks
     * This can be used to edit previously sent activities, for example to
     * update the content of an adaptive card or change a message.
     */
    updateActivity(activity: Activity): Promise<void>;
    /**
     * Deletes an activity from the conversation.
     *
     * @param idOrReference The ID of the activity to delete or a conversation reference
     * @returns A promise that resolves when the activity has been deleted
     */
    deleteActivity(idOrReference: string | ConversationReference): Promise<void>;
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Uploads an attachment to the conversation.
     *
     * @param conversationId The ID of the conversation
     * @param attachmentData The attachment data to upload
     * @returns A promise that resolves to the resource response
     */
    uploadAttachment(conversationId: string, attachmentData: AttachmentData): Promise<ResourceResponse>;
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Gets information about an attachment.
     *
     * @param attachmentId The ID of the attachment
     * @returns A promise that resolves to the attachment information
     */
    getAttachmentInfo(attachmentId: string): Promise<AttachmentInfo>;
    /**
     * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
     * Gets the content of an attachment.
     *
     * @param attachmentId The ID of the attachment
     * @param viewId The view to get
     * @returns A promise that resolves to a readable stream of the attachment content
     */
    getAttachment(attachmentId: string, viewId: string): Promise<NodeJS.ReadableStream>;
    /**
     * Registers a handler for intercepting and processing activities being sent.
     *
     * @param handler The handler to register
     * @returns The current TurnContext instance for chaining
     *
     * @remarks
     * This method follows a middleware pattern, allowing multiple handlers to
     * be chained together. Handlers can modify activities or inject new ones.
     */
    onSendActivities(handler: SendActivitiesHandler): this;
    /**
     * Registers a handler for intercepting activity updates.
     *
     * @param handler The handler to register
     * @returns The current TurnContext instance for chaining
     */
    onUpdateActivity(handler: UpdateActivityHandler): this;
    /**
     * Registers a handler for intercepting activity deletions.
     *
     * @param handler The handler to register
     * @returns The current TurnContext instance for chaining
     */
    onDeleteActivity(handler: DeleteActivityHandler): this;
    /**
     * Copies the properties of this TurnContext to another TurnContext.
     *
     * Used internally when cloning contexts.
     *
     * @param context The context to copy to
     * @protected
     */
    protected copyTo(context: TurnContext): void;
    /**
     * Gets the adapter that created this context.
     *
     * @remarks
     * The adapter is responsible for sending and receiving activities
     * to and from the user's channel.
     */
    get adapter(): BaseAdapter;
    /**
     * Gets the incoming activity that started this turn.
     *
     * @remarks
     * This is the activity that was received from the user or channel
     * and triggered the creation of this context.
     */
    get activity(): Activity;
    get identity(): JwtPayload;
    /**
     * Gets or sets whether the turn has sent a response to the user.
     *
     * @remarks
     * This is used to track whether the agent has responded to the user's
     * activity. Once set to true, it cannot be set back to false.
     */
    get responded(): boolean;
    set responded(value: boolean);
    /**
     * Gets or sets the locale for the turn.
     *
     * @remarks
     * The locale affects language-dependent operations like
     * formatting dates or numbers.
     */
    get locale(): string | undefined;
    set locale(value: string | undefined);
    /**
     * Gets the turn state collection for storing data during the turn.
     *
     * @remarks
     * The turn state collection provides a dictionary-like interface
     * for storing arbitrary data that needs to be accessible during
     * the processing of the current turn.
     */
    get turnState(): TurnContextStateCollection;
    get streamingResponse(): StreamingResponse;
    /**
     * Emits events to registered middleware handlers.
     *
     * @param handlers Array of handlers to execute
     * @param arg The argument to pass to each handler
     * @param next The function to execute at the end of the middleware chain
     * @returns A promise that resolves to the result from the handlers or next function
     * @private
     *
     * @remarks
     * This internal method implements the middleware pattern, allowing
     * handlers to be chained together with each having the option to
     * short-circuit the chain.
     */
    private emit;
}
