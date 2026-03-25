/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Represents an entry in the turn state that can be tracked for changes and stored.
 */
export class TurnStateEntry {
  private _value: Record<string, unknown>
  private _storageKey?: string
  private _deleted = false
  private _hash: string

  /**
   * Creates a new instance of TurnStateEntry.
   * @param value - The initial value for the entry.
   * @param storageKey - Optional storage key used to persist the entry.
   */
  public constructor (value?: Record<string, unknown>, storageKey?: string) {
    this._value = value || {}
    this._storageKey = storageKey
    this._hash = JSON.stringify(this._value)
  }

  /**
   * Gets whether the entry value has changed since its creation or last update.
   * @returns True if the value has changed, otherwise false.
   */
  public get hasChanged (): boolean {
    return JSON.stringify(this._value) !== this._hash
  }

  /**
   * Gets whether the entry has been marked for deletion.
   * @returns True if the entry is marked for deletion, otherwise false.
   */
  public get isDeleted (): boolean {
    return this._deleted
  }

  /**
   * Gets the current value of the entry. If the entry was marked for deletion,
   * it will be reset to an empty object and marked as not deleted.
   * @returns The current value of the entry.
   */
  public get value (): Record<string, unknown> {
    if (this.isDeleted) {
      this._value = {}
      this._deleted = false
    }

    return this._value
  }

  /**
   * Gets the storage key associated with this entry.
   * @returns The storage key, or undefined if no storage key was specified.
   */
  public get storageKey (): string | undefined {
    return this._storageKey
  }

  /**
   * Marks the entry for deletion.
   */
  public delete (): void {
    this._deleted = true
  }

  /**
   * Replaces the current value with a new value.
   * @param value - The new value to set. If undefined, an empty object will be used.
   */
  public replace (value?: Record<string, unknown>): void {
    this._value = value || {}
  }
}
