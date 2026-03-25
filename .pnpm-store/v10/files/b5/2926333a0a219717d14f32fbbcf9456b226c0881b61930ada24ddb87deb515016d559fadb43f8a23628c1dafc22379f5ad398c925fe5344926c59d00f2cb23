/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Storage } from '../storage'
import { AgentApplication } from './agentApplication'
import { AgentApplicationOptions } from './agentApplicationOptions'
import { AuthorizationOptions } from './auth/types'
import { TurnState } from './turnState'

/**
 * Builder class for creating and configuring AgentApplication instances.
 * @typeParam TState Type extending TurnState that will be used by the application
 */
export class AgentApplicationBuilder<TState extends TurnState = TurnState> {
  protected _options: Partial<AgentApplicationOptions<TState>> = {}

  /**
   * Gets the current options for the AgentApplication being built.
   * @returns The current options object
   */
  protected get options () {
    return this._options
  }

  /**
   * Sets the storage provider for the AgentApplication.
   * @param storage The storage implementation to use
   * @returns This builder instance for chaining
   */
  public withStorage (storage: Storage): this {
    this._options.storage = storage
    return this
  }

  /**
   * Sets the factory function to create new TurnState instances.
   * @param turnStateFactory Function that creates a new TurnState
   * @returns This builder instance for chaining
   */
  public withTurnStateFactory (turnStateFactory: () => TState): this {
    this._options.turnStateFactory = turnStateFactory
    return this
  }

  /**
   * Configures whether the agent should display typing indicators.
   * @param startTypingTimer Whether to show typing indicators
   * @returns This builder instance for chaining
   */
  // public setStartTypingTimer (startTypingTimer: boolean): this {
  //   this._options.startTypingTimer = startTypingTimer
  //   return this
  // }

  /**
   * Sets authentication options for the AgentApplication.
   * @param authHandlers The user identity authentication options
   * @returns This builder instance for chaining
   */
  public withAuthorization (authHandlers: AuthorizationOptions): this {
    this._options.authorization = authHandlers
    return this
  }

  /**
   * Builds and returns a new AgentApplication instance configured with the provided options.
   * @returns A new AgentApplication instance
   */
  public build (): AgentApplication<TState> {
    return new AgentApplication(this._options)
  }
}
