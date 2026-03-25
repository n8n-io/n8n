"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStorage = void 0;
const logger_1 = require("@microsoft/agents-activity/logger");
const logger = (0, logger_1.debug)('agents:memory-storage');
/**
 * A simple in-memory storage provider that implements the Storage interface.
 *
 * @remarks
 * This class provides a volatile storage solution that keeps data in memory,
 * which means data is lost when the process terminates. It's primarily useful for:
 * - Development and testing scenarios
 * - Simple applications that don't require data persistence across restarts
 * - Stateless environments where external storage isn't available
 *
 * MemoryStorage supports optimistic concurrency control through eTags and
 * can be used as a singleton through the {@link MemoryStorage.getSingleInstance | getSingleInstance() method} to
 * share state across different parts of an application.
 */
class MemoryStorage {
    /**
     * Creates a new instance of the MemoryStorage class.
     *
     * @param memory An optional initial memory store to seed the storage with data
     */
    constructor(memory = {}) {
        this.memory = memory;
        /**
         * Counter used to generate unique eTags for stored items
         */
        this.etag = 1;
    }
    /**
     * Gets a single shared instance of the MemoryStorage class.
     *
     * @returns The singleton instance of MemoryStorage
     *
     * @remarks
     * Using this method ensures that the same storage instance is used across
     * the application, allowing for shared state without passing references.
     *
     */
    static getSingleInstance() {
        if (!MemoryStorage.instance) {
            MemoryStorage.instance = new MemoryStorage();
        }
        return MemoryStorage.instance;
    }
    /**
     * Reads storage items from memory.
     *
     * @param keys The keys of the items to read
     * @returns A promise that resolves to the read items
     * @throws Will throw an error if keys are not provided or the array is empty
     */
    async read(keys) {
        if (!keys || keys.length === 0) {
            throw new ReferenceError('Keys are required when reading.');
        }
        const data = {};
        for (const key of keys) {
            logger.debug(`Reading key: ${key}`);
            const item = this.memory[key];
            if (item) {
                data[key] = JSON.parse(item);
            }
        }
        return data;
    }
    /**
     * Writes storage items to memory.
     *
     * @param changes The items to write, indexed by key
     * @returns A promise that resolves when the write operation is complete
     * @throws Will throw an error if changes are not provided or if there's an eTag conflict
     *
     * @remarks
     * This method supports optimistic concurrency control through eTags.
     * If an item has an eTag, it will only be updated if the existing item
     * has the same eTag. If an item has an eTag of '*' or no eTag, it will
     * always be written regardless of the current state.
     */
    async write(changes) {
        if (!changes || changes.length === 0) {
            throw new ReferenceError('Changes are required when writing.');
        }
        for (const [key, newItem] of Object.entries(changes)) {
            logger.debug(`Writing key: ${key}`);
            const oldItemStr = this.memory[key];
            if (!oldItemStr || newItem.eTag === '*' || !newItem.eTag) {
                this.saveItem(key, newItem);
            }
            else {
                const oldItem = JSON.parse(oldItemStr);
                if (newItem.eTag === oldItem.eTag) {
                    this.saveItem(key, newItem);
                }
                else {
                    throw new Error(`Storage: error writing "${key}" due to eTag conflict.`);
                }
            }
        }
    }
    /**
     * Deletes storage items from memory.
     *
     * @param keys The keys of the items to delete
     * @returns A promise that resolves when the delete operation is complete
     */
    async delete(keys) {
        logger.debug(`Deleting keys: ${keys.join(', ')}`);
        for (const key of keys) {
            delete this.memory[key];
        }
    }
    /**
     * Saves an item to memory with a new eTag.
     *
     * @param key The key of the item to save
     * @param item The item to save
     *
     * @remarks
     * This private method handles the details of:
     * - Creating a clone of the item to prevent modification of the original
     * - Generating a new eTag for optimistic concurrency control
     * - Converting the item to a JSON string for storage
     *
     * @private
     */
    saveItem(key, item) {
        const clone = Object.assign({}, item, { eTag: (this.etag++).toString() });
        this.memory[key] = JSON.stringify(clone);
    }
}
exports.MemoryStorage = MemoryStorage;
//# sourceMappingURL=memoryStorage.js.map