/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Storage, StoreItems } from '../storage'
import { AppMemory } from './appMemory'
import { TurnStateEntry } from './turnStateEntry'
import { TurnContext } from '../turnContext'
import { debug } from '@microsoft/agents-activity/logger'

const logger = debug('agents:turnState')

const CONVERSATION_SCOPE = 'conversation'

const USER_SCOPE = 'user'

const TEMP_SCOPE = 'temp'

/**
 * Default interface for conversation state.
 * Extend this interface to define custom conversation state properties.
 */
export interface DefaultConversationState {}

/**
 * Default interface for user state.
 * Extend this interface to define custom user state properties.
 */
export interface DefaultUserState {}

/**
 * Base class defining a collection of turn state scopes.
 *
 * @typeParam TConversationState - Type for conversation-scoped state
 * @typeParam TUserState - Type for user-scoped state
 *
 * @remarks
 * Developers can create a derived class that extends `TurnState` to add additional state scopes.
 *
 * @example
 * ```javascript
 * class MyTurnState extends TurnState {
 *   protected async onComputeStorageKeys(context) {
 *     const keys = await super.onComputeStorageKeys(context);
 *     keys['myScope'] = `myScopeKey`;
 *     return keys;
 *   }
 *
 *   public get myScope() {
 *     const scope = this.getScope('myScope');
 *     if (!scope) {
 *       throw new Error(`MyTurnState hasn't been loaded. Call load() first.`);
 *     }
 *     return scope.value;
 *   }
 *
 *   public set myScope(value) {
 *     const scope = this.getScope('myScope');
 *     if (!scope) {
 *       throw new Error(`MyTurnState hasn't been loaded. Call load() first.`);
 *     }
 *     scope.replace(value);
 *   }
 * }
 * ```
 *
 */
export class TurnState<
    TConversationState = DefaultConversationState,
    TUserState = DefaultUserState
