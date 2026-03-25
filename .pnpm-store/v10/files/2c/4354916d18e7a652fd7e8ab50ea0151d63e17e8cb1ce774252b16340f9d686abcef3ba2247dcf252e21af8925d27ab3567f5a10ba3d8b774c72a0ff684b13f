import { TurnContext } from './turnContext';
import { InvokeResponse } from './invoke/invokeResponse';
import { AdaptiveCardInvokeValue } from './invoke/adaptiveCardInvokeValue';
import { SearchInvokeValue } from './invoke/searchInvokeValue';
import { SearchInvokeResponse } from './invoke/searchInvokeResponse';
import { AdaptiveCardInvokeResponse } from './invoke/adaptiveCardInvokeResponse';
/** Symbol key for invoke response */
export declare const INVOKE_RESPONSE_KEY: unique symbol;
/**
 * Type definition for agent handler function
 * @param context - The turn context for the current turn of conversation
 * @param next - The function to call to continue to the next middleware or handler
 * @returns A promise representing the asynchronous operation
 */
export type AgentHandler = (context: TurnContext, next: () => Promise<void>) => Promise<any>;
/**
 * Handles incoming activities from channels and dispatches them to the appropriate handlers.
 *
 * @remarks
 * This class is provided to simplify the migration from Bot Framework SDK v4 to the Agents Hosting framework.
 *
 * The ActivityHandler serves as the central hub for processing incoming activities in conversational AI applications.
 * It provides a comprehensive framework for handling various activity types including messages, conversation updates,
 * message reactions, typing indicators, installation updates, and invoke operations such as adaptive cards and search.
 *
 * ## Key Features:
 * - **Activity Routing**: Automatically routes activities to appropriate handlers based on activity type
 * - **Handler Registration**: Provides fluent API methods (onMessage, onConversationUpdate, etc.) for registering event handlers
 * - **Invoke Support**: Built-in handling for adaptive card actions and search invoke operations
 * - **Error Handling**: Robust error handling with proper HTTP status codes for invoke operations
 * - **Extensibility**: Designed for inheritance to allow custom behavior and specialized handlers
 *
 * ## Usage:
 * ```typescript
 * const handler = new ActivityHandler()
 *   .onMessage(async (context, next) => {
 *     await context.sendActivity('Hello!');
 *     await next();
 *   })
 *   .onMembersAdded(async (context, next) => {
 *     // Welcome new members
 *     await next();
 *   });
 * ```
 *
 * Developers can extend this class to implement domain-specific logic, override default behaviors,
 * or add support for custom activity types and invoke operations.
 */
