/** * Copyright (c) Microsoft Corporation. All rights reserved. * Licensed under the MIT License. */
import { INVOKE_RESPONSE_KEY } from './activityHandler'
import { BaseAdapter } from './baseAdapter'
import { Activity, ActivityTypes, ConversationReference, DeliveryModes, InputHints } from '@microsoft/agents-activity'
import { ResourceResponse } from './connector-client/resourceResponse'
import { TurnContextStateCollection } from './turnContextStateCollection'
import { AttachmentInfo } from './connector-client/attachmentInfo'
import { AttachmentData } from './connector-client/attachmentData'
import { StreamingResponse } from './app/streaming/streamingResponse'
import { JwtPayload } from 'jsonwebtoken'

/**
 * Defines a handler for processing and sending activities.
 * Used for middleware that needs to intercept or modify activities being sent.
 *
 * @param context The current turn context
 * @param activities The activities being sent
 * @param next Function to call to continue the middleware chain
 */
export type SendActivitiesHandler = (context: TurnContext, activities: Activity[], next: () => Promise<ResourceResponse[]>) => Promise<ResourceResponse[]>

/**
 * Defines a handler for updating an activity.
 * Used for middleware that needs to intercept or modify activity updates.
 *
 * @param context The current turn context
 * @param activity The activity being updated
 * @param next Function to call to continue the middleware chain
 */
export type UpdateActivityHandler = (context: TurnContext, activity: Activity, next: () => Promise<void>) => Promise<void>

/**
 * Defines a handler for deleting an activity.
 * Used for middleware that needs to intercept or handle activity deletions.
 *
 * @param context The current turn context
 * @param reference Reference to the activity being deleted
 * @param next Function to call to continue the middleware chain
 */
export type DeleteActivityHandler = (context: TurnContext, reference: ConversationReference, next: () => Promise<void>) => Promise<void>

/**
 * Key for the agent callback handler in TurnState collection.
 */
export const AgentCallbackHandlerKey = 'agentCallbackHandler'

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
export class TurnContext {
  private readonly _adapter?: BaseAdapter
  private readonly _activity?: Activity
  private readonly _respondedRef: { responded: boolean } = { responded: false }
  private readonly _turnState = new TurnContextStateCollection()
  private readonly _onSendActivities: SendActivitiesHandler[] = []
  private readonly _onUpdateActivity: UpdateActivityHandler[] = []
  private readonly _onDeleteActivity: DeleteActivityHandler[] = []
  private readonly _turn = 'turn'
  private readonly _locale = 'locale'
  private readonly _streamingResponse: StreamingResponse
  private readonly _identity?: JwtPayload

  /**
   * Initializes a new instance of the TurnContext class.
   *
   * @param adapterOrContext The adapter that created this context, or another TurnContext to clone
   * @param request The activity for the turn (required when first parameter is an adapter)
   */
  constructor (adapterOrContext: BaseAdapter, request: Activity, identity?: JwtPayload)
  constructor (adapterOrContext: TurnContext)
  constructor (adapterOrContext: BaseAdapter | TurnContext, request?: Activity, identity?: JwtPayload) {
    if (adapterOrContext instanceof TurnContext) {
      adapterOrContext.copyTo(this)
    } else {
      this._adapter = adapterOrContext
      this._activity = request as Activity
      this._identity = identity as JwtPayload
    }
    this._streamingResponse = new StreamingResponse(this)
  }

