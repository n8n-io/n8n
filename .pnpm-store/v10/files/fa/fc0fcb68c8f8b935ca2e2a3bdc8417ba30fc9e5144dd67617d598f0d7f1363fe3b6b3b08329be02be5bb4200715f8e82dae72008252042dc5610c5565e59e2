"use strict";
// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LRUCache = void 0;
exports.snakeToCamel = snakeToCamel;
exports.originalOrCamelOptions = originalOrCamelOptions;
exports.removeUndefinedValuesInObject = removeUndefinedValuesInObject;
/**
 * Returns the camel case of a provided string.
 *
 * @remarks
 *
 * Match any `_` and not `_` pair, then return the uppercase of the not `_`
 * character.
 *
 * @param str the string to convert
 * @returns the camelCase'd string
 */
function snakeToCamel(str) {
    return str.replace(/([_][^_])/g, match => match.slice(1).toUpperCase());
}
/**
 * Get the value of `obj[key]` or `obj[camelCaseKey]`, with a preference
 * for original, non-camelCase key.
 *
 * @param obj object to lookup a value in
 * @returns a `get` function for getting `obj[key || snakeKey]`, if available
 */
function originalOrCamelOptions(obj) {
    /**
     *
     * @param key an index of object, preferably snake_case
     * @returns the value `obj[key || snakeKey]`, if available
     */
    function get(key) {
        const o = (obj || {});
        return o[key] ?? o[snakeToCamel(key)];
    }
    return { get };
}
/**
 * A simple LRU cache utility.
 * Not meant for external usage.
 *
 * @experimental
 */
class LRUCache {
    capacity;
    /**
     * Maps are in order. Thus, the older item is the first item.
     *
     * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map}
     */
    #cache = new Map();
    maxAge;
    constructor(options) {
        this.capacity = options.capacity;
        this.maxAge = options.maxAge;
    }
    /**
     * Moves the key to the end of the cache.
     *
     * @param key the key to move
     * @param value the value of the key
     */
    #moveToEnd(key, value) {
        this.#cache.delete(key);
        this.#cache.set(key, {
            value,
            lastAccessed: Date.now(),
        });
    }
    /**
     * Add an item to the cache.
     *
     * @param key the key to upsert
     * @param value the value of the key
     */
    set(key, value) {
        this.#moveToEnd(key, value);
        this.#evict();
    }
    /**
     * Get an item from the cache.
     *
     * @param key the key to retrieve
     */
    get(key) {
        const item = this.#cache.get(key);
        if (!item)
            return;
        this.#moveToEnd(key, item.value);
        this.#evict();
        return item.value;
    }
    /**
     * Maintain the cache based on capacity and TTL.
     */
    #evict() {
        const cutoffDate = this.maxAge ? Date.now() - this.maxAge : 0;
        /**
         * Because we know Maps are in order, this item is both the
         * last item in the list (capacity) and oldest (maxAge).
         */
        let oldestItem = this.#cache.entries().next();
        while (!oldestItem.done &&
            (this.#cache.size > this.capacity || // too many
                oldestItem.value[1].lastAccessed < cutoffDate) // too old
        ) {
            this.#cache.delete(oldestItem.value[0]);
            oldestItem = this.#cache.entries().next();
        }
    }
}
exports.LRUCache = LRUCache;
// Given and object remove fields where value is undefined.
function removeUndefinedValuesInObject(object) {
    Object.entries(object).forEach(([key, value]) => {
        if (value === undefined || value === 'undefined') {
            delete object[key];
        }
    });
    return object;
}
//# sourceMappingURL=util.js.map