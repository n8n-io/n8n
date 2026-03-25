/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { debug } from '@microsoft/agents-activity/logger'
import { TurnContext } from './turnContext'
import { Activity, ActivityTypes, Channels, ExceptionHelper } from '@microsoft/agents-activity'
import { Errors } from './errorHelper'
import { StatusCodes } from './statusCodes'
import { InvokeResponse } from './invoke/invokeResponse'
import { InvokeException } from './invoke/invokeException'
import { AdaptiveCardInvokeValue } from './invoke/adaptiveCardInvokeValue'
import { SearchInvokeValue } from './invoke/searchInvokeValue'
import { SearchInvokeResponse } from './invoke/searchInvokeResponse'
import { AdaptiveCardInvokeResponse } from './invoke/adaptiveCardInvokeResponse'
import { tokenResponseEventName } from './tokenResponseEventName'

/** Symbol key for invoke response */
export const INVOKE_RESPONSE_KEY = Symbol('invokeResponse')

/**
 * Type definition for agent handler function
 * @param context - The turn context for the current turn of conversation
 * @param next - The function to call to continue to the next middleware or handler
 * @returns A promise representing the asynchronous operation
 */
export type AgentHandler = (context: TurnContext, next: () => Promise<void>) => Promise<any>

const logger = debug('agents:activity-handler')

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
export class ActivityHandler {
  /**
   * Collection of handlers registered for different activity types
   * @protected
   */
  protected readonly handlers: { [type: string]: AgentHandler[] } = {}

  /**
   * Registers a handler for the Turn activity type.
   * This is called for all activities regardless of type.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onTurn (handler: AgentHandler): this {
    return this.on('Turn', handler)
  }

  /**
   * Registers a handler for the MembersAdded activity type.
   * This is called when new members are added to the conversation.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onMembersAdded (handler: AgentHandler): this {
    return this.on('MembersAdded', handler)
  }

  /**
   * Registers a handler for the MembersRemoved activity type.
   * This is called when members are removed from the conversation.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onMembersRemoved (handler: AgentHandler): this {
    return this.on('MembersRemoved', handler)
  }

  /**
   * Registers a handler for the Message activity type.
   * This is called when a message is received from the user.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onMessage (handler: AgentHandler): this {
    return this.on('Message', handler)
  }

  /**
   * Registers a handler for the MessageUpdate activity type.
   * This is called when a message is updated.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onMessageUpdate (handler: AgentHandler): this {
    return this.on('MessageUpdate', handler)
  }

  /**
   * Registers a handler for the MessageDelete activity type.
   * This is called when a message is deleted.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onMessageDelete (handler: AgentHandler): this {
    return this.on('MessageDelete', handler)
  }

  /**
   * Registers a handler for the ConversationUpdate activity type.
   * This is called when the conversation is updated, such as when members are added or removed.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onConversationUpdate (handler: AgentHandler): this {
    return this.on('ConversationUpdate', handler)
  }

  /**
   * Registers a handler for the MessageReaction activity type.
   * This is called when reactions are added or removed from messages.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onMessageReaction (handler: AgentHandler): this {
    return this.on('MessageReaction', handler)
  }

  /**
   * Registers a handler for the ReactionsAdded activity type.
   * This is called when reactions are added to messages.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onReactionsAdded (handler: AgentHandler): this {
    return this.on('ReactionsAdded', handler)
  }

  /**
   * Registers a handler for the ReactionsRemoved activity type.
   * This is called when reactions are removed from messages.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onReactionsRemoved (handler: AgentHandler): this {
    return this.on('ReactionsRemoved', handler)
  }

  /**
   * Registers a handler for the Typing activity type.
   * This is called when a typing indicator is received.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onTyping (handler: AgentHandler): this {
    return this.on('Typing', handler)
  }

  /**
   * Registers a handler for the InstallationUpdate activity type.
   * This is called when an agent is installed or uninstalled.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onInstallationUpdate (handler: AgentHandler): this {
    return this.on('InstallationUpdate', handler)
  }

  /**
   * Registers a handler for the InstallationUpdateAdd activity type.
   * This is called when an agent is installed or upgraded.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onInstallationUpdateAdd (handler: AgentHandler): this {
    return this.on('InstallationUpdateAdd', handler)
  }

  /**
   * Registers a handler for the InstallationUpdateRemove activity type.
   * This is called when an agent is uninstalled or downgraded.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onInstallationUpdateRemove (handler: AgentHandler): this {
    return this.on('InstallationUpdateRemove', handler)
  }

  /**
   * Registers a handler for the EndOfConversation activity type.
   * This is called when the conversation ends.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onEndOfConversation (handler: AgentHandler): this {
    return this.on('EndOfConversation', handler)
  }

  /**
   * Registers a handler for the SignInInvoke activity type.
   * This is called when a sign-in is requested.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onSignInInvoke (handler: AgentHandler): this {
    return this.on('SignInInvoke', handler)
  }

  /**
   * Registers a handler for unrecognized activity types.
   * This is called when an activity type is not recognized.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onUnrecognizedActivityType (handler: AgentHandler): this {
    return this.on('UnrecognizedActivityType', handler)
  }

  /**
   * Registers an activity event handler for the _dialog_ event, emitted as the last event for an incoming activity.
   * This handler is called after all other handlers have been processed.
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   */
  onDialog (handler: AgentHandler): this {
    return this.on('Default', handler)
  }

