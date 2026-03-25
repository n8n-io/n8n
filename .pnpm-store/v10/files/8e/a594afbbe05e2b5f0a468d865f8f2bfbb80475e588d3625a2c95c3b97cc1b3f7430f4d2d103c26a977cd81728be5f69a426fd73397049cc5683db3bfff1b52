// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import axios, { AxiosInstance } from 'axios'
import { Activity, ConversationReference } from '@microsoft/agents-activity'
import { debug } from '@microsoft/agents-activity/logger'
import { normalizeTokenExchangeState } from '../activityWireCompat'
import { AadResourceUrls, SignInResource, TokenExchangeRequest, TokenOrSinginResourceResponse, TokenResponse, TokenStatus } from './userTokenClient.types'
import { getProductInfo } from '../getProductInfo'
import { AuthProvider } from '../auth'
import { HeaderPropagationCollection } from '../headerPropagation'
import { getTokenServiceEndpoint } from './customUserTokenAPI'

const logger = debug('agents:user-token-client')

/**
 * Client for managing user tokens.
 */
export class UserTokenClient {
  client: AxiosInstance
  private msAppId: string = ''
  /**
   * Creates a new instance of UserTokenClient.
   * @param msAppId The Microsoft application ID.
   */
  constructor (msAppId: string)
  /**
   * Creates a new instance of UserTokenClient.
   * @param axiosInstance The axios instance.
   */
  constructor (axiosInstance: AxiosInstance)

  constructor (param: string | AxiosInstance) {
    if (typeof param === 'string') {
      const baseURL = getTokenServiceEndpoint()
      this.client = axios.create({
        baseURL,
        headers: {
          Accept: 'application/json',
          'User-Agent': getProductInfo(),
        }
      })
    } else {
      this.client = param
    }

    this.client.interceptors.request.use((config) => {
      const { method, url, data, headers, params } = config
      const { Authorization, authorization, ...headersToLog } = headers || {}
      logger.debug('Request: ', {
        host: this.client.getUri(),
        url,
        data,
        method,
        params,
        headers: headersToLog
      })
      return config
    })

    this.client.interceptors.response.use(
      (config) => {
        const { status, statusText, config: requestConfig, headers } = config
        const { Authorization, authorization, ...headersToLog } = headers || {}
        const { token, ...redactedData } = requestConfig?.data || {}
        logger.debug('Response: ', {
          status,
          statusText,
          host: this.client.getUri(),
          url: requestConfig?.url,
          data: redactedData,
          method: requestConfig?.method,
          headers: headersToLog
        })
        return config
      },
      (error) => {
        const { code, status, message, stack, response } = error
        const { headers } = response || {}
        const errorDetails = {
          code,
          host: this.client.getUri(),
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
          message: message + JSON.stringify(response?.data),
          headers,
          stack,
        }
        logger.debug('Response error: ', errorDetails)
        if (errorDetails.url === '/api/usertoken/GetToken' && status !== 404) {
          return Promise.reject(errorDetails)
        }
      })
  }

