/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { Storage, StorageKeyFactory } from '../storage/storage';
import { TurnContext } from '../turnContext';
import { AgentStatePropertyAccessor } from './agentStatePropertyAccesor';
/**
 * Represents agent state that has been cached in the turn context.
 *
 * @remarks
 * Used internally to track state changes and avoid unnecessary storage operations.
 */
export interface CachedAgentState {
    /**
     * The state object containing all properties and their values
     */
    state: {
        [id: string]: any;
    };
    /**
     * Hash of the state used to detect changes
     */
    hash: string;
}
/**
 * Represents a custom key for storing state in a specific location.
 *
 * @remarks
 * Allows state to be persisted with channel and conversation identifiers
 * independent of the current context.
 */
export interface CustomKey {
    /**
     * The ID of the channel where the state should be stored
     */
    channelId: string;
    /**
     * The ID of the conversation where the state should be stored
     */
    conversationId: string;
}
/**
 * Manages the state of an Agent across turns in a conversation.
 *
 * @remarks
 * AgentState provides functionality to persist and retrieve state data using
 * a storage provider. It handles caching state in the turn context for performance,
 * calculating change hashes to detect modifications, and managing property accessors
 * for typed access to state properties.
 */
export declare class AgentState {
    protected storage: Storage;
    protected storageKey: StorageKeyFactory;
    private readonly stateKey;
    /**
     * Creates a new instance of AgentState.
     *
     * @param storage The storage provider used to persist state between turns
     * @param storageKey A factory function that generates keys for storing state data
     */
    constructor(storage: Storage, storageKey: StorageKeyFactory);
    /**
     * Creates a property accessor for the specified property.
     *
     * @param name The name of the property to access
     * @returns A property accessor for the specified property
     *
     * @remarks
     * Property accessors provide typed access to properties within the state object.
     */
    createProperty<T = any>(name: string): AgentStatePropertyAccessor<T>;
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
    load(context: TurnContext, force?: boolean, customKey?: CustomKey): Promise<any>;
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
    saveChanges(context: TurnContext, force?: boolean, customKey?: CustomKey): Promise<void>;
    /**
     * Determines whether to use a custom key or generate one from the context.
     *
     * @param customKey Optional custom key with channel and conversation IDs
     * @param context The turn context used to generate a key if no custom key is provided
     * @returns The storage key to use
     * @private
     */
    private getStorageOrCustomKey;
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
    clear(context: TurnContext): Promise<void>;
    /**
     * Deletes the state from both the turn context and storage.
     *
     * @param context The turn context containing the state to delete
     * @param customKey Optional custom storage key to use instead of the default
     * @returns A promise that resolves when the delete operation is complete
     */
    delete(context: TurnContext, customKey?: CustomKey): Promise<void>;
    /**
     * Gets the state from the turn context without loading it from storage.
     *
     * @param context The turn context containing the state to get
     * @returns The state object, or undefined if no state is found in the turn context
     */
    get(context: TurnContext): any | undefined;
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
    private readonly calculateChangeHash;
}
