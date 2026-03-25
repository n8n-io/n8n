/** * Copyright (c) Microsoft Corporation. All rights reserved. * Licensed under the MIT License. */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { AuthConfiguration } from '../auth/authConfiguration'
import { AuthProvider } from '../auth/authProvider'
import { debug } from '@microsoft/agents-activity/logger'
import { Activity, ChannelAccount, ConversationParameters, RoleTypes, Channels, ExceptionHelper } from '@microsoft/agents-activity'
import { Errors } from '../errorHelper'
import { ConversationsResult } from './conversationsResult'
import { ConversationResourceResponse } from './conversationResourceResponse'
import { ResourceResponse } from './resourceResponse'
import { AttachmentInfo } from './attachmentInfo'
import { AttachmentData } from './attachmentData'
import { normalizeOutgoingActivity } from '../activityWireCompat'
import { getProductInfo } from '../getProductInfo'
import { HeaderPropagation, HeaderPropagationCollection } from '../headerPropagation'
const logger = debug('agents:connector-client')

export { getProductInfo }

/**
 * ConnectorClient is a client for interacting with the Microsoft Connector API.
 */
export class ConnectorClient {
  protected readonly _axiosInstance: AxiosInstance

  /**
   * Private constructor for the ConnectorClient.
   * @param axInstance - The AxiosInstance to use for HTTP requests.
   */
  protected constructor (axInstance: AxiosInstance) {
    this._axiosInstance = axInstance
    this._axiosInstance.interceptors.request.use((config) => {
      const { method, url, data, headers, params } = config
      // Clone headers and remove Authorization before logging
      const { Authorization, authorization, ...headersToLog } = headers || {}
      logger.debug('Request: ', {
        host: this._axiosInstance.getUri(),
        url,
        data,
        method,
        params,
        headers: headersToLog
      })
      return config
    })
    this._axiosInstance.interceptors.response.use(
      (config) => {
        const { status, statusText, config: requestConfig } = config
        logger.debug('Response: ', {
          status,
          statusText,
          host: this._axiosInstance.getUri(),
          url: requestConfig?.url,
          data: config.config.data,
          method: requestConfig?.method,
        })
        return config
      },
      (error) => {
        const { code, message, stack, response } = error
        const errorDetails = {
          code,
          host: this._axiosInstance.getUri(),
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
          message: message + JSON.stringify(response?.data),
          stack,
        }
        return Promise.reject(errorDetails)
      }
    )
  }

