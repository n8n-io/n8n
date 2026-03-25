/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AgentHandler, INVOKE_RESPONSE_KEY } from './activityHandler'
import { BaseAdapter } from './baseAdapter'
import { TurnContext } from './turnContext'
import { Response } from 'express'
import { Request } from './auth/request'
import { ConnectorClient } from './connector-client/connectorClient'
import { AuthConfiguration, getAuthConfigWithDefaults } from './auth/authConfiguration'
import { AuthProvider } from './auth/authProvider'
import { ApxProductionScope } from './auth/authConstants'
import { MsalConnectionManager } from './auth/msalConnectionManager'
import { Activity, ActivityEventNames, ActivityTypes, Channels, ConversationReference, DeliveryModes, ConversationParameters, RoleTypes, ExceptionHelper } from '@microsoft/agents-activity'
import { Errors } from './errorHelper'
import { ResourceResponse } from './connector-client/resourceResponse'
import * as uuid from 'uuid'
import { debug } from '@microsoft/agents-activity/logger'
import { StatusCodes } from './statusCodes'
import { InvokeResponse } from './invoke/invokeResponse'
import { AttachmentData } from './connector-client/attachmentData'
import { AttachmentInfo } from './connector-client/attachmentInfo'
import { normalizeIncomingActivity } from './activityWireCompat'
import { UserTokenClient } from './oauth'
import { HeaderPropagation, HeaderPropagationCollection, HeaderPropagationDefinition } from './headerPropagation'
import { JwtPayload } from 'jsonwebtoken'
import { getTokenServiceEndpoint } from './oauth/customUserTokenAPI'
import { Connections } from './auth/connections'
const logger = debug('agents:cloud-adapter')

/**
 * Adapter for handling agent interactions with various channels through cloud-based services.
 *
 * @remarks
 * CloudAdapter processes incoming HTTP requests from Azure Bot Service channels,
 * authenticates them, and generates outgoing responses. It manages the communication
 * flow between agents and users across different channels, handling activities, attachments,
 * and conversation continuations.
 */
export class CloudAdapter extends BaseAdapter {
  /**
   * Client for connecting to the Azure Bot Service
   */
  connectionManager: Connections