export declare class ActivityHandler {
    /**
     * Collection of handlers registered for different activity types
     * @protected
     */
    protected readonly handlers: {
        [type: string]: AgentHandler[];
    };
    /**
     * Registers a handler for the Turn activity type.
     * This is called for all activities regardless of type.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onTurn(handler: AgentHandler): this;
    /**
     * Registers a handler for the MembersAdded activity type.
     * This is called when new members are added to the conversation.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onMembersAdded(handler: AgentHandler): this;
    /**
     * Registers a handler for the MembersRemoved activity type.
     * This is called when members are removed from the conversation.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onMembersRemoved(handler: AgentHandler): this;
    /**
     * Registers a handler for the Message activity type.
     * This is called when a message is received from the user.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onMessage(handler: AgentHandler): this;
    /**
     * Registers a handler for the MessageUpdate activity type.
     * This is called when a message is updated.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onMessageUpdate(handler: AgentHandler): this;
    /**
     * Registers a handler for the MessageDelete activity type.
     * This is called when a message is deleted.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onMessageDelete(handler: AgentHandler): this;
    /**
     * Registers a handler for the ConversationUpdate activity type.
     * This is called when the conversation is updated, such as when members are added or removed.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onConversationUpdate(handler: AgentHandler): this;
    /**
     * Registers a handler for the MessageReaction activity type.
     * This is called when reactions are added or removed from messages.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onMessageReaction(handler: AgentHandler): this;
    /**
     * Registers a handler for the ReactionsAdded activity type.
     * This is called when reactions are added to messages.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onReactionsAdded(handler: AgentHandler): this;
    /**
     * Registers a handler for the ReactionsRemoved activity type.
     * This is called when reactions are removed from messages.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onReactionsRemoved(handler: AgentHandler): this;
    /**
     * Registers a handler for the Typing activity type.
     * This is called when a typing indicator is received.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onTyping(handler: AgentHandler): this;
    /**
     * Registers a handler for the InstallationUpdate activity type.
     * This is called when an agent is installed or uninstalled.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onInstallationUpdate(handler: AgentHandler): this;
    /**
     * Registers a handler for the InstallationUpdateAdd activity type.
     * This is called when an agent is installed or upgraded.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onInstallationUpdateAdd(handler: AgentHandler): this;
    /**
     * Registers a handler for the InstallationUpdateRemove activity type.
     * This is called when an agent is uninstalled or downgraded.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onInstallationUpdateRemove(handler: AgentHandler): this;
    /**
     * Registers a handler for the EndOfConversation activity type.
     * This is called when the conversation ends.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onEndOfConversation(handler: AgentHandler): this;
    /**
     * Registers a handler for the SignInInvoke activity type.
     * This is called when a sign-in is requested.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onSignInInvoke(handler: AgentHandler): this;
    /**
     * Registers a handler for unrecognized activity types.
     * This is called when an activity type is not recognized.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onUnrecognizedActivityType(handler: AgentHandler): this;
    /**
     * Registers an activity event handler for the _dialog_ event, emitted as the last event for an incoming activity.
     * This handler is called after all other handlers have been processed.
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     */
    onDialog(handler: AgentHandler): this;
    /**
     * Runs the activity handler pipeline.
     * This method is called to process an incoming activity through the registered handlers.
     * @param context - The turn context for the current turn of conversation
     * @throws Error if context is missing, activity is missing, or activity type is missing
     */
    run(context: TurnContext): Promise<void>;
    /**
     * Handles the Turn activity.
     * This method is called for every activity type and dispatches to the appropriate handler.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected onTurnActivity(context: TurnContext): Promise<void>;
    /**
     * Handles the Message activity.
     * This method processes incoming message activities.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected onMessageActivity(context: TurnContext): Promise<void>;
    /**
     * Handles the MessageUpdate activity.
     * This method processes message update activities.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected onMessageUpdateActivity(context: TurnContext): Promise<void>;
    /**
     * Handles the MessageDelete activity.
     * This method processes message deletion activities.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected onMessageDeleteActivity(context: TurnContext): Promise<void>;
    /**
     * Handles the ConversationUpdate activity.
     * This method processes conversation update activities.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected onConversationUpdateActivity(context: TurnContext): Promise<void>;
    /**
     * Handles the SignInInvoke activity.
     * This method processes sign-in invoke activities.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected onSigninInvokeActivity(context: TurnContext): Promise<void>;
    /**
     * Handles the Invoke activity.
     * This method processes various invoke activities based on their name.
     * @param context - The turn context for the current turn of conversation
     * @returns An invoke response object with status and body
     * @protected
     */
    protected onInvokeActivity(context: TurnContext): Promise<InvokeResponse>;
    /**
     * Handles the AdaptiveCardInvoke activity.
     * This method processes adaptive card invoke activities.
     * @param _context - The turn context for the current turn of conversation
     * @param _invokeValue - The adaptive card invoke value
     * @returns A promise that resolves to an adaptive card invoke response
     * @protected
     */
    protected onAdaptiveCardInvoke(_context: TurnContext, _invokeValue: AdaptiveCardInvokeValue): Promise<AdaptiveCardInvokeResponse>;
    /**
     * Handles the SearchInvoke activity.
     * This method processes search invoke activities.
     * @param _context - The turn context for the current turn of conversation
     * @param _invokeValue - The search invoke value
     * @returns A promise that resolves to a search invoke response
     * @protected
     */
    protected onSearchInvoke(_context: TurnContext, _invokeValue: SearchInvokeValue): Promise<SearchInvokeResponse>;
    /**
     * Retrieves the SearchInvoke value from the activity.
     * This method extracts and validates the search invoke value from an activity.
     * @param activity - The activity to extract the search invoke value from
     * @returns The validated search invoke value
     * @private
     */
    private getSearchInvokeValue;
    /**
     * Retrieves the AdaptiveCardInvoke value from the activity.
     * This method extracts and validates the adaptive card invoke value from an activity.
     * @param activity - The activity to extract the adaptive card invoke value from
     * @returns The validated adaptive card invoke value
     * @private
     */
    private getAdaptiveCardInvokeValue;
    /**
     * Creates an error response for AdaptiveCardInvoke.
     * This method creates an error response for adaptive card invoke activities.
     * @param statusCode - The HTTP status code for the response
     * @param code - The error code
     * @param message - The error message
     * @returns An adaptive card invoke error response
     * @private
     */
    private createAdaptiveCardInvokeErrorResponse;
    /**
     * Handles the MessageReaction activity.
     * This method processes message reaction activities.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected onMessageReactionActivity(context: TurnContext): Promise<void>;
    /**
     * Handles the EndOfConversation activity.
     * This method processes end of conversation activities.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected onEndOfConversationActivity(context: TurnContext): Promise<void>;
    /**
     * Handles the Typing activity.
     * This method processes typing indicator activities.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected onTypingActivity(context: TurnContext): Promise<void>;
    /**
     * Handles the InstallationUpdate activity.
     * This method processes installation update activities.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected onInstallationUpdateActivity(context: TurnContext): Promise<void>;
    /**
     * Handles unrecognized activity types.
     * This method processes activities with unrecognized types.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected onUnrecognizedActivity(context: TurnContext): Promise<void>;
    /**
     * Dispatches the ConversationUpdate activity.
     * This method dispatches conversation update activities to the appropriate handlers.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected dispatchConversationUpdateActivity(context: TurnContext): Promise<void>;
    /**
     * Dispatches the MessageReaction activity.
     * This method dispatches message reaction activities to the appropriate handlers.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected dispatchMessageReactionActivity(context: TurnContext): Promise<void>;
    /**
     * Dispatches the MessageUpdate activity.
     * This method dispatches message update activities to the appropriate handlers.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected dispatchMessageUpdateActivity(context: TurnContext): Promise<void>;
    /**
     * Dispatches the MessageDelete activity.
     * This method dispatches message delete activities to the appropriate handlers.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected dispatchMessageDeleteActivity(context: TurnContext): Promise<void>;
    /**
     * Returns the default next event handler.
     * This method creates a function that calls the default handler.
     * @param context - The turn context for the current turn of conversation
     * @returns A function that calls the default handler
     * @protected
     */
    protected defaultNextEvent(context: TurnContext): () => Promise<void>;
    /**
     * Registers a handler for a specific activity type.
     * This method adds a handler to the list of handlers for a specific activity type.
     * @param type - The activity type to register the handler for
     * @param handler - The handler to register
     * @returns The current instance for method chaining
     * @protected
     */
    protected on(type: string, handler: AgentHandler): this;
    /**
     * Executes the handlers for a specific activity type.
     * This method calls each registered handler for the specified activity type.
     * @param context - The turn context for the current turn of conversation
     * @param type - The activity type to handle
     * @param onNext - The function to call when all handlers have been executed
     * @returns The value returned by the last handler
     * @protected
     */
    protected handle(context: TurnContext, type: string, onNext: () => Promise<void>): Promise<any>;
    /**
     * Creates an InvokeResponse object.
     * This static method creates an invoke response with the specified body.
     * @param body - The body of the response
     * @returns An invoke response object with status and body
     * @protected
     */
    protected static createInvokeResponse(body?: any): InvokeResponse;
    /**
     * Dispatches the Event activity.
     * This method dispatches event activities to the appropriate handlers.
     * @param context - The turn context for the current turn of conversation
     * @protected
     */
    protected dispatchEventActivity(context: TurnContext): Promise<void>;
}