  /**
   * Runs the activity handler pipeline.
   * This method is called to process an incoming activity through the registered handlers.
   * @param context - The turn context for the current turn of conversation
   * @throws Error if context is missing, activity is missing, or activity type is missing
   */
  async run (context: TurnContext): Promise<void> {
    if (!context) throw ExceptionHelper.generateException(Error, Errors.MissingTurnContext)
    if (!context.activity) throw ExceptionHelper.generateException(Error, Errors.TurnContextMissingActivity)
    if (!context.activity.type) throw ExceptionHelper.generateException(Error, Errors.ActivityMissingType)

    await this.handle(context, 'Turn', async () => {
      await this.onTurnActivity(context)
    })
  }

  /**
   * Handles the Turn activity.
   * This method is called for every activity type and dispatches to the appropriate handler.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async onTurnActivity (context: TurnContext): Promise<void> {
    switch (context.activity.type) {
      case ActivityTypes.Message:
        await this.onMessageActivity(context)
        break
      case ActivityTypes.MessageUpdate:
        await this.onMessageUpdateActivity(context)
        break
      case ActivityTypes.MessageDelete:
        await this.onMessageDeleteActivity(context)
        break
      case ActivityTypes.ConversationUpdate:
        await this.onConversationUpdateActivity(context)
        break

      case ActivityTypes.Invoke: {
        const invokeResponse = await this.onInvokeActivity(context)
        if (invokeResponse && !context.turnState.get(INVOKE_RESPONSE_KEY)) {
          const activity = Activity.fromObject({ value: invokeResponse, type: 'invokeResponse' })
          await context.sendActivity(activity)
        }
        break
      }
      case ActivityTypes.MessageReaction:
        await this.onMessageReactionActivity(context)
        break
      case ActivityTypes.Typing:
        await this.onTypingActivity(context)
        break
      case ActivityTypes.InstallationUpdate:
        await this.onInstallationUpdateActivity(context)
        break
      case ActivityTypes.EndOfConversation:
        await this.onEndOfConversationActivity(context)
        break
      default:
        await this.onUnrecognizedActivity(context)
        break
    }
  }

  /**
   * Handles the Message activity.
   * This method processes incoming message activities.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async onMessageActivity (context: TurnContext): Promise<void> {
    await this.handle(context, 'Message', this.defaultNextEvent(context))
  }

  /**
   * Handles the MessageUpdate activity.
   * This method processes message update activities.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async onMessageUpdateActivity (context: TurnContext): Promise<void> {
    await this.handle(context, 'MessageUpdate', async () => {
      await this.dispatchMessageUpdateActivity(context)
    })
  }

  /**
   * Handles the MessageDelete activity.
   * This method processes message deletion activities.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async onMessageDeleteActivity (context: TurnContext): Promise<void> {
    await this.handle(context, 'MessageDelete', async () => {
      await this.dispatchMessageDeleteActivity(context)
    })
  }

  /**
   * Handles the ConversationUpdate activity.
   * This method processes conversation update activities.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async onConversationUpdateActivity (context: TurnContext): Promise<void> {
    await this.handle(context, 'ConversationUpdate', async () => {
      await this.dispatchConversationUpdateActivity(context)
    })
  }

  /**
   * Handles the SignInInvoke activity.
   * This method processes sign-in invoke activities.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async onSigninInvokeActivity (context: TurnContext): Promise<void> {
    await this.handle(context, 'SignInInvoke', this.defaultNextEvent(context))
  }

  /**
   * Handles the Invoke activity.
   * This method processes various invoke activities based on their name.
   * @param context - The turn context for the current turn of conversation
   * @returns An invoke response object with status and body
   * @protected
   */
  protected async onInvokeActivity (context: TurnContext): Promise<InvokeResponse> {
    try {
      switch (context.activity.name) {
        case 'application/search': {
          const invokeValue = this.getSearchInvokeValue(context.activity)
          const response = await this.onSearchInvoke(context, invokeValue)
          return { status: response.statusCode, body: response }
        }
        case 'adaptiveCard/action': {
          const invokeValue = this.getAdaptiveCardInvokeValue(context.activity)
          const response = await this.onAdaptiveCardInvoke(context, invokeValue)
          return { status: response.statusCode, body: response }
        }
        case 'signin/verifyState':
        case 'signin/tokenExchange':
          await this.onSigninInvokeActivity(context)
          return { status: StatusCodes.OK }
        default:
          throw new InvokeException(StatusCodes.NOT_IMPLEMENTED)
      }
    } catch (err) {
      const error = err as Error
      if (error.message === 'NotImplemented') {
        return { status: StatusCodes.NOT_IMPLEMENTED }
      }
      if (err instanceof InvokeException) {
        return err.createInvokeResponse()
      }
      throw err
    } finally {
      this.defaultNextEvent(context)()
    }
  }