  /**
   * Creates a new instance of UserTokenClient with authentication.
   * @param baseURL - The base URL for the API.
   * @param authConfig - The authentication configuration.
   * @param authProvider - The authentication provider.
   * @param scope - The scope for the authentication token.
   * @param headers - Optional headers to propagate in the request.
   * @returns A new instance of ConnectorClient.
   */
  static async createClientWithScope (
    baseURL: string,
    authProvider: AuthProvider,
    scope: string,
    headers?: HeaderPropagationCollection
  ): Promise<UserTokenClient> {
    // TODO: add header propagation logic
    const axiosInstance = axios.create({
      baseURL,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json', // Required by transformRequest
        'User-Agent': getProductInfo(),
      },
    })
    if (authProvider) {
      const token = await authProvider.getAccessToken(scope)
      if (token.length > 1) {
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`
      }
    }
    return new UserTokenClient(axiosInstance)
  }

  /**
   * Gets the user token.
   * @param connectionName The connection name.
   * @param channelIdComposite The channel ID.
   * @param userId The user ID.
   * @param code The optional code.
   * @returns A promise that resolves to the user token.
   */
  async getUserToken (connectionName: string, channelIdComposite: string, userId: string, code?: string) : Promise<TokenResponse> {
    const [channelId] = Activity.parseChannelId(channelIdComposite)
    const params = { connectionName, channelId, userId, code }
    const response = await this.client.get('/api/usertoken/GetToken', { params })
    if (response?.data) {
      return response.data as TokenResponse
    }
    return { token: undefined }
  }

  /**
   * Signs the user out.
   * @param userId The user ID.
   * @param connectionName The connection name.
   * @param channelIdComposite The channel ID.
   * @returns A promise that resolves when the sign-out operation is complete.
   */
  async signOut (userId: string, connectionName: string, channelIdComposite: string) : Promise<void> {
    const [channelId] = Activity.parseChannelId(channelIdComposite)
    const params = { userId, connectionName, channelId }
    const response = await this.client.delete('/api/usertoken/SignOut', { params })
    if (response.status !== 200) {
      throw new Error('Failed to sign out')
    }
  }

  /**
   * Gets the sign-in resource.
   * @param msAppId The application ID.
   * @param connectionName The connection name.
   * @param conversation The conversation reference.
   * @param relatesTo Optional. The related conversation reference.
   * @returns A promise that resolves to the signing resource.
   */
  async getSignInResource (msAppId: string, connectionName: string, conversation: ConversationReference, relatesTo?: ConversationReference) : Promise<SignInResource> {
    const tokenExchangeState = {
      connectionName,
      conversation,
      relatesTo,
      msAppId
    }
    const tokenExchangeStateNormalized = normalizeTokenExchangeState(tokenExchangeState)
    const state = Buffer.from(JSON.stringify(tokenExchangeStateNormalized)).toString('base64')
    const params = { state }
    const response = await this.client.get('/api/botsignin/GetSignInResource', { params })
    return response.data as SignInResource
  }

  /**
   * Exchanges the token.
   * @param userId The user ID.
   * @param connectionName The connection name.
   * @param channelIdComposite The channel ID.
   * @param tokenExchangeRequest The token exchange request.
   * @returns A promise that resolves to the exchanged token.
   */
  async exchangeTokenAsync (userId: string, connectionName: string, channelIdComposite: string, tokenExchangeRequest: TokenExchangeRequest) : Promise<TokenResponse> {
    const [channelId] = Activity.parseChannelId(channelIdComposite)
    const params = { userId, connectionName, channelId }
    const response = await this.client.post('/api/usertoken/exchange', tokenExchangeRequest, { params })
    if (response?.data) {
      return response.data as TokenResponse
    } else {
      return { token: undefined }
    }
  }

  /**
   * Gets the token or sign-in resource.
   * @param userId The user ID.
   * @param connectionName The connection name.
   * @param channelIdComposite The channel ID.
   * @param conversation The conversation reference.
   * @param relatesTo The related conversation reference.
   * @param code The code.
   * @param finalRedirect The final redirect URL.
   * @param fwdUrl The forward URL.
   * @returns A promise that resolves to the token or sign-in resource response.
   */
  async getTokenOrSignInResource (userId: string, connectionName: string, channelIdComposite: string, conversation: ConversationReference, relatesTo: ConversationReference, code: string, finalRedirect: string = '', fwdUrl: string = '') : Promise<TokenOrSinginResourceResponse> {
    const [channelId] = Activity.parseChannelId(channelIdComposite)
    const state = Buffer.from(JSON.stringify({ conversation, relatesTo, connectionName, msAppId: this.msAppId })).toString('base64')
    const params = { userId, connectionName, channelId, state, code, finalRedirect, fwdUrl }
    const response = await this.client.get('/api/usertoken/GetTokenOrSignInResource', { params })
    return response.data as TokenOrSinginResourceResponse
  }

  /**
   * Gets the token status.
   * @param userId The user ID.
   * @param channelIdComposite The channel ID.
   * @param include The optional include parameter.
   * @returns A promise that resolves to the token status.
   */
  async getTokenStatus (userId: string, channelIdComposite: string, include: string = null!): Promise<TokenStatus[]> {
    const [channelId] = Activity.parseChannelId(channelIdComposite)
    const params = { userId, channelId, include }
    const response = await this.client.get('/api/usertoken/GetTokenStatus', { params })
    return response.data as TokenStatus[]
  }

  /**
   * Gets the AAD tokens.
   * @param userId The user ID.
   * @param connectionName The connection name.
   * @param channelIdComposite The channel ID.
   * @param resourceUrls The resource URLs.
   * @returns A promise that resolves to the AAD tokens.
   */
  async getAadTokens (userId: string, connectionName: string, channelIdComposite: string, resourceUrls: AadResourceUrls) : Promise<Record<string, TokenResponse>> {
    const [channelId] = Activity.parseChannelId(channelIdComposite)
    const params = { userId, connectionName, channelId }
    const response = await this.client.post('/api/usertoken/GetAadTokens', resourceUrls, { params })
    return response.data as Record<string, TokenResponse>
  }

  public updateAuthToken (token: string): void {
    this.client.defaults.headers.common.Authorization = `Bearer ${token}`
  }
}
