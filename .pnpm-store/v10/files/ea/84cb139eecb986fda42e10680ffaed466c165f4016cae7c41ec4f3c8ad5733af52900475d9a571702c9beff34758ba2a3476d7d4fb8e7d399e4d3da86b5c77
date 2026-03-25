/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { debug } from '@microsoft/agents-activity/logger'
import { AuthorizationHandlerStatus, AuthorizationHandler, ActiveAuthorizationHandler, AuthorizationHandlerSettings, AuthorizationHandlerTokenOptions } from '../types'
import { MessageFactory } from '../../../messageFactory'
import { CardFactory } from '../../../cards'
import { TurnContext } from '../../../turnContext'
import { TokenExchangeRequest, TokenExchangeInvokeResponse, TokenResponse, UserTokenClient } from '../../../oauth'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { HandlerStorage } from '../handlerStorage'
import { Activity, ActivityTypes, Channels } from '@microsoft/agents-activity'
import { InvokeResponse, TokenExchangeInvokeRequest } from '../../../invoke'

const logger = debug('agents:authorization:azurebot')

const DEFAULT_SIGN_IN_ATTEMPTS = 2

enum Category {
  SIGNIN = 'signin',
  UNKNOWN = 'unknown',
}

/**
 * Active handler manager information.
 */
export interface AzureBotActiveHandler extends ActiveAuthorizationHandler {
  /**
   * The number of attempts left for the handler to process in case of failure.
   */
  attemptsLeft: number
  /**
   * The current category of the handler.
   */
  category?: Category
}

/**
 * Messages configuration for the AzureBotAuthorization handler.
 */
export interface AzureBotAuthorizationOptionsMessages {
  /**
   * Message displayed when an invalid code is entered.
   * Use `{code}` as a placeholder for the entered code.
   * Defaults to: 'The code entered is invalid. Please sign-in again to continue.'
   */
  invalidCode?: string
  /**
   * Message displayed when the entered code format is invalid.
   * Use `{attemptsLeft}` as a placeholder for the number of attempts left.
   * Defaults to: 'Please enter a valid **6-digit** code format (_e.g. 123456_).\r\n**{attemptsLeft} attempt(s) left...**'
   */
  invalidCodeFormat?: string
  /**
   * Message displayed when the maximum number of attempts is exceeded.
   * Use `{maxAttempts}` as a placeholder for the maximum number of attempts.
   * Defaults to: 'You have exceeded the maximum number of sign-in attempts ({maxAttempts}).'
   */
  maxAttemptsExceeded?: string
}

/**
 * Settings for on-behalf-of token acquisition.
 */
export interface AzureBotAuthorizationOptionsOBO {
  /**
   * Connection name to use for on-behalf-of token acquisition.
   */
  connection?: string
  /**
   * Scopes to request for on-behalf-of token acquisition.
   */
  scopes?: string[]
}

/**
 * Interface defining an authorization handler configuration.
 */
export interface AzureBotAuthorizationOptions {
  /**
   * The type of authorization handler.
   * This property is optional and should not be set when configuring this handler.
   * It is included here for completeness and type safety.
   */
  type?: undefined
  /**
   * Connection name for the auth provider.
   * @remarks
   * When using environment variables, this can be set using the `${authHandlerId}_connectionName` variable.
   */
  name?: string,
  /**
   * Title to display on auth cards/UI.
   * @remarks
   * When using environment variables, this can be set using the `${authHandlerId}_connectionTitle` variable.
   */
  title?: string,
  /**
   * Text to display on auth cards/UI.
   * @remarks
   * When using environment variables, this can be set using the `${authHandlerId}_connectionText` variable.
   */
  text?: string,
  /**
   * Maximum number of attempts for entering the magic code. Defaults to 2.
   * @remarks
   * When using environment variables, this can be set using the `${authHandlerId}_maxAttempts` variable.
   */
  maxAttempts?: number
  /**
   * Messages to display for various authentication scenarios.
   * @remarks
   * When using environment variables, these can be set using the following variables:
   * - `${authHandlerId}_messages_invalidCode`
   * - `${authHandlerId}_messages_invalidCodeFormat`
   * - `${authHandlerId}_messages_maxAttemptsExceeded`
   */
  messages?: AzureBotAuthorizationOptionsMessages
  /**
   * Settings for on-behalf-of token acquisition.
   * @remarks
   * When using environment variables, these can be set using the following variables:
   * - `${authHandlerId}_obo_connection`
   * - `${authHandlerId}_obo_scopes` (comma-separated values, e.g. `scope1,scope2`)
   */
  obo?: AzureBotAuthorizationOptionsOBO

