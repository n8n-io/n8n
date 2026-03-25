/**
 * Helper functions for working with the `Map<K, V>` data type.
 *
 * @public
 */
export declare class MapExtensions {
    /**
     * Adds all the (key, value) pairs from the source map into the target map.
     * @remarks
     * This function modifies targetMap.  Any existing keys will be overwritten.
     * @param targetMap - The map that entries will be added to
     * @param sourceMap - The map containing the entries to be added
     */
    static mergeFromMap<K, V>(targetMap: Map<K, V>, sourceMap: ReadonlyMap<K, V>): void;
    /**
     * Converts a string-keyed map to an object.
     * @remarks
     * This function has the same effect as Object.fromEntries(map.entries())
     * in supported versions of Node (\>= 12.0.0).
     * @param map - The map that the object properties will be sourced from
     */
    static toObject<TValue>(map: Map<string, TValue>): {
        [key: string]: TValue;
    };
}
//# sourceMappingURL=MapExtensions.d.ts.map