/**
 * Operations for sorting collections.
 *
 * @public
 */
export declare class Sort {
    /**
     * Compares `x` and `y` using the JavaScript `>` and `<` operators.  This function is suitable for usage as
     * the callback for `array.sort()`.
     *
     * @remarks
     *
     * The JavaScript ordering is generalized so that `undefined` \< `null` \< all other values.
     *
     * @returns -1 if `x` is smaller than `y`, 1 if `x` is greater than `y`, or 0 if the values are equal.
     *
     * @example
     *
     * ```ts
     * let array: number[] = [3, 6, 2];
     * array.sort(Sort.compareByValue);  // [2, 3, 6]
     * ```
     */
    static compareByValue(x: any, y: any): number;
    /**
     * Sorts the array according to a key which is obtained from the array elements.
     * The result is guaranteed to be a stable sort.
     *
     * @example
     *
     * ```ts
     * let array: string[] = [ 'aaa', 'bb', 'c' ];
     * Sort.sortBy(array, x => x.length);  // [ 'c', 'bb', 'aaa' ]
     * ```
     */
    static sortBy<T>(array: T[], keySelector: (element: T) => any, comparer?: (x: any, y: any) => number): void;
    /**
     * Returns true if the collection is already sorted.
     */
    static isSorted<T>(collection: Iterable<T>, comparer?: (x: any, y: any) => number): boolean;
    /**
     * Returns true if the collection is already sorted by the specified key.
     *
     * @example
     *
     * ```ts
     * let array: string[] = [ 'a', 'bb', 'ccc' ];
     * Sort.isSortedBy(array, x => x.length); // true
     * ```
     */
    static isSortedBy<T>(collection: Iterable<T>, keySelector: (element: T) => any, comparer?: (x: any, y: any) => number): boolean;
    /**
     * Sorts the entries in a Map object according to the map keys.
     * The result is guaranteed to be a stable sort.
     *
     * @example
     *
     * ```ts
     * let map: Map<string, number> = new Map<string, number>();
     * map.set('zebra', 1);
     * map.set('goose', 2);
     * map.set('aardvark', 3);
     * Sort.sortMapKeys(map);
     * console.log(JSON.stringify(Array.from(map.keys()))); // ["aardvark","goose","zebra"]
     * ```
     */
    static sortMapKeys<K, V>(map: Map<K, V>, keyComparer?: (x: K, y: K) => number): void;
    /**
     * Sorts the entries in a Set object according to the specified keys.
     * The result is guaranteed to be a stable sort.
     *
     * @example
     *
     * ```ts
     * let set: Set<string> = new Set<string>();
     * set.add('aaa');
     * set.add('bb');
     * set.add('c');
     * Sort.sortSetBy(set, x => x.length);
     * console.log(Array.from(set)); // ['c', 'bb', 'aaa']
     * ```
     */
    static sortSetBy<T>(set: Set<T>, keySelector: (element: T) => any, keyComparer?: (x: T, y: T) => number): void;
    /**
     * Sorts the entries in a Set object.  The result is guaranteed to be a stable sort.
     *
     * @example
     *
     * ```ts
     * let set: Set<string> = new Set<string>();
     * set.add('zebra');
     * set.add('goose');
     * set.add('aardvark');
     * Sort.sortSet(set);
     * console.log(Array.from(set)); // ['aardvark', 'goose', 'zebra']
     * ```
     */
    static sortSet<T>(set: Set<T>, comparer?: (x: T, y: T) => number): void;
    /**
     * Sort the keys deeply given an object or an array.
     *
     * Doesn't handle cyclic reference.
     *
     * @param object - The object to be sorted
     *
     * @example
     *
     * ```ts
     * console.log(Sort.sortKeys({ c: 3, b: 2, a: 1 })); // { a: 1, b: 2, c: 3}
     * ```
     */
    static sortKeys<T extends Partial<Record<string, unknown>> | unknown[]>(object: T): T;
}
//# sourceMappingURL=Sort.d.ts.map