  /**
   * Option to enable SSO when authenticating using Azure Active Directory (AAD). Defaults to true.
   */
  enableSso?: boolean
}

/**
 * Settings for configuring the AzureBot authorization handler.
 */
export interface AzureBotAuthorizationSettings extends AuthorizationHandlerSettings {}

/**
 * Interface for token verification state.
 */
interface TokenVerifyState {
  state: string
}

/**
 * Interface for sign-in failure value.
 */
interface SignInFailureValue {
  code: string
  message: string
}

/**
 * Default implementation of an authorization handler using Azure Bot Service.
 */
export class AzureBotAuthorization implements AuthorizationHandler {
  private _options: AzureBotAuthorizationOptions
  private _onSuccess?: Parameters<AuthorizationHandler['onSuccess']>[0]
  private _onFailure?: Parameters<AuthorizationHandler['onFailure']>[0]

  /**
   * Creates an instance of the AzureBotAuthorization.
   * @param id The unique identifier for the handler.
   * @param options The settings for the handler.
   * @param app The agent application instance.
   */
  constructor (public readonly id: string, options: AzureBotAuthorizationOptions, private settings: AzureBotAuthorizationSettings) {
    if (!this.settings.storage) {
      throw new Error(this.prefix('The \'storage\' option is not available in the app options. Ensure that the app is properly configured.'))
    }

    if (!this.settings.connections) {
      throw new Error(this.prefix('The \'connections\' option is not available in the app options. Ensure that the app is properly configured.'))
    }

    this._options = this.loadOptions(options)
  }

  /**
   * Loads and validates the authorization handler options.
   */
  private loadOptions (settings: AzureBotAuthorizationOptions) {
    const result: AzureBotAuthorizationOptions = {
      name: settings.name ?? (process.env[`${this.id}_connectionName`]),
      title: settings.title ?? (process.env[`${this.id}_connectionTitle`]) ?? 'Sign-in',
      text: settings.text ?? (process.env[`${this.id}_connectionText`]) ?? 'Please sign-in to continue',
      maxAttempts: settings.maxAttempts ?? parseInt(process.env[`${this.id}_maxAttempts`]!),
      messages: {
        invalidCode: settings.messages?.invalidCode ?? process.env[`${this.id}_messages_invalidCode`],
        invalidCodeFormat: settings.messages?.invalidCodeFormat ?? process.env[`${this.id}_messages_invalidCodeFormat`],
        maxAttemptsExceeded: settings.messages?.maxAttemptsExceeded ?? process.env[`${this.id}_messages_maxAttemptsExceeded`],
      },
      obo: {
        connection: settings.obo?.connection ?? process.env[`${this.id}_obo_connection`],
        scopes: settings.obo?.scopes ?? this.loadScopes(process.env[`${this.id}_obo_scopes`]),
      },
      enableSso: process.env[`${this.id}_enableSso`] !== 'false' // default value is true
    }

    if (!result.name) {
      throw new Error(this.prefix(`The 'name' property or '${this.id}_connectionName' env variable is required to initialize the handler.`))
    }

    return result
  }

  /**
   * Maximum number of attempts for magic code entry.
   */
  private get maxAttempts (): number {
    const attempts = this._options.maxAttempts
    const result = typeof attempts === 'number' && Number.isFinite(attempts) ? Math.round(attempts) : NaN
    return result > 0 ? result : DEFAULT_SIGN_IN_ATTEMPTS
  }

