/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Represents an entry in the turn state that can be tracked for changes and stored.
 */
export declare class TurnStateEntry {
    private _value;
    private _storageKey?;
    private _deleted;
    private _hash;
    /**
     * Creates a new instance of TurnStateEntry.
     * @param value - The initial value for the entry.
     * @param storageKey - Optional storage key used to persist the entry.
     */
    constructor(value?: Record<string, unknown>, storageKey?: string);
    /**
     * Gets whether the entry value has changed since its creation or last update.
     * @returns True if the value has changed, otherwise false.
     */
    get hasChanged(): boolean;
    /**
     * Gets whether the entry has been marked for deletion.
     * @returns True if the entry is marked for deletion, otherwise false.
     */
    get isDeleted(): boolean;
    /**
     * Gets the current value of the entry. If the entry was marked for deletion,
     * it will be reset to an empty object and marked as not deleted.
     * @returns The current value of the entry.
     */
    get value(): Record<string, unknown>;
    /**
     * Gets the storage key associated with this entry.
     * @returns The storage key, or undefined if no storage key was specified.
     */
    get storageKey(): string | undefined;
    /**
     * Marks the entry for deletion.
     */
    delete(): void;
    /**
     * Replaces the current value with a new value.
     * @param value - The new value to set. If undefined, an empty object will be used.
     */
    replace(value?: Record<string, unknown>): void;
}