  /**
   * A list of reply activities that are buffered until the end of the turn.
   *
   * This is primarily used with the 'expectReplies' delivery mode where all
   * activities during a turn are collected and returned as a single response.
   */
  readonly bufferedReplyActivities: Activity[] = []

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
  async sendTraceActivity (name: string, value?: any, valueType?: string, label?: string): Promise<ResourceResponse | undefined> {
    const traceActivityObj = {
      type: ActivityTypes.Trace,
      timestamp: new Date().toISOString(),
      name,
      value,
      valueType,
      label
    }
    const traceActivity = Activity.fromObject(traceActivityObj)
    return await this.sendActivity(traceActivity)
  }

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
  async sendActivity (activityOrText: string | Activity, speak?: string, inputHint?: string): Promise<ResourceResponse | undefined> {
    let activityObject: {}
    if (typeof activityOrText === 'string') {
      activityObject = { type: ActivityTypes.Message, text: activityOrText, inputHint: inputHint || InputHints.AcceptingInput }
      if (speak) {
        activityObject = { ...activityObject, speak }
      }
    } else {
      activityObject = activityOrText
    }
    const activity = Activity.fromObject(activityObject)

    const responses = (await this.sendActivities([activity])) || []
    return responses[0]
  }

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
  async sendActivities (activities: Activity[]): Promise<ResourceResponse[]> {
    let sentNonTraceActivity = false
    const ref = this.activity.getConversationReference()
    const output = activities.map((activity) => {
      const result = activity.applyConversationReference(ref)
      if (!result.type) {
        result.type = ActivityTypes.Message
      }
      if (result.type === ActivityTypes.InvokeResponse) {
        this.turnState.set(INVOKE_RESPONSE_KEY, activity)
      }
      if (result.type !== ActivityTypes.Trace) {
        sentNonTraceActivity = true
      }
      if (result.id) {
        delete result.id
      }
      return result
    })
    return await this.emit(this._onSendActivities, output, async () => {
      if (this.activity.deliveryMode === DeliveryModes.ExpectReplies) {
        const responses: ResourceResponse[] = []
        output.forEach((a) => {
          this.bufferedReplyActivities.push(a)
          if (a.type === ActivityTypes.InvokeResponse) {
            this.turnState.set(INVOKE_RESPONSE_KEY, a)
          }
          responses.push({ id: '' })
        })
        if (sentNonTraceActivity) {
          this.responded = true
        }
        return responses
      } else {
        const responses = await this.adapter.sendActivities(this, output)
        for (let index = 0; index < responses?.length; index++) {
          const activity = output[index]
          activity.id = responses[index].id
        }
        if (sentNonTraceActivity) {
          this.responded = true
        }
        return responses
      }
    })
  }

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
  async updateActivity (activity: Activity): Promise<void> {
    const ref: ConversationReference = this.activity.getConversationReference()
    const a: Activity = activity.applyConversationReference(ref)
    return await this.emit(this._onUpdateActivity, a, async () =>
      await this.adapter.updateActivity(this, a).then(() => {})
    )
  }

  /**
   * Deletes an activity from the conversation.
   *
   * @param idOrReference The ID of the activity to delete or a conversation reference
   * @returns A promise that resolves when the activity has been deleted
   */
  async deleteActivity (idOrReference: string | ConversationReference): Promise<void> {
    let reference: ConversationReference
    if (typeof idOrReference === 'string') {
      reference = this.activity.getConversationReference()
      reference.activityId = idOrReference
    } else {
      reference = idOrReference
    }
    return await this.emit(this._onDeleteActivity, reference, async () => await this.adapter.deleteActivity(this, reference))
  }

  /**
   * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
   * Uploads an attachment to the conversation.
   *
   * @param conversationId The ID of the conversation
   * @param attachmentData The attachment data to upload
   * @returns A promise that resolves to the resource response
   */
  async uploadAttachment (conversationId: string, attachmentData: AttachmentData): Promise<ResourceResponse> {
    return await this.adapter.uploadAttachment(this, conversationId, attachmentData)
  }

  /**
   * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
   * Gets information about an attachment.
   *
   * @param attachmentId The ID of the attachment
   * @returns A promise that resolves to the attachment information
   */
  async getAttachmentInfo (attachmentId: string): Promise<AttachmentInfo> {
    return await this.adapter.getAttachmentInfo(this, attachmentId)
  }