  /**
   * Sets a handler to be called when a user successfully signs in.
   * @param callback The callback function to be invoked on successful sign-in.
   */
  onSuccess (callback: (context: TurnContext) => Promise<void> | void): void {
    this._onSuccess = callback
  }

  /**
   * Sets a handler to be called when a user fails to sign in.
   * @param callback The callback function to be invoked on sign-in failure.
   */
  onFailure (callback: (context: TurnContext, reason?: string) => Promise<void> | void): void {
    this._onFailure = callback
  }

  /**
   * Retrieves the token for the user, optionally using on-behalf-of flow for specified scopes.
   * @param context The turn context.
   * @param options Optional options for token acquisition, including connection and scopes for on-behalf-of flow.
   * @returns The token response containing the token or undefined if not available.
   */
  async token (context: TurnContext, options?: AuthorizationHandlerTokenOptions): Promise<TokenResponse> {
    let { token } = this.getContext(context)

    if (!token?.trim()) {
      const { activity } = context

      const userTokenClient = await this.getUserTokenClient(context)
      // Using getTokenOrSignInResource instead of getUserToken to avoid HTTP 404 errors.
      const { tokenResponse } = await userTokenClient.getTokenOrSignInResource(activity.from?.id!, this._options.name!, activity.channelId!, activity.getConversationReference(), activity.relatesTo!, '')
      token = tokenResponse?.token
    }

    if (!token?.trim()) {
      return { token: undefined }
    }

    return await this.handleOBO(token, options)
  }

  /**
   * Signs out the user from the service.
   * @param context The turn context.
   * @returns True if the signout was successful, false otherwise.
   */
  async signout (context: TurnContext): Promise<boolean> {
    const user = context.activity.from?.id
    const channel = context.activity.channelId
    const connection = this._options.name!

    if (!channel || !user) {
      throw new Error(this.prefix('Both \'activity.channelId\' and \'activity.from.id\' are required to perform signout.'))
    }

    logger.debug(this.prefix(`Signing out User '${user}' from => Channel: '${channel}', Connection: '${connection}'`), context.activity)
    const userTokenClient = await this.getUserTokenClient(context)
    await userTokenClient.signOut(user, connection, channel)
    return true
  }

  /**
   * Initiates the sign-in process for the handler.
   * @param context The turn context.
   * @param active Optional active handler data.
   * @returns The status of the sign-in attempt.
   */
  async signin (context: TurnContext, active?: AzureBotActiveHandler): Promise<AuthorizationHandlerStatus> {
    const { activity } = context
    const [category] = activity.name?.split('/') ?? [Category.UNKNOWN]

    const storage = new HandlerStorage<AzureBotActiveHandler>(this.settings.storage, context)

    if (!active) {
      return this.setToken(storage, context)
    }

    logger.debug(this.prefix('Sign-in active session detected'), active.activity)

    if (active.activity.conversation?.id !== activity.conversation?.id) {
      await this.sendInvokeResponse(context, { status: 400 })
      logger.warn(this.prefix('Discarding the active session due to the conversation has changed during an active sign-in process'), activity)
      return AuthorizationHandlerStatus.IGNORED
    }

    if (active.attemptsLeft <= 0) {
      logger.warn(this.prefix('Maximum sign-in attempts exceeded'), activity)
      await context.sendActivity(MessageFactory.text(this.messages.maxAttemptsExceeded(this.maxAttempts)))
      return AuthorizationHandlerStatus.REJECTED
    }

    if (category === Category.SIGNIN) {
      await storage.write({ ...active, category })
      const status = await this.handleSignInActivities(context)
      if (status !== AuthorizationHandlerStatus.IGNORED) {
        return status
      }
    } else if (active.category === Category.SIGNIN) {
      // This is only for safety in case of unexpected behaviors during the MS Teams sign-in process,
      // e.g., user interrupts the flow by clicking the Consent Cancel button.
      logger.warn(this.prefix('The incoming activity will be revalidated due to a change in the sign-in flow'), activity)
      return AuthorizationHandlerStatus.REVALIDATE
    }

    const { status, code } = await this.codeVerification(storage, context, active)
    if (status !== AuthorizationHandlerStatus.APPROVED) {
      return status
    }

    try {
      const result = await this.setToken(storage, context, active, code)
      if (result !== AuthorizationHandlerStatus.APPROVED) {
        await this.sendInvokeResponse(context, { status: 404 })
        return result
      }

      await this.sendInvokeResponse(context, { status: 200 })
      await this._onSuccess?.(context)
      return result
    } catch (error) {
      await this.sendInvokeResponse(context, { status: 500 })
      if (error instanceof Error) {
        error.message = this.prefix(error.message)
      }
      throw error
    }
  }