  /**
   * Handles the AdaptiveCardInvoke activity.
   * This method processes adaptive card invoke activities.
   * @param _context - The turn context for the current turn of conversation
   * @param _invokeValue - The adaptive card invoke value
   * @returns A promise that resolves to an adaptive card invoke response
   * @protected
   */
  protected async onAdaptiveCardInvoke (
    _context: TurnContext,
    _invokeValue: AdaptiveCardInvokeValue
  ): Promise<AdaptiveCardInvokeResponse> {
    return await Promise.reject(new InvokeException(StatusCodes.NOT_IMPLEMENTED))
  }

  /**
   * Handles the SearchInvoke activity.
   * This method processes search invoke activities.
   * @param _context - The turn context for the current turn of conversation
   * @param _invokeValue - The search invoke value
   * @returns A promise that resolves to a search invoke response
   * @protected
   */
  protected async onSearchInvoke (_context: TurnContext, _invokeValue: SearchInvokeValue): Promise<SearchInvokeResponse> {
    return await Promise.reject(new InvokeException(StatusCodes.NOT_IMPLEMENTED))
  }

  /**
   * Retrieves the SearchInvoke value from the activity.
   * This method extracts and validates the search invoke value from an activity.
   * @param activity - The activity to extract the search invoke value from
   * @returns The validated search invoke value
   * @private
   */
  private getSearchInvokeValue (activity: Activity): SearchInvokeValue {
    const value = activity.value as SearchInvokeValue
    if (!value) {
      const response = this.createAdaptiveCardInvokeErrorResponse(
        StatusCodes.BAD_REQUEST,
        'BadRequest',
        'Missing value property for search'
      )
      throw new InvokeException(StatusCodes.BAD_REQUEST, response)
    }
    if (!value.kind) {
      if (activity.channelId === Channels.Msteams) {
        value.kind = 'search'
      } else {
        const response = this.createAdaptiveCardInvokeErrorResponse(
          StatusCodes.BAD_REQUEST,
          'BadRequest',
          'Missing kind property for search.'
        )
        throw new InvokeException(StatusCodes.BAD_REQUEST, response)
      }
    }
    if (!value.queryText) {
      const response = this.createAdaptiveCardInvokeErrorResponse(
        StatusCodes.BAD_REQUEST,
        'BadRequest',
        'Missing queryText for search.'
      )
      throw new InvokeException(StatusCodes.BAD_REQUEST, response)
    }
    return value
  }

