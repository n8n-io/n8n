"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnState = void 0;
const turnStateEntry_1 = require("./turnStateEntry");
const logger_1 = require("@microsoft/agents-activity/logger");
const logger = (0, logger_1.debug)('agents:turnState');
const CONVERSATION_SCOPE = 'conversation';
const USER_SCOPE = 'user';
const TEMP_SCOPE = 'temp';
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
class TurnState {
    constructor() {
        this._scopes = {};
        this._isLoaded = false;
        this._stateNotLoadedString = 'TurnState hasn\'t been loaded. Call load() first.';
    }
    /**
     * Gets the conversation-scoped state.
     *
     * @returns The conversation state object
     * @throws Error if state hasn't been loaded
     *
     * @remarks
     * This state is shared by all users in the same conversation.
     */
    get conversation() {
        const scope = this.getScope(CONVERSATION_SCOPE);
        if (!scope) {
            throw new Error(this._stateNotLoadedString);
        }
        return scope.value;
    }
    /**
     * Sets the conversation-scoped state.
     *
     * @param value - The new conversation state object
     * @throws Error if state hasn't been loaded
     */
    set conversation(value) {
        const scope = this.getScope(CONVERSATION_SCOPE);
        if (!scope) {
            throw new Error(this._stateNotLoadedString);
        }
        scope.replace(value);
    }
    /**
     * Gets whether the state has been loaded from storage
     *
     * @returns True if the state has been loaded, false otherwise
     */
    get isLoaded() {
        return this._isLoaded;
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
    get user() {
        const scope = this.getScope(USER_SCOPE);
        if (!scope) {
            throw new Error(this._stateNotLoadedString);
        }
        return scope.value;
    }
    /**
     * Sets the user-scoped state.
     *
     * @param value - The new user state object
     * @throws Error if state hasn't been loaded
     */
    set user(value) {
        const scope = this.getScope(USER_SCOPE);
        if (!scope) {
            throw new Error(this._stateNotLoadedString);
        }
        scope.replace(value);
    }
    /**
     * Marks the conversation state for deletion.
     *
     * @throws Error if state hasn't been loaded
     *
     * @remarks
     * The state will be deleted from storage on the next call to save().
     */
    deleteConversationState() {
        const scope = this.getScope(CONVERSATION_SCOPE);
        if (!scope) {
            throw new Error(this._stateNotLoadedString);
        }
        scope.delete();
    }
    /**
     * Marks the user state for deletion.
     *
     * @throws Error if state hasn't been loaded
     *
     * @remarks
     * The state will be deleted from storage on the next call to save().
     */
    deleteUserState() {
        const scope = this.getScope(USER_SCOPE);
        if (!scope) {
            throw new Error(this._stateNotLoadedString);
        }
        scope.delete();
    }
    /**
     * Gets a specific state scope by name.
     *
     * @param scope - The name of the scope to retrieve
     * @returns The state entry for the scope, or undefined if not found
     */
    getScope(scope) {
        return this._scopes[scope];
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
    deleteValue(path) {
        const { scope, name } = this.getScopeAndName(path);
        if (Object.prototype.hasOwnProperty.call(scope.value, name)) {
            delete scope.value[name];
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
    hasValue(path) {
        const { scope, name } = this.getScopeAndName(path);
        return Object.prototype.hasOwnProperty.call(scope.value, name);
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
    getValue(path) {
        const { scope, name } = this.getScopeAndName(path);
        return scope.value[name];
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
    setValue(path, value) {
        const { scope, name } = this.getScopeAndName(path);
        scope.value[name] = value;
    }
    /**
     * Loads state from storage into memory.
     *
     * @param context - The turn context
     * @param storage - Optional storage provider (if not provided, state will be in-memory only)
     * @param force - If true, forces a reload from storage even if state is already loaded
     * @returns Promise that resolves to true if state was loaded, false if it was already loaded
     */
    load(context, storage, force = false) {
        if (this._isLoaded && !force) {
            return Promise.resolve(false);
        }
        if (!this._loadingPromise) {
            this._loadingPromise = new Promise((resolve, reject) => {
                this._isLoaded = true;
                const keys = [];
                this.onComputeStorageKeys(context)
                    .then(async (scopes) => {
                    for (const key in scopes) {
                        if (Object.prototype.hasOwnProperty.call(scopes, key)) {
                            keys.push(scopes[key]);
                        }
                    }
                    const items = storage ? await storage.read(keys) : {};
                    for (const key in scopes) {
                        if (Object.prototype.hasOwnProperty.call(scopes, key)) {
                            const storageKey = scopes[key];
                            const value = items[storageKey];
                            this._scopes[key] = new turnStateEntry_1.TurnStateEntry(value, storageKey);
                        }
                    }
                    this._scopes[TEMP_SCOPE] = new turnStateEntry_1.TurnStateEntry({});
                    this._isLoaded = true;
                    this._loadingPromise = undefined;
                    resolve(true);
                })
                    .catch((err) => {
                    logger.error(err);
                    this._loadingPromise = undefined;
                    reject(err);
                });
            });
        }
        return this._loadingPromise;
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
    async save(context, storage) {
        if (!this._isLoaded && this._loadingPromise) {
            await this._loadingPromise;
        }
        if (!this._isLoaded) {
            throw new Error(this._stateNotLoadedString);
        }
        let changes;
        let deletions;
        for (const key in this._scopes) {
            if (!Object.prototype.hasOwnProperty.call(this._scopes, key)) {
                continue;
            }
            const entry = this._scopes[key];
            if (entry.storageKey) {
                if (entry.isDeleted) {
                    if (deletions) {
                        deletions.push(entry.storageKey);
                    }
                    else {
                        deletions = [entry.storageKey];
                    }
                }
                else if (entry.hasChanged) {
                    if (!changes) {
                        changes = {};
                    }
                    changes[entry.storageKey] = entry.value;
                }
            }
        }
        if (storage) {
            const promises = [];
            if (changes) {
                promises.push(storage.write(changes));
            }
            if (deletions) {
                promises.push(storage.delete(deletions));
            }
            if (promises.length > 0) {
                await Promise.all(promises);
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
    onComputeStorageKeys(context) {
        var _a, _b, _c;
        const activity = context.activity;
        const channelId = activity === null || activity === void 0 ? void 0 : activity.channelId;
        const agentId = (_a = activity === null || activity === void 0 ? void 0 : activity.recipient) === null || _a === void 0 ? void 0 : _a.id;
        const conversationId = (_b = activity === null || activity === void 0 ? void 0 : activity.conversation) === null || _b === void 0 ? void 0 : _b.id;
        const userId = (_c = activity === null || activity === void 0 ? void 0 : activity.from) === null || _c === void 0 ? void 0 : _c.id;
        if (!channelId) {
            throw new Error('missing context.activity.channelId');
        }
        if (!agentId) {
            throw new Error('missing context.activity.recipient.id');
        }
        if (!conversationId) {
            throw new Error('missing context.activity.conversation.id');
        }
        if (!userId) {
            throw new Error('missing context.activity.from.id');
        }
        const keys = {};
        keys[CONVERSATION_SCOPE] = `${channelId}/${agentId}/conversations/${conversationId}`;
        keys[USER_SCOPE] = `${channelId}/${agentId}/users/${userId}`;
        return Promise.resolve(keys);
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
    getScopeAndName(path) {
        const parts = path.split('.');
        if (parts.length > 2) {
            throw new Error(`Invalid state path: ${path}`);
        }
        else if (parts.length === 1) {
            parts.unshift(TEMP_SCOPE);
        }
        const scope = this.getScope(parts[0]);
        if (scope === undefined) {
            throw new Error(`Invalid state scope: ${parts[0]}`);
        }
        return { scope, name: parts[1] };
    }
}
exports.TurnState = TurnState;
//# sourceMappingURL=turnState.js.map