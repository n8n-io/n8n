/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Interface for memory operations that provides a way to store and retrieve values by path.
 * Allows components to persist state data during a conversation.
 */
export interface AppMemory {
  /**
   * Deletes a value at the specified path.
   * @param path The path to the value to delete
   */
  deleteValue(path: string): void;

  /**
   * Checks if a value exists at the specified path.
   * @param path The path to check
   * @returns True if a value exists at the path, false otherwise
   */
  hasValue(path: string): boolean;

  /**
   * Gets a value from the specified path.
   * @typeParam TValue The expected type of the value
   * @param path The path to get the value from
   * @returns The value at the specified path cast to type TValue
   */
  getValue<TValue = unknown>(path: string): TValue;

  /**
   * Sets a value at the specified path.
   * @param path The path where the value should be stored
   * @param value The value to store
   */
  setValue(path: string, value: unknown): void;
}
