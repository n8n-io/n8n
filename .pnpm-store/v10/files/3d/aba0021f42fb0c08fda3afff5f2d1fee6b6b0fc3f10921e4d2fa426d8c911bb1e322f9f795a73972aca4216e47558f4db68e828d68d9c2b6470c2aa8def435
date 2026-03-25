/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { Storage } from '../storage';
import { AppMemory } from './appMemory';
import { TurnStateEntry } from './turnStateEntry';
import { TurnContext } from '../turnContext';
/**
 * Default interface for conversation state.
 * Extend this interface to define custom conversation state properties.
 */
export interface DefaultConversationState {
}
/**
 * Default interface for user state.
 * Extend this interface to define custom user state properties.
 */
export interface DefaultUserState {
}
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
export declare class TurnState<TConversationState = DefaultConversationState, TUserState = DefaultUserState> implements AppMemory {
    private _scopes;
    private _isLoaded;
    private _loadingPromise?;
    private _stateNotLoadedString;
    /**
     * Gets the conversation-scoped state.
     *
     * @returns The conversation state object
     * @throws Error if state hasn't been loaded
     *
     * @remarks
     * This state is shared by all users in the same conversation.
     */
    get conversation(): TConversationState;
    /**
     * Sets the conversation-scoped state.
     *
     * @param value - The new conversation state object
     * @throws Error if state hasn't been loaded
     */
    set conversation(value: TConversationState);
    /**
     * Gets whether the state has been loaded from storage
     *
     * @returns True if the state has been loaded, false otherwise
     */
    get isLoaded(): boolean;
    /**
     * Gets the user-scoped state.
     *
     * @returns The user state object
     * @throws Error if state hasn't been loaded
     *
     * @remarks
     * This state is unique to each user and persists across conversations.
     */
    get user(): TUserState;
    /**
     * Sets the user-scoped state.
     *
     * @param value - The new user state object
     * @throws Error if state hasn't been loaded
     */
    set user(value: TUserState);
    /**
     * Marks the conversation state for deletion.
     *
     * @throws Error if state hasn't been loaded
     *
     * @remarks
     * The state will be deleted from storage on the next call to save().
     */
    deleteConversationState(): void;
    /**
     * Marks the user state for deletion.
     *
     * @throws Error if state hasn't been loaded
     *
     * @remarks
     * The state will be deleted from storage on the next call to save().
     */
    deleteUserState(): void;
    /**
     * Gets a specific state scope by name.
     *
     * @param scope - The name of the scope to retrieve
     * @returns The state entry for the scope, or undefined if not found
     */
    getScope(scope: string): TurnStateEntry | undefined;
    /**
     * Deletes a value from state by dot-notation path.
     *
     * @param path - The path to the value to delete
     *
     * @remarks
     * Format: "scope.property" or just "property" (defaults to temp scope)
     * The temp scope is internal-only, not persisted to storage, and exists only for the current turn.
     */
    deleteValue(path: string): void;
    /**
     * Checks if a value exists in state by dot-notation path.
     *
     * @param path - The path to check
     * @returns True if the value exists, false otherwise
     *
     * @remarks
     * Format: "scope.property" or just "property" (defaults to temp scope)
     */
    hasValue(path: string): boolean;
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
    getValue<TValue = unknown>(path: string): TValue;
    /**
     * Sets a value in state by dot-notation path.
     *
     * @param path - The path to set
     * @param value - The value to set
     *
     * @remarks
     * Format: "scope.property" or just "property" (defaults to temp scope)
     */
    setValue(path: string, value: unknown): void;
    /**
     * Loads state from storage into memory.
     *
     * @param context - The turn context
     * @param storage - Optional storage provider (if not provided, state will be in-memory only)
     * @param force - If true, forces a reload from storage even if state is already loaded
     * @returns Promise that resolves to true if state was loaded, false if it was already loaded
     */
    load(context: TurnContext, storage?: Storage, force?: boolean): Promise<boolean>;
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
    save(context: TurnContext, storage?: Storage): Promise<void>;
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
    protected onComputeStorageKeys(context: TurnContext): Promise<Record<string, string>>;
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
    private getScopeAndName;
}