  /**
   * Handles on-behalf-of token acquisition.
   */
  private async handleOBO (token:string, options?: AuthorizationHandlerTokenOptions): Promise<TokenResponse> {
    const oboConnection = options?.connection ?? this._options.obo?.connection
    const oboScopes = options?.scopes && options.scopes.length > 0 ? options.scopes : this._options.obo?.scopes

    if (!oboScopes || oboScopes.length === 0) {
      return { token }
    }

    if (!this.isExchangeable(token)) {
      throw new Error(this.prefix('The current token is not exchangeable for an on-behalf-of flow. Ensure the token audience starts with \'api://\'.'))
    }

    try {
      const provider = oboConnection ? this.settings.connections.getConnection(oboConnection) : this.settings.connections.getDefaultConnection()
      const newToken = await provider.acquireTokenOnBehalfOf(oboScopes, token)
      logger.debug(this.prefix('Successfully acquired on-behalf-of token'), { connection: oboConnection, scopes: oboScopes })
      return { token: newToken }
    } catch (error) {
      logger.error(this.prefix('Failed to exchange on-behalf-of token'), { connection: oboConnection, scopes: oboScopes }, error)
      return { token: undefined }
    }
  }

  /**
   * Checks if a token is exchangeable for an on-behalf-of flow.
   */
  private isExchangeable (token: string | undefined): boolean {
    if (!token || typeof token !== 'string') {
      return false
    }
    const payload = jwt.decode(token) as JwtPayload
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    return audiences.some(aud => typeof aud === 'string' && aud.startsWith('api://'))
  }

  /**
   * Sets the token from the token response or initiates the sign-in flow.
   */
  private async setToken (storage: HandlerStorage<AzureBotActiveHandler>, context: TurnContext, active?: AzureBotActiveHandler, code?: string): Promise<AuthorizationHandlerStatus> {
    const { activity } = context

    const userTokenClient = await this.getUserTokenClient(context)
    const { tokenResponse, signInResource } = await userTokenClient.getTokenOrSignInResource(activity.from?.id!, this._options.name!, activity.channelId!, activity.getConversationReference(), activity.relatesTo!, code ?? '')

    if (!tokenResponse && active) {
      logger.warn(this.prefix('Invalid code entered. Restarting sign-in flow'), activity)
      await context.sendActivity(MessageFactory.text(this.messages.invalidCode(code ?? '')))
      return AuthorizationHandlerStatus.REJECTED
    }

    if (!tokenResponse) {
      logger.debug(this.prefix('Cannot find token. Sending sign-in card'), activity)

      const oCard = CardFactory.oauthCard(this._options.name!, this._options.title!, this._options.text!, signInResource, this._options.enableSso)
      await context.sendActivity(MessageFactory.attachment(oCard))
      await storage.write({ activity, id: this.id, ...(active ?? {}), attemptsLeft: this.maxAttempts })
      return AuthorizationHandlerStatus.PENDING
    }

    logger.debug(this.prefix('Successfully acquired token'), activity)
    this.setContext(context, { token: tokenResponse.token })
    return AuthorizationHandlerStatus.APPROVED
  }

