"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapExtensions = void 0;
/**
 * Helper functions for working with the `Map<K, V>` data type.
 *
 * @public
 */
class MapExtensions {
    /**
     * Adds all the (key, value) pairs from the source map into the target map.
     * @remarks
     * This function modifies targetMap.  Any existing keys will be overwritten.
     * @param targetMap - The map that entries will be added to
     * @param sourceMap - The map containing the entries to be added
     */
    static mergeFromMap(targetMap, sourceMap) {
        for (const pair of sourceMap.entries()) {
            targetMap.set(pair[0], pair[1]);
        }
    }
    /**
     * Converts a string-keyed map to an object.
     * @remarks
     * This function has the same effect as Object.fromEntries(map.entries())
     * in supported versions of Node (\>= 12.0.0).
     * @param map - The map that the object properties will be sourced from
     */
    static toObject(map) {
        const object = {};
        for (const [key, value] of map.entries()) {
            object[key] = value;
        }
        return object;
    }
}
exports.MapExtensions = MapExtensions;
//# sourceMappingURL=MapExtensions.js.map