  /**
   * Retrieves the AdaptiveCardInvoke value from the activity.
   * This method extracts and validates the adaptive card invoke value from an activity.
   * @param activity - The activity to extract the adaptive card invoke value from
   * @returns The validated adaptive card invoke value
   * @private
   */
  private getAdaptiveCardInvokeValue (activity: Activity): AdaptiveCardInvokeValue {
    const value = activity.value as AdaptiveCardInvokeValue
    if (!value) {
      const response = this.createAdaptiveCardInvokeErrorResponse(
        StatusCodes.BAD_REQUEST,
        'BadRequest',
        'Missing value property'
      )
      throw new InvokeException(StatusCodes.BAD_REQUEST, response)
    }
    if (value.action.type !== 'Action.Execute') {
      const response = this.createAdaptiveCardInvokeErrorResponse(
        StatusCodes.BAD_REQUEST,
        'NotSupported',
        `The action '${value.action.type}' is not supported.`
      )
      throw new InvokeException(StatusCodes.BAD_REQUEST, response)
    }
    const { action, authentication, state } = value
    const { data, id: actionId, type, verb } = action ?? {}
    const { connectionName, id: authenticationId, token } = authentication ?? {}
    return {
      action: {
        data,
        id: actionId,
        type,
        verb
      },
      authentication: {
        connectionName,
        id: authenticationId,
        token
      },
      state
    }
  }

  /**
   * Creates an error response for AdaptiveCardInvoke.
   * This method creates an error response for adaptive card invoke activities.
   * @param statusCode - The HTTP status code for the response
   * @param code - The error code
   * @param message - The error message
   * @returns An adaptive card invoke error response
   * @private
   */
  private createAdaptiveCardInvokeErrorResponse (
    statusCode: StatusCodes,
    code: string,
    message: string
  ): AdaptiveCardInvokeResponse {
    return {
      statusCode,
      type: 'application/vnd.microsoft.error',
      value: { code, message }
    }
  }