  /**
   * Handles sign-in related activities.
   */
  private async handleSignInActivities (context: TurnContext): Promise<AuthorizationHandlerStatus> {
    const { activity } = context

    // Ignore signin/verifyState here (handled in codeVerification).
    if (activity.name === 'signin/verifyState') {
      return AuthorizationHandlerStatus.IGNORED
    }

    const userTokenClient = await this.getUserTokenClient(context)

    if (activity.name === 'signin/tokenExchange') {
      const tokenExchangeInvokeRequest = activity.value as TokenExchangeInvokeRequest
      const tokenExchangeRequest: TokenExchangeRequest = { token: tokenExchangeInvokeRequest.token }

      if (!tokenExchangeRequest?.token) {
        const reason = 'The Agent received an InvokeActivity that is missing a TokenExchangeInvokeRequest value. This is required to be sent with the InvokeActivity.'
        await this.sendInvokeResponse<TokenExchangeInvokeResponse>(context, {
          status: 400,
          body: { connectionName: this._options.name!, failureDetail: reason }
        })
        logger.error(this.prefix(reason))
        await this._onFailure?.(context, reason)
        return AuthorizationHandlerStatus.REJECTED
      }

      if (tokenExchangeInvokeRequest.connectionName !== this._options.name) {
        const reason = `The Agent received an InvokeActivity with a TokenExchangeInvokeRequest for a different connection name ('${tokenExchangeInvokeRequest.connectionName}') than expected ('${this._options.name}').`
        await this.sendInvokeResponse<TokenExchangeInvokeResponse>(context, {
          status: 400,
          body: { id: tokenExchangeInvokeRequest.id, connectionName: this._options.name!, failureDetail: reason }
        })
        logger.error(this.prefix(reason))
        await this._onFailure?.(context, reason)
        return AuthorizationHandlerStatus.REJECTED
      }

      const { token } = await userTokenClient.exchangeTokenAsync(activity.from?.id!, this._options.name!, activity.channelId!, tokenExchangeRequest)
      if (!token) {
        const reason = 'The MS Teams token service didn\'t send back the exchanged token. Waiting for MS Teams to send another signin/tokenExchange request. After multiple failed attempts, the user will be asked to enter the magic code.'
        await this.sendInvokeResponse<TokenExchangeInvokeResponse>(context, {
          status: 412,
          body: { id: tokenExchangeInvokeRequest.id, connectionName: this._options.name!, failureDetail: reason }
        })
        logger.debug(this.prefix(reason))
        return AuthorizationHandlerStatus.PENDING
      }

      await this.sendInvokeResponse<TokenExchangeInvokeResponse>(context, {
        status: 200,
        body: { id: tokenExchangeInvokeRequest.id, connectionName: this._options.name! }
      })
      logger.debug(this.prefix('Successfully exchanged token'))
      this.setContext(context, { token })
      await this._onSuccess?.(context)
      return AuthorizationHandlerStatus.APPROVED
    }

    if (activity.name === 'signin/failure') {
      await this.sendInvokeResponse(context, { status: 200 })
      const reason = 'Failed to sign-in'
      const value = activity.value as SignInFailureValue
      logger.error(this.prefix(reason), value, activity)
      if (this._onFailure) {
        await this._onFailure(context, value.message || reason)
      } else {
        await context.sendActivity(MessageFactory.text(`${reason}. Please try again.`))
      }
      return AuthorizationHandlerStatus.REJECTED
    }

    logger.error(this.prefix(`Unknown sign-in activity name: ${activity.name}`), activity)
    return AuthorizationHandlerStatus.REJECTED
  }