  public get axiosInstance (): AxiosInstance {
    return this._axiosInstance
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
  static async createClientWithAuth (
    baseURL: string,
    authConfig: AuthConfiguration,
    authProvider: AuthProvider,
    scope: string,
    headers?: HeaderPropagationCollection
  ): Promise<ConnectorClient> {
    const token = await authProvider.getAccessToken(authConfig, scope)
    return this.createClientWithToken(baseURL, token, headers)
  }

  /**
   * Creates a new instance of ConnectorClient with token.
   * @param baseURL - The base URL for the API.
   * @param token - The authentication token.
   * @param headers - Optional headers to propagate in the request.
   * @returns A new instance of ConnectorClient.
   */
  static createClientWithToken (
    baseURL: string,
    token: string,
    headers?: HeaderPropagationCollection
  ): ConnectorClient {
    const headerPropagation = headers ?? new HeaderPropagation({ 'User-Agent': '' })
    headerPropagation.concat({ 'User-Agent': getProductInfo() })
    headerPropagation.override({
      Accept: 'application/json',
      'Content-Type': 'application/json', // Required by transformRequest
    })

    const axiosInstance = axios.create({
      baseURL,
      headers: headerPropagation.outgoing,
    })

    if (token && token.length > 1) {
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`
    }

    return new ConnectorClient(axiosInstance)
  }

  /**
   * Retrieves a list of conversations.
   * @param continuationToken - The continuation token for pagination.
   * @returns A list of conversations.
   */
  public async getConversations (continuationToken?: string): Promise<ConversationsResult> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: '/v3/conversations',
      params: continuationToken ? { continuationToken } : undefined
    }
    const response = await this._axiosInstance(config)
    return response.data
  }

  public async getConversationMember (userId: string, conversationId: string): Promise<ChannelAccount> {
    if (!userId || !conversationId) {
      throw ExceptionHelper.generateException(Error, Errors.UserIdAndConversationIdRequired)
    }
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `v3/conversations/${conversationId}/members/${userId}`,
      headers: {
        'Content-Type': 'application/json'
      }
    }
    const response = await this._axiosInstance(config)
    return response.data
  }

  /**
   * Creates a new conversation.
   * @param body - The conversation parameters.
   * @returns The conversation resource response.
   */
  public async createConversation (body: ConversationParameters): Promise<ConversationResourceResponse> {
    const payload = {
      ...body,
      activity: normalizeOutgoingActivity(body.activity)
    }
    const config: AxiosRequestConfig = {
      method: 'post',
      url: '/v3/conversations',
      headers: {
        'Content-Type': 'application/json'
      },
      data: payload
    }
    const response: AxiosResponse = await this._axiosInstance(config)
    return response.data
  }

  /**
   * Replies to an activity in a conversation.
   * @param conversationId - The ID of the conversation.
   * @param activityId - The ID of the activity.
   * @param body - The activity object.
   * @returns The resource response.
   */
  public async replyToActivity (
    conversationId: string,
    activityId: string,
    body: Activity
  ): Promise<ResourceResponse> {
    logger.debug(`Replying to activity: ${activityId} in conversation: ${conversationId}`)
    if (!conversationId || !activityId) {
      throw ExceptionHelper.generateException(Error, Errors.ConversationIdAndActivityIdRequired)
    }

    const trimmedConversationId: string = this.conditionallyTruncateConversationId(conversationId, body)

    const config: AxiosRequestConfig = {
      method: 'post',
      url: `v3/conversations/${trimmedConversationId}/activities/${encodeURIComponent(activityId)}`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: normalizeOutgoingActivity(body)
    }
    const response = await this._axiosInstance(config)
    logger.info('Reply to conversation/activity: ', response.data.id!, activityId)
    return response.data
  }

  /**
   * Trim the conversationId to a fixed length when creating the URL. This is applied only in specific API calls for agentic calls.
   * @param conversationId The ID of the conversation to potentially truncate.
   * @param activity The activity object used to determine if truncation is necessary.
   * @returns The original or truncated conversationId, depending on the channel and activity role.
   */
  private conditionallyTruncateConversationId (conversationId: string, activity: Activity): string {
    if (
      (activity.channelIdChannel === Channels.Msteams || activity.channelIdChannel === Channels.Agents) &&
      (activity.from?.role === RoleTypes.AgenticIdentity || activity.from?.role === RoleTypes.AgenticUser)) {
      let maxLength = 150
      if (process.env.MAX_APX_CONVERSATION_ID_LENGTH && !isNaN(parseInt(process.env.MAX_APX_CONVERSATION_ID_LENGTH, 10))) {
        maxLength = parseInt(process.env.MAX_APX_CONVERSATION_ID_LENGTH, 10)
      }
      return conversationId.length > maxLength ? conversationId.substring(0, maxLength) : conversationId
    } else {
      return conversationId
    }
  }

  /**
   * Sends an activity to a conversation.
   * @param conversationId - The ID of the conversation.
   * @param body - The activity object.
   * @returns The resource response.
   */
  public async sendToConversation (
    conversationId: string,
    body: Activity
  ): Promise<ResourceResponse> {
    logger.debug(`Send to conversation: ${conversationId} activity: ${body.id}`)
    if (!conversationId) {
      throw ExceptionHelper.generateException(Error, Errors.ConversationIdRequired)
    }

    const trimmedConversationId: string = this.conditionallyTruncateConversationId(conversationId, body)

    const config: AxiosRequestConfig = {
      method: 'post',
      url: `v3/conversations/${trimmedConversationId}/activities`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: normalizeOutgoingActivity(body)
    }
    const response = await this._axiosInstance(config)
    return response.data
  }

  /**
   * Updates an activity in a conversation.
   * @param conversationId - The ID of the conversation.
   * @param activityId - The ID of the activity.
   * @param body - The activity object.
   * @returns The resource response.
   */
  public async updateActivity (
    conversationId: string,
    activityId: string,
    body: Activity
  ): Promise<ResourceResponse> {
    if (!conversationId || !activityId) {
      throw ExceptionHelper.generateException(Error, Errors.ConversationIdAndActivityIdRequired)
    }
    const config: AxiosRequestConfig = {
      method: 'put',
      url: `v3/conversations/${conversationId}/activities/${activityId}`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: normalizeOutgoingActivity(body)
    }
    const response = await this._axiosInstance(config)
    return response.data
  }

  /**
   * Deletes an activity from a conversation.
   * @param conversationId - The ID of the conversation.
   * @param activityId - The ID of the activity.
   * @returns A promise that resolves when the activity is deleted.
   */
  public async deleteActivity (
    conversationId: string,
    activityId: string
  ): Promise<void> {
    if (!conversationId || !activityId) {
      throw ExceptionHelper.generateException(Error, Errors.ConversationIdAndActivityIdRequired)
    }
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `v3/conversations/${conversationId}/activities/${activityId}`,
      headers: {
        'Content-Type': 'application/json'
      }
    }
    const response = await this._axiosInstance(config)
    return response.data
  }

  /**
     * Uploads an attachment to a conversation.
     * @param conversationId - The ID of the conversation.
     * @param body - The attachment data.
     * @returns The resource response.
     */
  public async uploadAttachment (
    conversationId: string,
    body: AttachmentData
  ): Promise<ResourceResponse> {
    if (conversationId === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.ConversationIdRequired)
    }
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `v3/conversations/${conversationId}/attachments`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: body
    }
    const response = await this._axiosInstance(config)
    return response.data
  }

  /**
   * Retrieves attachment information by attachment ID.
   * @param attachmentId - The ID of the attachment.
   * @returns The attachment information.
   */
  public async getAttachmentInfo (
    attachmentId: string
  ): Promise<AttachmentInfo> {
    if (attachmentId === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.AttachmentIdRequired)
    }
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `v3/attachments/${attachmentId}`,
      headers: {
        'Content-Type': 'application/json'
      }
    }
    const response = await this._axiosInstance(config)
    return response.data
  }

  /**
   * Retrieves an attachment by attachment ID and view ID.
   * @param attachmentId - The ID of the attachment.
   * @param viewId - The ID of the view.
   * @returns The attachment as a readable stream.
   */
  public async getAttachment (
    attachmentId: string,
    viewId: string
  ): Promise<NodeJS.ReadableStream> {
    if (attachmentId === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.AttachmentIdRequired)
    }
    if (viewId === undefined) {
      throw ExceptionHelper.generateException(Error, Errors.ViewIdRequired)
    }
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `v3/attachments/${attachmentId}/views/${viewId}`,
      headers: {
        'Content-Type': 'application/json'
      }
    }
    const response = await this._axiosInstance(config)
    return response.data
  }
}
