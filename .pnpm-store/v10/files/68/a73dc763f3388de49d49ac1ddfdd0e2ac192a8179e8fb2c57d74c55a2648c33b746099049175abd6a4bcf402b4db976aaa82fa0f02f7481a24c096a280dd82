/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { debug } from '@microsoft/agents-activity'
import { TurnContext } from '../../../turnContext'
import { AuthorizationHandler, AuthorizationHandlerSettings, AuthorizationHandlerStatus, AuthorizationHandlerTokenOptions } from '../types'
import { TokenResponse } from '../../../oauth'
import { AuthProvider } from '../../../auth'

const logger = debug('agents:authorization:agentic')

/**
 * Options for configuring the Agentic authorization handler.
 */
export interface AgenticAuthorizationOptions {
  /**
   * The type of authorization handler.
   * @remarks
   * When using environment variables, this can be set using the `${authHandlerId}_type` variable.
   */
  type: 'agentic'
  /**
   * The scopes required for the authorization.
   * @remarks
   * When using environment variables, this can be set using the `${authHandlerId}_scopes` variable (comma-separated values, e.g. `scope1,scope2`).
   */
  scopes?: string[]
  /**
   * (Optional) An alternative connection name to use for the authorization process.
   * @remarks
   * When using environment variables, this can be set using the `${authHandlerId}_altBlueprintConnectionName` variable.
   */
  altBlueprintConnectionName?: string
}

/**
 * Settings for configuring the Agentic authorization handler.
 */
export interface AgenticAuthorizationSettings extends AuthorizationHandlerSettings {}

/**
 * Authorization handler for Agentic authentication.
 */
export class AgenticAuthorization implements AuthorizationHandler {
  private _options: AgenticAuthorizationOptions
  private _onSuccess?: Parameters<AuthorizationHandler['onSuccess']>[0]
  private _onFailure?: Parameters<AuthorizationHandler['onFailure']>[0]

  /**
   * Creates an instance of the AgenticAuthorization class.
   * @param id The unique identifier for the authorization handler.
   * @param options The options for configuring the authorization handler.
   * @param settings The settings for the authorization handler.
   */
  constructor (public readonly id: string, options: AgenticAuthorizationOptions, private settings: AgenticAuthorizationSettings) {
    if (!this.settings.connections) {
      throw new Error(this.prefix('The \'connections\' option is not available in the app options. Ensure that the app is properly configured.'))
    }

    this._options = this.loadOptions(options)
  }

  /**
   * Loads and validates the authorization handler options.
   */
  private loadOptions (settings: AgenticAuthorizationOptions) {
    const result: AgenticAuthorizationOptions = {
      type: 'agentic',
      altBlueprintConnectionName: settings.altBlueprintConnectionName ?? (process.env[`${this.id}_altBlueprintConnectionName`]),
      scopes: settings.scopes ?? this.loadScopes(process.env[`${this.id}_scopes`]),
    }

    if (!result.scopes || result.scopes.length === 0) {
      throw new Error(this.prefix('At least one scope must be specified for the Agentic authorization handler.'))
    }

    return result
  }

  /**
   * @inheritdoc
   */
  signin (): Promise<AuthorizationHandlerStatus> {
    return Promise.resolve(AuthorizationHandlerStatus.IGNORED)
  }

  /**
   * @inheritdoc
   */
  signout (): Promise<boolean> {
    return Promise.resolve(false)
  }

  /**
   * @inheritdoc
   */
  async token (context: TurnContext, options?: AuthorizationHandlerTokenOptions): Promise<TokenResponse> {
    try {
      const scopes = options?.scopes || this._options.scopes!

      const tokenResponse = this.getContext(context, scopes)
      if (tokenResponse.token) {
        logger.debug(this.prefix('Using cached Agentic user token'))
        return tokenResponse
      }

      let connection: AuthProvider

      if (this._options.altBlueprintConnectionName?.trim()) {
        connection = this.settings.connections.getConnection(this._options.altBlueprintConnectionName)
      } else {
        connection = this.settings.connections.getTokenProvider(context.identity, context.activity.serviceUrl ?? '')
      }

      const token = await connection.getAgenticUserToken(
        context.activity.getAgenticTenantId() ?? '',
        context.activity.getAgenticInstanceId() ?? '',
        context.activity.getAgenticUser() ?? '',
        scopes
      )

      this.setContext(context, scopes, { token })
      this._onSuccess?.(context)
      return { token }
    } catch (error) {
      const reason = 'Error retrieving Agentic user token'
      logger.error(this.prefix(reason), error)
      this._onFailure?.(context, `${reason}: ${(error as Error).message}`)
      return { token: undefined }
    }
  }

  /**
   * @inheritdoc
   */
  onSuccess (callback: (context: TurnContext) => void): void {
    this._onSuccess = callback
  }

  /**
   * @inheritdoc
   */
  onFailure (callback: (context: TurnContext, reason?: string) => void): void {
    this._onFailure = callback
  }

  /**
   * Prefixes a message with the handler ID.
   */
  private prefix (message: string) {
    return `[handler:${this.id}] ${message}`
  }

  private _key = `${AgenticAuthorization.name}/${this.id}`

  /**
   * Sets the authorization context in the turn state.
   * @param context The turn context in which to set the authorization data.
   * @param scopes The OAuth scopes associated with the authorization context.
   * @param data The token response to store in the turn state.
   */
  private setContext (context: TurnContext, scopes: string[], data: TokenResponse) {
    return context.turnState.set(`${this._key}:${scopes.join(';')}`, () => data)
  }

  /**
   * Gets the authorization context from the turn state.
   * @param scopes The OAuth scopes for which the context is being retrieved.
   */
  private getContext (context: TurnContext, scopes: string[]): TokenResponse {
    const result = context.turnState.get(`${this._key}:${scopes.join(';')}`)
    return result?.() ?? { token: undefined }
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