  /**
   * Creates an instance of CloudAdapter.
   * @param authConfig - The authentication configuration for securing communications.
   * @param authProvider - No longer used.
   * @param userTokenClient - No longer used.
   */
  constructor (authConfig?: AuthConfiguration, authProvider?: AuthProvider, userTokenClient?: UserTokenClient) {
    super()
    authConfig = getAuthConfigWithDefaults(authConfig)
    this.connectionManager = new MsalConnectionManager(undefined, undefined, authConfig)
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
  protected resolveIfConnectorClientIsNeeded (activity: Activity): boolean {
    if (!activity) {
      throw new TypeError('`activity` parameter required')
    }

    switch (activity.deliveryMode) {
      case DeliveryModes.ExpectReplies:
        if (!activity.serviceUrl) {
          logger.debug('DeliveryMode = ExpectReplies, connector client is not needed')
          return false
        }
        break
      default:
        break
    }
    return true
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
  protected async createConnectorClient (
    serviceUrl: string,
    scope: string,
    identity: JwtPayload,
    headers?: HeaderPropagationCollection
  ): Promise<ConnectorClient> {
    // get the correct token provider
    const tokenProvider = this.connectionManager.getTokenProvider(identity, serviceUrl)

    const token = await tokenProvider.getAccessToken(scope)
    return ConnectorClient.createClientWithToken(
      serviceUrl,
      token,
      headers
    )
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
  protected async createConnectorClientWithIdentity (
    identity: JwtPayload,
    activity: Activity,
    headers?: HeaderPropagationCollection) {
    if (!identity?.aud) {
      // anonymous
      return ConnectorClient.createClientWithToken(
        activity.serviceUrl!,
        null!,
        headers
      )
    }

    let connectorClient
    const tokenProvider = this.connectionManager.getTokenProviderFromActivity(identity, activity)
    if (activity.isAgenticRequest()) {
      logger.debug('Activity is from an agentic source, using special scope', activity.recipient)
      const agenticInstanceId = activity.getAgenticInstanceId()
      const agenticUserId = activity.getAgenticUser()

      if (activity.recipient?.role?.toLowerCase() === RoleTypes.AgenticIdentity.toLowerCase() && agenticInstanceId) {
        // get agentic instance token
        const token = await tokenProvider.getAgenticInstanceToken(activity.getAgenticTenantId() ?? '', agenticInstanceId)
        connectorClient = ConnectorClient.createClientWithToken(
          activity.serviceUrl!,
          token,
          headers
        )
      } else if (activity.recipient?.role?.toLowerCase() === RoleTypes.AgenticUser.toLowerCase() && agenticInstanceId && agenticUserId) {
        const scope = tokenProvider.connectionSettings?.scope ?? ApxProductionScope
        const token = await tokenProvider.getAgenticUserToken(activity.getAgenticTenantId() ?? '', agenticInstanceId, agenticUserId, [scope])

        connectorClient = ConnectorClient.createClientWithToken(
          activity.serviceUrl!,
          token,
          headers
        )
      } else {
        throw new Error('Could not create connector client for agentic user')
      }
    } else {
      // ABS tokens will not have an azp/appid so use the botframework scope.
      // Otherwise use the appId.  This will happen when communicating back to another agent.
      const scope = identity.azp ?? identity.appid ?? 'https://api.botframework.com'
      const token = await tokenProvider.getAccessToken(scope)
      connectorClient = ConnectorClient.createClientWithToken(
        activity.serviceUrl!,
        token,
        headers
      )
    }
    return connectorClient
  }

  /**
   * Creates the JwtPayload object with the provided appId.
   * @param appId The bot's appId.
   * @returns The JwtPayload object containing the appId as aud.
   */
  static createIdentity (appId: string) : JwtPayload {
    return {
      aud: appId
    } as JwtPayload
  }

  /**
   * Sets the connector client on the turn context.
   *
   * @param context - The current turn context.
   * @protected
   */
  protected setConnectorClient (
    context: TurnContext,
    connectorClient?: ConnectorClient
  ) {
    context.turnState.set(this.ConnectorClientKey, connectorClient)
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
  protected async createUserTokenClient (
    identity: JwtPayload,
    tokenServiceEndpoint: string = getTokenServiceEndpoint(),
    scope: string = 'https://api.botframework.com',
    audience: string = 'https://api.botframework.com',
    headers?: HeaderPropagationCollection
  ): Promise<UserTokenClient> {
    if (!identity?.aud) {
      // anonymous
      return UserTokenClient.createClientWithScope(
        tokenServiceEndpoint,
        null!,
        scope,
        headers
      )
    }

    // get the correct token provider
    const tokenProvider = this.connectionManager.getTokenProvider(identity, tokenServiceEndpoint)

    return UserTokenClient.createClientWithScope(
      tokenServiceEndpoint,
      tokenProvider,
      scope,
      headers
    )
  }

  /**
   * Sets the user token client on the turn context.
   *
   * @param context - The current turn context.
   * @protected
   */
  protected setUserTokenClient (
    context: TurnContext,
    userTokenClient?: UserTokenClient
  ) {
    context.turnState.set(this.UserTokenClientKey, userTokenClient)
  }

  /**
   * @deprecated This function will not be supported in future versions.  Create TurnContext directly.
   * Creates a TurnContext for the given activity and logic.
   * @param activity - The activity to process.
   * @param logic - The logic to execute.
   * @param identity - The identity used for the new context.
   * @returns The created TurnContext.
   */
  createTurnContext (activity: Activity, logic: AgentHandler, identity?: JwtPayload): TurnContext {
    return new TurnContext(this, activity, identity)
  }

  /**
   * Sends multiple activities to the conversation.
   * @param context - The TurnContext for the current turn.
   * @param activities - The activities to send.
   * @returns A promise representing the array of ResourceResponses for the sent activities.
   */
  async sendActivities (context: TurnContext, activities: Activity[]): Promise<ResourceResponse[]> {
    if (!context) {
      throw ExceptionHelper.generateException(TypeError, Errors.ContextParameterRequired)
    }

    if (!activities) {
      throw ExceptionHelper.generateException(TypeError, Errors.ActivitiesParameterRequired)
    }

    if (activities.length === 0) {
      throw ExceptionHelper.generateException(Error, Errors.EmptyActivitiesArray)
    }

    const responses: ResourceResponse[] = []
    for (const activity of activities) {
      delete activity.id
      let response: ResourceResponse = { id: '' }

      if (activity.type === ActivityTypes.InvokeResponse) {
        context.turnState.set(INVOKE_RESPONSE_KEY, activity)
      } else if (activity.type === ActivityTypes.Trace && activity.channelId !== Channels.Emulator) {
        // no-op
      } else {
        if (!activity.serviceUrl || (activity.conversation == null) || !activity.conversation.id) {
          throw ExceptionHelper.generateException(Error, Errors.InvalidActivityObject)
        }

        if (activity.replyToId) {
          response = await context.turnState.get(this.ConnectorClientKey).replyToActivity(activity.conversation.id, activity.replyToId, activity)
        } else {
          response = await context.turnState.get(this.ConnectorClientKey).sendToConversation(activity.conversation.id, activity)
        }
      }

      if (!response) {
        response = { id: activity.id ?? '' }
      }

      responses.push(response)
    }

    return responses
  }

  /**
   * Processes an incoming request and sends the response.
   * @param request - The incoming request.
   * @param res - The response to send.
   * @param logic - The logic to execute.
   * @param headerPropagation - Optional function to handle header propagation.
   */
  public async process (
    request: Request,
    res: Response,
    logic: (context: TurnContext) => Promise<void>,
    headerPropagation?: HeaderPropagationDefinition): Promise<void> {
    const headers = new HeaderPropagation(request.headers)
    if (headerPropagation && typeof headerPropagation === 'function') {
      headerPropagation(headers)
      logger.debug('Headers to propagate: ', headers)
    }

    const end = (status: StatusCodes, body?: unknown, isInvokeResponseOrExpectReplies: boolean = false) => {
      res.status(status)
      if (isInvokeResponseOrExpectReplies) {
        res.setHeader('content-type', 'application/json')
      }
      if (body) {
        res.send(body)
      }
      res.end()
    }
    if (!request.body) {
      throw new TypeError('`request.body` parameter required, make sure express.json() is used as middleware')
    }
    const incoming = normalizeIncomingActivity(request.body!)
    const activity = Activity.fromObject(incoming)
    logger.info(`--> Processing incoming activity, type:${activity.type} channel:${activity.channelId}`)

    if (!this.isValidChannelActivity(activity)) {
      return end(StatusCodes.BAD_REQUEST)
    }

    logger.debug('Received activity: ', activity)

    const context = new TurnContext(this, activity, request.user!)
    // if Delivery Mode == ExpectReplies, we don't need a connector client.
    if (this.resolveIfConnectorClientIsNeeded(activity)) {
      const connectorClient = await this.createConnectorClientWithIdentity(request.user!, activity, headers)
      this.setConnectorClient(context, connectorClient)
    }

    if (!activity.isAgenticRequest()) {
      const userTokenClient = await this.createUserTokenClient(request.user!)
      this.setUserTokenClient(context, userTokenClient)
    }

    if (
      activity?.type === ActivityTypes.InvokeResponse ||
      activity?.type === ActivityTypes.Invoke ||
      activity?.deliveryMode === DeliveryModes.ExpectReplies
    ) {
      await this.runMiddleware(context, logic)
      const invokeResponse = this.processTurnResults(context)
      logger.debug('Activity Response (invoke/expect replies): ', invokeResponse)
      return end(invokeResponse?.status ?? StatusCodes.OK, invokeResponse?.body, true)
    }

    await this.runMiddleware(context, logic)
    const invokeResponse = this.processTurnResults(context)
    return end(invokeResponse?.status ?? StatusCodes.OK, invokeResponse?.body)
  }

  private isValidChannelActivity (activity: Activity): Boolean {
    if (activity == null) {
      logger.warn('BadRequest: Missing activity')
      return false
    }

    if (activity.type == null || activity.type === '') {
      logger.warn('BadRequest: Missing activity type')
      return false
    }

    if (activity.conversation?.id == null || activity.conversation?.id === '') {
      logger.warn('BadRequest: Missing conversation.Id')
      return false
    }

    return true
  }

  /**
   * Updates an activity.
   * @param context - The TurnContext for the current turn.
   * @param activity - The activity to update.
   * @returns A promise representing the ResourceResponse for the updated activity.
   */
  async updateActivity (context: TurnContext, activity: Activity): Promise<ResourceResponse | void> {
    if (!context) {
      throw new TypeError('`context` parameter required')
    }

    if (!activity) {
      throw new TypeError('`activity` parameter required')
    }

    if (!activity.serviceUrl || (activity.conversation == null) || !activity.conversation.id || !activity.id) {
      throw ExceptionHelper.generateException(Error, Errors.InvalidActivityObject)
    }

    const response = await context.turnState.get(this.ConnectorClientKey).updateActivity(
      activity.conversation.id,
      activity.id,
      activity
    )

    return response.id ? { id: response.id } : undefined
  }

  /**
   * Deletes an activity.
   * @param context - The TurnContext for the current turn.
   * @param reference - The conversation reference of the activity to delete.
   * @returns A promise representing the completion of the delete operation.
   */
  async deleteActivity (context: TurnContext, reference: Partial<ConversationReference>): Promise<void> {
    if (!context) {
      throw new TypeError('`context` parameter required')
    }

    if (!reference || !reference.serviceUrl || (reference.conversation == null) || !reference.conversation.id || !reference.activityId) {
      throw ExceptionHelper.generateException(Error, Errors.InvalidConversationReference)
    }

    await context.turnState.get(this.ConnectorClientKey).deleteActivity(reference.conversation.id, reference.activityId)
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
  async continueConversation (
    botAppIdOrIdentity: string | JwtPayload,
    reference: ConversationReference,
    logic: (revocableContext: TurnContext) => Promise<void>,
    isResponse: Boolean = false): Promise<void> {
    if (!reference || !reference.serviceUrl || (reference.conversation == null) || !reference.conversation.id) {
      throw ExceptionHelper.generateException(Error, Errors.ContinueConversationInvalidReference)
    }

    if (!botAppIdOrIdentity) {
      throw new TypeError('continueConversation: botAppIdOrIdentity is required')
    }
    const botAppId = typeof botAppIdOrIdentity === 'string' ? botAppIdOrIdentity : botAppIdOrIdentity.aud as string

    // Only having the botId will only work against ABS or Agentic.  Proactive to other agents will
    // not work with just botId.  Use a JwtPayload with property aud (which is botId) and appid populated.
    const identity =
        typeof botAppIdOrIdentity !== 'string'
          ? botAppIdOrIdentity
          : CloudAdapter.createIdentity(botAppId)

    const context = new TurnContext(this, Activity.getContinuationActivity(reference), identity)
    const connectorClient = await this.createConnectorClientWithIdentity(identity, context.activity)
    this.setConnectorClient(context, connectorClient)

    if (!context.activity.isAgenticRequest()) {
      const userTokenClient = await this.createUserTokenClient(identity)
      this.setUserTokenClient(context, userTokenClient)
    }

    await this.runMiddleware(context, logic)
  }

  /**
  * Processes the turn results and returns an InvokeResponse if applicable.
  * @param context - The TurnContext for the current turn.
  * @returns The InvokeResponse if applicable, otherwise undefined.
  */
  protected processTurnResults (context: TurnContext): InvokeResponse | undefined {
    logger.info('<--Sending back turn results')
    // Handle ExpectedReplies scenarios where all activities have been buffered and sent back at once in an invoke response.
    if (context.activity.deliveryMode === DeliveryModes.ExpectReplies) {
      return {
        status: StatusCodes.OK,
        body: {
          activities: context.bufferedReplyActivities
        }
      }
    }

    // Handle Invoke scenarios where the agent will return a specific body and return code.
    if (context.activity.type === ActivityTypes.Invoke) {
      const activityInvokeResponse = context.turnState.get<Activity>(INVOKE_RESPONSE_KEY)
      if (!activityInvokeResponse) {
        return { status: StatusCodes.NOT_IMPLEMENTED }
      }

      return activityInvokeResponse.value as InvokeResponse
    }

    // No body to return.
    return undefined
  }

  /**
   * Creates an activity to represent the result of creating a conversation.
   * @param createdConversationId - The ID of the created conversation.
   * @param channelId - The channel ID.
   * @param serviceUrl - The service URL.
   * @param conversationParameters - The conversation parameters.
   * @returns The created activity.
   */
  protected createCreateActivity (
    createdConversationId: string | undefined,
    channelId: string,
    serviceUrl: string,
    conversationParameters: ConversationParameters
  ): Activity {
    // Create a conversation update activity to represent the result.
    const activity = new Activity(ActivityTypes.Event)

    activity.name = ActivityEventNames.CreateConversation
    activity.channelId = channelId
    activity.serviceUrl = serviceUrl
    activity.id = createdConversationId ?? uuid.v4()
    activity.conversation = {
      conversationType: undefined,
      id: createdConversationId!,
      isGroup: conversationParameters.isGroup,
      name: undefined,
      tenantId: conversationParameters.tenantId,
    }
    activity.channelData = conversationParameters.channelData
    activity.recipient = conversationParameters.agent

    return activity
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
  async createConversationAsync (
    agentAppId: string,
    channelId: string,
    serviceUrl: string,
    audience: string,
    conversationParameters: ConversationParameters,
    logic: (context: TurnContext) => Promise<void>
  ): Promise<void> {
    if (typeof serviceUrl !== 'string' || !serviceUrl) {
      throw new TypeError('`serviceUrl` must be a non-empty string')
    }
    if (!conversationParameters) throw new TypeError('`conversationParameters` must be defined')
    if (!logic) throw new TypeError('`logic` must be defined')

    const identity = CloudAdapter.createIdentity(audience)
    const restClient = await this.createConnectorClient(serviceUrl, audience, identity)
    const userTokenClient = await this.createUserTokenClient(identity)
    const createConversationResult = await restClient.createConversation(conversationParameters)
    const createActivity = this.createCreateActivity(
      createConversationResult.id,
      channelId,
      serviceUrl,
      conversationParameters
    )
    const context = new TurnContext(this, createActivity, CloudAdapter.createIdentity(agentAppId))
    this.setConnectorClient(context, restClient)
    this.setUserTokenClient(context, userTokenClient)
    await this.runMiddleware(context, logic)
  }

  /**
   * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
   * Uploads an attachment.
   * @param context - The context for the turn.
   * @param conversationId - The conversation ID.
   * @param attachmentData - The attachment data.
   * @returns A promise representing the ResourceResponse for the uploaded attachment.
   */
  async uploadAttachment (context: TurnContext, conversationId: string, attachmentData: AttachmentData): Promise<ResourceResponse> {
    if (context === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.ContextRequired)
    }

    if (conversationId === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.ConversationIdRequired)
    }

    if (attachmentData === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.AttachmentDataRequired)
    }

    return await context.turnState.get<ConnectorClient>(this.ConnectorClientKey).uploadAttachment(conversationId, attachmentData)
  }

  /**
   * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
   * Gets attachment information.
   * @param context - The context for the turn.
   * @param attachmentId - The attachment ID.
   * @returns A promise representing the AttachmentInfo for the requested attachment.
   */
  async getAttachmentInfo (context: TurnContext, attachmentId: string): Promise<AttachmentInfo> {
    if (context === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.ContextRequired)
    }

    if (attachmentId === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.AttachmentIdRequired)
    }

    return await context.turnState.get<ConnectorClient>(this.ConnectorClientKey).getAttachmentInfo(attachmentId)
  }

  /**
   * @deprecated This function will not be supported in future versions.  Use TurnContext.turnState.get<ConnectorClient>(CloudAdapter.ConnectorClientKey).
   * Gets an attachment.
   * @param context - The context for the turn.
   * @param attachmentId - The attachment ID.
   * @param viewId - The view ID.
   * @returns A promise representing the NodeJS.ReadableStream for the requested attachment.
   */
  async getAttachment (context: TurnContext, attachmentId: string, viewId: string): Promise<NodeJS.ReadableStream> {
    if (context === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.ContextRequired)
    }

    if (attachmentId === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.AttachmentIdRequired)
    }

    if (viewId === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.ViewIdRequired)
    }

    return await context.turnState.get<ConnectorClient>(this.ConnectorClientKey).getAttachment(attachmentId, viewId)
  }
}
