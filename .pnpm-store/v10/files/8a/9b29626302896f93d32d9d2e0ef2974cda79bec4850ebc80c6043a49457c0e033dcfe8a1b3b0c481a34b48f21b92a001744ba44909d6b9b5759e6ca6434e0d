/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import path from 'path'
import fs from 'fs'
import { Storage, StoreItem } from './storage'

/**
 * A file-based storage implementation that persists data to the local filesystem.
 *
 * @remarks
 * FileStorage stores all data in a single JSON file named 'state.json' within a specified folder.
 * This implementation is suitable for development scenarios, local testing, and single-instance
 * deployments where shared state across multiple instances is not required.
 *
 * The storage format is a simple key-value JSON object where keys are strings and values
 * can be any JSON-serializable data. All operations are synchronous file I/O operations
 * wrapped in Promise interfaces to match the Storage contract.
 *
 * ### Warning
 * This implementation does not provide:
 * - Thread safety for concurrent access
 * - Optimistic concurrency control (eTag support)
 * - Atomic operations across multiple keys
 * - Scale for large datasets
 *
 * For production scenarios requiring these features, consider using
 * database-backed storage implementations instead.
 *
 * @example
 * ```typescript
 * const storage = new FileStorage('./data');
 *
 * // Write some data
 * await storage.write({
 *   'user123': { name: 'John', lastSeen: new Date().toISOString() },
 *   'conversation456': { turn: 5, context: 'discussing weather' }
 * });
 *
 * // Read specific keys
 * const data = await storage.read(['user123']);
 * console.log(data.user123); // { name: 'John', lastSeen: '...' }
 *
 * // Delete data
 * await storage.delete(['conversation456']);
 * ```
 *
 */
export class FileStorage implements Storage {
  private _folder: string
  private _stateFile: Record<string, string>

  /**
   * Creates a new FileStorage instance that stores data in the specified folder.
   *
   * @param folder The absolute or relative path to the folder where the state.json file will be stored
   * @throws May throw filesystem errors if the folder cannot be created or accessed
   *
   * @remarks
   * The constructor performs the following initialization steps:
   * 1. Creates the target folder if it doesn't exist (including parent directories)
   * 2. Creates an empty state.json file if it doesn't exist
   * 3. Loads existing data from state.json into memory for fast access
   *
   */
  constructor (folder: string) {
    this._folder = folder
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true })
    }
    if (!fs.existsSync(path.join(folder, 'state.json'))) {
      fs.writeFileSync(path.join(folder, 'state.json'), '{}')
    }
    const data = fs.readFileSync(path.join(folder, 'state.json'), 'utf8')
    this._stateFile = JSON.parse(data)
  }

  /**
   * Reads store items from the filesystem storage.
   *
   * @param keys Array of keys to read from storage
   * @returns Promise resolving to an object containing the requested items (keys that don't exist are omitted)
   * @throws ReferenceError if keys array is empty or undefined
   *
   * @remarks
   * This method reads from the in-memory cache that was loaded during construction,
   * making it very fast but potentially returning stale data if the file was
   * modified by external processes.
   *
   */
  read (keys: string[]) : Promise<StoreItem> {
    return new Promise((resolve, reject) => {
      if (!keys || keys.length === 0) {
        reject(new ReferenceError('Keys are required when reading.'))
      } else {
        const data: StoreItem = {}
        for (const key of keys) {
          const item = this._stateFile[key]
          if (item) {
            data[key] = item
          }
        }
        resolve(data)
      }
    })
  }

  /**
   * Writes store items to the filesystem storage.
   *
   * @param changes Object containing key-value pairs to write to storage
   * @returns Promise that resolves when the write operation completes
   *
   * @remarks
   * This method updates both the in-memory cache and writes the entire state
   * to the state.json file. The file is written with pretty-printing (2-space indentation)
   * for better readability during development and debugging.
   *
   * > [!NOTE]
   * > This implementation does not support eTag-based optimistic concurrency control.
   * > Any eTag values in the changes object are ignored.
   *
   */
  write (changes: StoreItem) : Promise<void> {
    const keys = Object.keys(changes)
    for (const key of keys) {
      this._stateFile[key] = changes[key]
    }
    fs.writeFileSync(this._folder + '/state.json', JSON.stringify(this._stateFile, null, 2))
    return Promise.resolve()
  }

  /**
   * Deletes store items from the filesystem storage.
   *
   * @param keys Array of keys to delete from storage
   * @returns Promise that resolves when the delete operation completes
   *
   * @throws ReferenceError if keys array is empty or undefined
   *
   * @remarks
   * This method removes the specified keys from both the in-memory cache
   * and writes the updated state to the state.json file. Keys that don't
   * exist in storage are silently ignored.
   *
   */
  delete (keys: string[]) : Promise<void> {
    return new Promise((resolve, reject) => {
      if (!keys || keys.length === 0) {
        reject(new ReferenceError('Keys are required when deleting.'))
      } else {
        for (const key of keys) {
          delete this._stateFile[key]
        }
        fs.writeFileSync(this._folder + '/state.json', JSON.stringify(this._stateFile, null, 2))
      }
      resolve()
    })
  }
}