> implements AppMemory {
  private _scopes: Record<string, TurnStateEntry> = {}
  private _isLoaded = false
  private _loadingPromise?: Promise<boolean>
  private _stateNotLoadedString = 'TurnState hasn\'t been loaded. Call load() first.'

  /**
   * Gets the conversation-scoped state.
   *
   * @returns The conversation state object
   * @throws Error if state hasn't been loaded
   *
   * @remarks
   * This state is shared by all users in the same conversation.
   */
  public get conversation (): TConversationState {
    const scope = this.getScope(CONVERSATION_SCOPE)
    if (!scope) {
      throw new Error(this._stateNotLoadedString)
    }
    return scope.value as TConversationState
  }

  /**
   * Sets the conversation-scoped state.
   *
   * @param value - The new conversation state object
   * @throws Error if state hasn't been loaded
   */
  public set conversation (value: TConversationState) {
    const scope = this.getScope(CONVERSATION_SCOPE)
    if (!scope) {
      throw new Error(this._stateNotLoadedString)
    }
    scope.replace(value as Record<string, unknown>)
  }

  /**
   * Gets whether the state has been loaded from storage
   *
   * @returns True if the state has been loaded, false otherwise
   */
  public get isLoaded (): boolean {
    return this._isLoaded
  }

  /**
   * Gets the user-scoped state.
   *
   * @returns The user state object
   * @throws Error if state hasn't been loaded
   *
   * @remarks
   * This state is unique to each user and persists across conversations.
   */
  public get user (): TUserState {
    const scope = this.getScope(USER_SCOPE)
    if (!scope) {
      throw new Error(this._stateNotLoadedString)
    }
    return scope.value as TUserState
  }

  /**
   * Sets the user-scoped state.
   *
   * @param value - The new user state object
   * @throws Error if state hasn't been loaded
   */
  public set user (value: TUserState) {
    const scope = this.getScope(USER_SCOPE)
    if (!scope) {
      throw new Error(this._stateNotLoadedString)
    }
    scope.replace(value as Record<string, unknown>)
  }

  /**
   * Marks the conversation state for deletion.
   *
   * @throws Error if state hasn't been loaded
   *
   * @remarks
   * The state will be deleted from storage on the next call to save().
   */
  public deleteConversationState (): void {
    const scope = this.getScope(CONVERSATION_SCOPE)
    if (!scope) {
      throw new Error(this._stateNotLoadedString)
    }
    scope.delete()
  }

  /**
   * Marks the user state for deletion.
   *
   * @throws Error if state hasn't been loaded
   *
   * @remarks
   * The state will be deleted from storage on the next call to save().
   */
  public deleteUserState (): void {
    const scope = this.getScope(USER_SCOPE)
    if (!scope) {
      throw new Error(this._stateNotLoadedString)
    }
    scope.delete()
  }

  /**
   * Gets a specific state scope by name.
   *
   * @param scope - The name of the scope to retrieve
   * @returns The state entry for the scope, or undefined if not found
   */
  public getScope (scope: string): TurnStateEntry | undefined {
    return this._scopes[scope]
  }

  /**
   * Deletes a value from state by dot-notation path.
   *
   * @param path - The path to the value to delete
   *
   * @remarks
   * Format: "scope.property" or just "property" (defaults to temp scope)
   * The temp scope is internal-only, not persisted to storage, and exists only for the current turn.
   */
  public deleteValue (path: string): void {
    const { scope, name } = this.getScopeAndName(path)
    if (Object.prototype.hasOwnProperty.call(scope.value, name)) {
      delete scope.value[name]
    }
  }

  /**
   * Checks if a value exists in state by dot-notation path.
   *
   * @param path - The path to check
   * @returns True if the value exists, false otherwise
   *
   * @remarks
   * Format: "scope.property" or just "property" (defaults to temp scope)
   */
  public hasValue (path: string): boolean {
    const { scope, name } = this.getScopeAndName(path)
    return Object.prototype.hasOwnProperty.call(scope.value, name)
  }

  /**
   * Gets a value from state by dot-notation path.
   *
   * @typeParam TValue - The type of the value to retrieve
   * @param path - The path to the value
   * @returns The value at the specified path
   *
   * @remarks
   * Format: "scope.property" or just "property" (defaults to temp scope)
   */
  public getValue<TValue = unknown>(path: string): TValue {
    const { scope, name } = this.getScopeAndName(path)
    return scope.value[name] as TValue
  }

  /**
   * Sets a value in state by dot-notation path.
   *
   * @param path - The path to set
   * @param value - The value to set
   *
   * @remarks
   * Format: "scope.property" or just "property" (defaults to temp scope)
   */
  public setValue (path: string, value: unknown): void {
    const { scope, name } = this.getScopeAndName(path)
    scope.value[name] = value
  }

  /**
   * Loads state from storage into memory.
   *
   * @param context - The turn context
   * @param storage - Optional storage provider (if not provided, state will be in-memory only)
   * @param force - If true, forces a reload from storage even if state is already loaded
   * @returns Promise that resolves to true if state was loaded, false if it was already loaded
   */
  public load (context: TurnContext, storage?: Storage, force: boolean = false): Promise<boolean> {
    if (this._isLoaded && !force) {
      return Promise.resolve(false)
    }

    if (!this._loadingPromise) {
      this._loadingPromise = new Promise<boolean>((resolve, reject) => {
        this._isLoaded = true

        const keys: string[] = []
        this.onComputeStorageKeys(context)
          .then(async (scopes) => {
            for (const key in scopes) {
              if (Object.prototype.hasOwnProperty.call(scopes, key)) {
                keys.push(scopes[key])
              }
            }

            const items = storage ? await storage.read(keys) : {}

            for (const key in scopes) {
              if (Object.prototype.hasOwnProperty.call(scopes, key)) {
                const storageKey = scopes[key]
                const value = items[storageKey]
                this._scopes[key] = new TurnStateEntry(value, storageKey)
              }
            }

            this._scopes[TEMP_SCOPE] = new TurnStateEntry({})
            this._isLoaded = true
            this._loadingPromise = undefined
            resolve(true)
          })
          .catch((err) => {
            logger.error(err)
            this._loadingPromise = undefined
            reject(err)
          })
      })
    }

    return this._loadingPromise
  }

  /**
   * Saves state changes to storage.
   *
   * @param context - The turn context
   * @param storage - Optional storage provider (if not provided, state changes won't be persisted)
   * @returns Promise that resolves when the save operation is complete
   * @throws Error if state hasn't been loaded
   *
   * @remarks
   * Only changed scopes will be persisted.
   */
  public async save (context: TurnContext, storage?: Storage): Promise<void> {
    if (!this._isLoaded && this._loadingPromise) {
      await this._loadingPromise
    }

    if (!this._isLoaded) {
      throw new Error(this._stateNotLoadedString)
    }

    let changes: StoreItems | undefined
    let deletions: string[] | undefined
    for (const key in this._scopes) {
      if (!Object.prototype.hasOwnProperty.call(this._scopes, key)) {
        continue
      }
      const entry = this._scopes[key]
      if (entry.storageKey) {
        if (entry.isDeleted) {
          if (deletions) {
            deletions.push(entry.storageKey)
          } else {
            deletions = [entry.storageKey]
          }
        } else if (entry.hasChanged) {
          if (!changes) {
            changes = {}
          }

          changes[entry.storageKey] = entry.value
        }
      }
    }

    if (storage) {
      const promises: Promise<void>[] = []
      if (changes) {
        promises.push(storage.write(changes))
      }

      if (deletions) {
        promises.push(storage.delete(deletions))
      }

      if (promises.length > 0) {
        await Promise.all(promises)
      }
    }
  }

  /**
   * Computes the storage keys for each scope based on the turn context.
   *
   * @param context - The turn context
   * @returns Promise that resolves to a dictionary of scope names to storage keys
   *
   * @remarks
   * Override this method in derived classes to add or modify storage keys.
   *
   * @protected
   */
  protected onComputeStorageKeys (context: TurnContext): Promise<Record<string, string>> {
    const activity = context.activity
    const channelId = activity?.channelId
    const agentId = activity?.recipient?.id
    const conversationId = activity?.conversation?.id
    const userId = activity?.from?.id

    if (!channelId) {
      throw new Error('missing context.activity.channelId')
    }

    if (!agentId) {
      throw new Error('missing context.activity.recipient.id')
    }

    if (!conversationId) {
      throw new Error('missing context.activity.conversation.id')
    }

    if (!userId) {
      throw new Error('missing context.activity.from.id')
    }

    const keys: Record<string, string> = {}
    keys[CONVERSATION_SCOPE] = `${channelId}/${agentId}/conversations/${conversationId}`
    keys[USER_SCOPE] = `${channelId}/${agentId}/users/${userId}`
    return Promise.resolve(keys)
  }

  /**
   * Parses a dot-notation path into scope and property name.
   *
   * @param path - The path to parse (format: "scope.property" or just "property")
   * @returns Object containing the scope entry and property name
   *
   * @remarks
   * If no scope is specified, defaults to the temp scope.
   *
   * @private
   */
  private getScopeAndName (path: string): { scope: TurnStateEntry; name: string } {
    const parts = path.split('.')
    if (parts.length > 2) {
      throw new Error(`Invalid state path: ${path}`)
    } else if (parts.length === 1) {
      parts.unshift(TEMP_SCOPE)
    }

    const scope = this.getScope(parts[0])
    if (scope === undefined) {
      throw new Error(`Invalid state scope: ${parts[0]}`)
    }
    return { scope, name: parts[1] }
  }
}
