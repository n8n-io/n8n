/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Activity } from '@microsoft/agents-activity'
import { Storage, StoreItem } from '../../storage'
import { TurnContext } from '../../turnContext'
import { AgenticAuthorizationOptions, AzureBotAuthorizationOptions } from './handlers'
import { TokenResponse } from '../../oauth'
import { Connections } from '../../auth/connections'

/**
 * Authorization configuration options.
 */
export type AuthorizationOptions = Record<string, AzureBotAuthorizationOptions | AgenticAuthorizationOptions>

/**
 * Represents the status of a handler registration attempt.
 */
export enum AuthorizationHandlerStatus {
  /** The handler has approved the request - validation passed */
  APPROVED = 'approved',
  /** The handler registration is pending further action */
  PENDING = 'pending',
  /** The handler has rejected the request - validation failed */
  REJECTED = 'rejected',
  /** The handler has ignored the request - no action taken */
  IGNORED = 'ignored',
  /** The handler requires revalidation */
  REVALIDATE = 'revalidate'
}

/**
 * Active handler manager information.
 */
export interface ActiveAuthorizationHandler extends StoreItem {
  /**
   * Unique identifier for the handler.
   */
  readonly id: string
  /**
   * The current activity associated with the handler.
   */
  activity: Activity
}

export interface AuthorizationHandler {
  /**
   * Unique identifier for the handler.
   */
  readonly id: string
  /**
   * Initiates the sign-in process for the handler.
   * @param context The turn context.
   * @param active Optional active handler data.
   * @returns The status of the sign-in attempt.
   */
  signin(context: TurnContext, active?: ActiveAuthorizationHandler): Promise<AuthorizationHandlerStatus>
  /**
   * Initiates the sign-out process for the handler.
   * @param context The turn context.
   * @returns A promise that resolves to a boolean indicating the success of the sign-out attempt.
   */
  signout(context: TurnContext): Promise<boolean>;
  /**
   * Retrieves an access token for the specified scopes.
   * @param context The turn context.
   * @param options Optional token request options.
   * @returns The access token response.
   */
  token(context: TurnContext, options?: AuthorizationHandlerTokenOptions): Promise<TokenResponse>;
  /**
   * Registers a callback to be invoked when the sign-in process is successful.
   * @param callback The callback to invoke on success.
   */
  onSuccess(callback: (context: TurnContext) => Promise<void> | void): void;
  /**
   * Registers a callback to be invoked when the sign-in process fails.
   * @param callback The callback to invoke on failure.
   */
  onFailure(callback: (context: TurnContext, reason?: string) => Promise<void> | void): void;
}

/**
 * Common settings required by authorization handlers.
 */
export interface AuthorizationHandlerSettings {
  /**
   * Storage instance for persisting handler state.
   */
  storage: Storage
  /**
   * Connections instance for managing authentication connections.
   */
  connections: Connections
}

/**
 * Options for token requests in authorization handlers.
 */
export interface AuthorizationHandlerTokenOptions {
  /**
   * Optional name of the connection to use for the token request. Usually used for OBO flows.
   */
  connection?: string
  /**
   * Optional scopes to request in the token. Usually used for OBO flows.
   */
  scopes?: string[]
}