  /**
   * Verifies the magic code provided by the user.
   */
  private async codeVerification (storage: HandlerStorage<AzureBotActiveHandler>, context: TurnContext, active?: AzureBotActiveHandler): Promise<{ status: AuthorizationHandlerStatus, code?: string }> {
    if (!active) {
      logger.debug(this.prefix('No active session found. Skipping code verification.'), context.activity)
      return { status: AuthorizationHandlerStatus.IGNORED }
    }

    const { activity } = context
    let state: string | undefined = activity.text

    if (activity.name === 'signin/verifyState') {
      logger.debug(this.prefix('Getting code from activity.value'), activity)
      const { state: teamsState } = activity.value as TokenVerifyState
      state = teamsState
    }

    if (state === 'CancelledByUser') {
      await this.sendInvokeResponse(context, { status: 200 })
      logger.warn(this.prefix('Sign-in process was cancelled by the user'), activity)
      return { status: AuthorizationHandlerStatus.REJECTED }
    }

    if (!state?.match(/^\d{6}$/)) {
      logger.warn(this.prefix(`Invalid magic code entered. Attempts left: ${active.attemptsLeft}`), activity)
      await context.sendActivity(MessageFactory.text(this.messages.invalidCodeFormat(active.attemptsLeft)))
      await storage.write({ ...active, attemptsLeft: active.attemptsLeft - 1 })
      return { status: AuthorizationHandlerStatus.PENDING }
    }

    await this.sendInvokeResponse(context, { status: 200 })
    logger.debug(this.prefix('Code verification successful'), activity)
    return { status: AuthorizationHandlerStatus.APPROVED, code: state }
  }

  private _key = `${AzureBotAuthorization.name}/${this.id}`

  /**
   * Sets the authorization context in the turn state.
   */
  private setContext (context: TurnContext, data: TokenResponse) {
    return context.turnState.set(this._key, () => data)
  }

  /**
   * Gets the authorization context from the turn state.
   */
  private getContext (context: TurnContext): TokenResponse {
    const result = context.turnState.get(this._key)
    return result?.() ?? { token: undefined }
  }

  /**
   * Gets the user token client from the turn context.
   */
  private async getUserTokenClient (context: TurnContext): Promise<UserTokenClient> {
    const userTokenClient = context.turnState.get<UserTokenClient>(context.adapter.UserTokenClientKey)
    if (!userTokenClient) {
      throw new Error(this.prefix('The \'userTokenClient\' is not available in the adapter. Ensure that the adapter supports user token operations.'))
    }
    return userTokenClient
  }

  /**
   * Sends an InvokeResponse activity if the channel is Microsoft Teams, including Copilot within MS Teams.
   */
  private sendInvokeResponse <T>(context: TurnContext, response: InvokeResponse<T>) {
    const [parentChannel] = Activity.parseChannelId(context.activity.channelId!)
    if (parentChannel !== Channels.Msteams) {
      return Promise.resolve()
    }

    return context.sendActivity(Activity.fromObject({
      type: ActivityTypes.InvokeResponse,
      value: response
    }))
  }

  /**
   * Prefixes a message with the handler ID.
   */
  private prefix (message: string) {
    return `[handler:${this.id}] ${message}`
  }

  /**
   * Predefined messages with dynamic placeholders.
   */
  private messages = {
    invalidCode: (code: string) => {
      const message = this._options.messages?.invalidCode ?? 'Invalid **{code}** code entered. Please try again with a new sign-in request.'
      return message.replaceAll('{code}', code)
    },
    invalidCodeFormat: (attemptsLeft: number) => {
      const message = this._options.messages?.invalidCodeFormat ?? 'Please enter a valid **6-digit** code format (_e.g. 123456_).\r\n**{attemptsLeft} attempt(s) left...**'
      return message.replaceAll('{attemptsLeft}', attemptsLeft.toString())
    },
    maxAttemptsExceeded: (maxAttempts: number) => {
      const message = this._options.messages?.maxAttemptsExceeded ?? 'You have exceeded the maximum number of sign-in attempts ({maxAttempts}). Please try again with a new sign-in request.'
      return message.replaceAll('{maxAttempts}', maxAttempts.toString())
    },
  }

  /**
   * Loads the OAuth scopes from the environment variables.
   */
  private loadScopes (value:string | undefined): string[] {
    return value?.split(',').reduce<string[]>((acc, scope) => {
      const trimmed = scope.trim()
      if (trimmed) {
        acc.push(trimmed)
      }
      return acc
    }, []) ?? []
  }
}