  /**
   * Handles the MessageReaction activity.
   * This method processes message reaction activities.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async onMessageReactionActivity (context: TurnContext): Promise<void> {
    await this.handle(context, 'MessageReaction', async () => {
      await this.dispatchMessageReactionActivity(context)
    })
  }

  /**
   * Handles the EndOfConversation activity.
   * This method processes end of conversation activities.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async onEndOfConversationActivity (context: TurnContext): Promise<void> {
    await this.handle(context, 'EndOfConversation', this.defaultNextEvent(context))
  }

  /**
   * Handles the Typing activity.
   * This method processes typing indicator activities.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async onTypingActivity (context: TurnContext): Promise<void> {
    await this.handle(context, 'Typing', this.defaultNextEvent(context))
  }

  /**
   * Handles the InstallationUpdate activity.
   * This method processes installation update activities.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async onInstallationUpdateActivity (context: TurnContext): Promise<void> {
    switch (context.activity.action) {
      case 'add':
      case 'add-upgrade':
        await this.handle(context, 'InstallationUpdateAdd', this.defaultNextEvent(context))
        return
      case 'remove':
      case 'remove-upgrade':
        await this.handle(context, 'InstallationUpdateRemove', this.defaultNextEvent(context))
    }
  }

  /**
   * Handles unrecognized activity types.
   * This method processes activities with unrecognized types.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async onUnrecognizedActivity (context: TurnContext): Promise<void> {
    await this.handle(context, 'UnrecognizedActivityType', this.defaultNextEvent(context))
  }

  /**
   * Dispatches the ConversationUpdate activity.
   * This method dispatches conversation update activities to the appropriate handlers.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async dispatchConversationUpdateActivity (context: TurnContext): Promise<void> {
    if ((context.activity.membersAdded != null) && context.activity.membersAdded.length > 0) {
      await this.handle(context, 'MembersAdded', this.defaultNextEvent(context))
    } else if ((context.activity.membersRemoved != null) && context.activity.membersRemoved.length > 0) {
      await this.handle(context, 'MembersRemoved', this.defaultNextEvent(context))
    } else {
      await this.defaultNextEvent(context)()
    }
  }

  /**
   * Dispatches the MessageReaction activity.
   * This method dispatches message reaction activities to the appropriate handlers.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async dispatchMessageReactionActivity (context: TurnContext): Promise<void> {
    if ((context.activity.reactionsAdded != null) || (context.activity.reactionsRemoved != null)) {
      if (context.activity.reactionsAdded?.length) {
        await this.handle(context, 'ReactionsAdded', this.defaultNextEvent(context))
      }
      if (context.activity.reactionsRemoved?.length) {
        await this.handle(context, 'ReactionsRemoved', this.defaultNextEvent(context))
      }
    } else {
      await this.defaultNextEvent(context)()
    }
  }

  /**
   * Dispatches the MessageUpdate activity.
   * This method dispatches message update activities to the appropriate handlers.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async dispatchMessageUpdateActivity (context: TurnContext): Promise<void> {
    await this.defaultNextEvent(context)()
  }

  /**
   * Dispatches the MessageDelete activity.
   * This method dispatches message delete activities to the appropriate handlers.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async dispatchMessageDeleteActivity (context: TurnContext): Promise<void> {
    await this.defaultNextEvent(context)()
  }

  /**
   * Returns the default next event handler.
   * This method creates a function that calls the default handler.
   * @param context - The turn context for the current turn of conversation
   * @returns A function that calls the default handler
   * @protected
   */
  protected defaultNextEvent (context: TurnContext): () => Promise<void> {
    const defaultHandler = async (): Promise<void> => {
      await this.handle(context, 'Default', async () => {
        // noop
      })
    }
    return defaultHandler
  }

  /**
   * Registers a handler for a specific activity type.
   * This method adds a handler to the list of handlers for a specific activity type.
   * @param type - The activity type to register the handler for
   * @param handler - The handler to register
   * @returns The current instance for method chaining
   * @protected
   */
  protected on (type: string, handler: AgentHandler) {
    if (!this.handlers[type]) {
      this.handlers[type] = [handler]
    } else {
      this.handlers[type].push(handler)
    }
    return this
  }

  /**
   * Executes the handlers for a specific activity type.
   * This method calls each registered handler for the specified activity type.
   * @param context - The turn context for the current turn of conversation
   * @param type - The activity type to handle
   * @param onNext - The function to call when all handlers have been executed
   * @returns The value returned by the last handler
   * @protected
   */
  protected async handle (context: TurnContext, type: string, onNext: () => Promise<void>): Promise<any> {
    let returnValue: any = null
    async function runHandler (index: number): Promise<void> {
      if (index < handlers.length) {
        const val = await handlers[index](context, async () => await runHandler(index + 1))
        if (typeof val !== 'undefined' && returnValue === null) {
          returnValue = val
        }
      } else {
        const val = await onNext()
        if (typeof val !== 'undefined') {
          returnValue = val
        }
      }
    }
    logger.info(`${type} handler called`)
    const handlers = this.handlers[type] || []
    await runHandler(0)
    return returnValue
  }

  /**
   * Creates an InvokeResponse object.
   * This static method creates an invoke response with the specified body.
   * @param body - The body of the response
   * @returns An invoke response object with status and body
   * @protected
   */
  protected static createInvokeResponse (body?: any): InvokeResponse {
    return { status: 200, body }
  }

  /**
   * Dispatches the Event activity.
   * This method dispatches event activities to the appropriate handlers.
   * @param context - The turn context for the current turn of conversation
   * @protected
   */
  protected async dispatchEventActivity (context: TurnContext): Promise<void> {
    if (context.activity.name === tokenResponseEventName) {
      await this.handle(context, 'TokenResponseEvent', this.defaultNextEvent(context))
    } else {
      await this.defaultNextEvent(context)()
    }
  }
}
