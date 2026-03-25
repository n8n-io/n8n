"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentState = void 0;
const node_crypto_1 = require("node:crypto");
const agentStatePropertyAccesor_1 = require("./agentStatePropertyAccesor");
const logger_1 = require("@microsoft/agents-activity/logger");
const logger = (0, logger_1.debug)('agents:state');
/**
 * Manages the state of an Agent across turns in a conversation.
 *
 * @remarks
 * AgentState provides functionality to persist and retrieve state data using
 * a storage provider. It handles caching state in the turn context for performance,
 * calculating change hashes to detect modifications, and managing property accessors
 * for typed access to state properties.
 */
class AgentState {
    /**
     * Creates a new instance of AgentState.
     *
     * @param storage The storage provider used to persist state between turns
     * @param storageKey A factory function that generates keys for storing state data
     */
    constructor(storage, storageKey) {
        this.storage = storage;
        this.storageKey = storageKey;
        this.stateKey = Symbol('state');
        /**
         * Calculates a hash for the specified state object to detect changes.
         *
         * @param item The state object to calculate the hash for
         * @returns A string hash representing the state
         *
         * @remarks
         * The eTag property is excluded from the hash calculation.
         * @private
         */
        this.calculateChangeHash = (item) => {
            const { eTag, ...rest } = item;
            // TODO review circular json structure
            const result = JSON.stringify(rest);
            const hash = (0, node_crypto_1.createHash)('sha256', { encoding: 'utf-8' });
            const hashed = hash.update(result).digest('hex');
            return hashed;
        };
    }
    /**
     * Creates a property accessor for the specified property.
     *
     * @param name The name of the property to access
     * @returns A property accessor for the specified property
     *
     * @remarks
     * Property accessors provide typed access to properties within the state object.
     */
    createProperty(name) {
        const prop = new agentStatePropertyAccesor_1.AgentStatePropertyAccessor(this, name);
        return prop;
    }
    /**
     * Loads the state from storage into the turn context.
     *
     * @param context The turn context to load state into
     * @param force If true, forces a reload from storage even if state is cached
     * @param customKey Optional custom storage key to use instead of the default
     * @returns A promise that resolves to the loaded state object
     *
     * @remarks
     * If state is already cached in the turn context and force is not set, the cached version will be used.
     */
    async load(context, force = false, customKey) {
        const cached = context.turnState.get(this.stateKey);
        if (force || !cached || !cached.state) {
            const key = await this.getStorageOrCustomKey(customKey, context);
            logger.info(`Reading storage with key ${key}`);
            const storedItem = await this.storage.read([key]);
            const state = storedItem[key] || {};
            const hash = this.calculateChangeHash(state);
            context.turnState.set(this.stateKey, { state, hash });
            return state;
        }
        return cached.state;
    }
    /**
     * Saves the state to storage if it has changed since it was loaded.
     *
     * @param context The turn context containing the state to save
     * @param force If true, forces a save to storage even if no changes are detected
     * @param customKey Optional custom storage key to use instead of the default
     * @returns A promise that resolves when the save operation is complete
     *
     * @remarks
     * Change detection uses a hash of the state object to determine if saving is necessary.
     */
    async saveChanges(context, force = false, customKey) {
        let cached = context.turnState.get(this.stateKey);
        if (force || (cached && cached.hash !== this.calculateChangeHash(cached === null || cached === void 0 ? void 0 : cached.state))) {
            if (!cached) {
                cached = { state: {}, hash: '' };
            }
            cached.state.eTag = '*';
            const changes = {};
            const key = await this.getStorageOrCustomKey(customKey, context);
            changes[key] = cached.state;
            logger.info(`Writing storage with key ${key}`);
            await this.storage.write(changes);
            cached.hash = this.calculateChangeHash(cached.state);
            context.turnState.set(this.stateKey, cached);
        }
    }
    /**
     * Determines whether to use a custom key or generate one from the context.
     *
     * @param customKey Optional custom key with channel and conversation IDs
     * @param context The turn context used to generate a key if no custom key is provided
     * @returns The storage key to use
     * @private
     */
    async getStorageOrCustomKey(customKey, context) {
        let key;
        if (customKey && customKey.channelId && customKey.conversationId) {
            // TODO check ConversationState.ts line 40. This line below should follow the same pattern
            key = `${customKey.channelId}/conversations/${customKey.conversationId}`;
        }
        else {
            key = await this.storageKey(context);
        }
        return key;
    }
    /**
     * Clears the state by setting it to an empty object in the turn context.
     *
     * @param context The turn context containing the state to clear
     * @returns A promise that resolves when the clear operation is complete
     *
     * @remarks
     * This does not remove the state from storage, it only clears the in-memory representation.
     * Call saveChanges() after this to persist the empty state to storage.
     *
     */
    async clear(context) {
        const emptyObjectToForceSave = { state: {}, hash: '' };
        context.turnState.set(this.stateKey, emptyObjectToForceSave);
    }
    /**
     * Deletes the state from both the turn context and storage.
     *
     * @param context The turn context containing the state to delete
     * @param customKey Optional custom storage key to use instead of the default
     * @returns A promise that resolves when the delete operation is complete
     */
    async delete(context, customKey) {
        if (context.turnState.has(this.stateKey)) {
            context.turnState.delete(this.stateKey);
        }
        const key = await this.getStorageOrCustomKey(customKey, context);
        logger.info(`Deleting storage with key ${key}`);
        await this.storage.delete([key]);
    }
    /**
     * Gets the state from the turn context without loading it from storage.
     *
     * @param context The turn context containing the state to get
     * @returns The state object, or undefined if no state is found in the turn context
     */
    get(context) {
        const cached = context.turnState.get(this.stateKey);
        return typeof cached === 'object' && typeof cached.state === 'object' ? cached.state : undefined;
    }
}
exports.AgentState = AgentState;
//# sourceMappingURL=agentState.js.map