  /**
   * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
   * Gets the content of an attachment.
   *
   * @param attachmentId The ID of the attachment
   * @param viewId The view to get
   * @returns A promise that resolves to a readable stream of the attachment content
   */
  async getAttachment (attachmentId: string, viewId: string): Promise<NodeJS.ReadableStream> {
    return await this.adapter.getAttachment(this, attachmentId, viewId)
  }

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
  onSendActivities (handler: SendActivitiesHandler): this {
    this._onSendActivities.push(handler)
    return this
  }

  /**
   * Registers a handler for intercepting activity updates.
   *
   * @param handler The handler to register
   * @returns The current TurnContext instance for chaining
   */
  onUpdateActivity (handler: UpdateActivityHandler): this {
    this._onUpdateActivity.push(handler)
    return this
  }

  /**
   * Registers a handler for intercepting activity deletions.
   *
   * @param handler The handler to register
   * @returns The current TurnContext instance for chaining
   */
  onDeleteActivity (handler: DeleteActivityHandler): this {
    this._onDeleteActivity.push(handler)
    return this
  }

  /**
   * Copies the properties of this TurnContext to another TurnContext.
   *
   * Used internally when cloning contexts.
   *
   * @param context The context to copy to
   * @protected
   */
  protected copyTo (context: TurnContext): void {
    ['_adapter', '_activity', '_respondedRef', '_services', '_onSendActivities', '_onUpdateActivity', '_onDeleteActivity'].forEach((prop: string) => ((context as any)[prop] = (this as any)[prop]))
  }

  /**
   * Gets the adapter that created this context.
   *
   * @remarks
   * The adapter is responsible for sending and receiving activities
   * to and from the user's channel.
   */
  get adapter (): BaseAdapter {
    return this._adapter as BaseAdapter
  }

  /**
   * Gets the incoming activity that started this turn.
   *
   * @remarks
   * This is the activity that was received from the user or channel
   * and triggered the creation of this context.
   */
  get activity (): Activity {
    return this._activity as Activity
  }

  get identity (): JwtPayload {
    return this._identity as JwtPayload
  }

  /**
   * Gets or sets whether the turn has sent a response to the user.
   *
   * @remarks
   * This is used to track whether the agent has responded to the user's
   * activity. Once set to true, it cannot be set back to false.
   */
  get responded (): boolean {
    return this._respondedRef.responded
  }

  set responded (value: boolean) {
    if (!value) {
      throw new Error("TurnContext: cannot set 'responded' to a value of 'false'.")
    }
    this._respondedRef.responded = true
  }

  /**
   * Gets or sets the locale for the turn.
   *
   * @remarks
   * The locale affects language-dependent operations like
   * formatting dates or numbers.
   */
  get locale (): string | undefined {
    const turnObj = this._turnState.get(this._turn)
    if (turnObj && typeof turnObj[this._locale] === 'string') {
      return turnObj[this._locale]
    }
    return undefined
  }

  set locale (value: string | undefined) {
    let turnObj = this._turnState.get(this._turn)
    if (turnObj) {
      turnObj[this._locale] = value
    } else {
      turnObj = { [this._locale]: value }
      this._turnState.set(this._turn, turnObj)
    }
  }

  /**
   * Gets the turn state collection for storing data during the turn.
   *
   * @remarks
   * The turn state collection provides a dictionary-like interface
   * for storing arbitrary data that needs to be accessible during
   * the processing of the current turn.
   */
  get turnState (): TurnContextStateCollection {
    return this._turnState
  }

  get streamingResponse (): StreamingResponse {
    return this._streamingResponse
  }

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
  private async emit<A, T>(handlers: Array<(context: TurnContext, arg: A, next: () => Promise<T>) => Promise<T>>, arg: A, next: () => Promise<T>): Promise<T> {
    const runHandlers = async ([handler, ...remaining]: typeof handlers): Promise<T> => {
      try {
        return handler ? await handler(this, arg, async () => await runHandlers(remaining)) : await Promise.resolve(next())
      } catch (err) {
        return await Promise.reject(err)
      }
    }
    return await runHandlers(handlers)
  }
}
