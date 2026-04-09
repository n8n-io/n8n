"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sort = void 0;
/**
 * Operations for sorting collections.
 *
 * @public
 */
class Sort {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static compareByValue(x, y) {
        if (x === y) {
            return 0;
        }
        // Undefined is smaller than anything else
        if (x === undefined) {
            return -1;
        }
        if (y === undefined) {
            return 1;
        }
        // Null is smaller than anything except undefined
        if (x === null) {
            return -1;
        }
        if (y === null) {
            return 1;
        }
        // These comparisons always return false if either of the arguments is "undefined".
        // These comparisons return nonsense for "null" (true for "null > -1", but false for "null < 0" and "null > 0")
        if (x < y) {
            return -1;
        }
        if (x > y) {
            return 1;
        }
        return 0;
    }
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
    static sortBy(array, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keySelector, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comparer = Sort.compareByValue) {
        array.sort((x, y) => comparer(keySelector(x), keySelector(y)));
    }
    /**
     * Returns true if the collection is already sorted.
     */
    static isSorted(collection, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comparer = Sort.compareByValue) {
        let isFirst = true;
        let previous = undefined;
        for (const element of collection) {
            if (isFirst) {
                // Don't start by comparing against undefined.
                isFirst = false;
            }
            else if (comparer(previous, element) > 0) {
                return false;
            }
            previous = element;
        }
        return true;
    }
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
    static isSortedBy(collection, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keySelector, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comparer = Sort.compareByValue) {
        let isFirst = true;
        let previousKey = undefined;
        for (const element of collection) {
            const key = keySelector(element);
            if (isFirst) {
                // Don't start by comparing against undefined.
                isFirst = false;
            }
            else if (comparer(previousKey, key) > 0) {
                return false;
            }
            previousKey = key;
        }
        return true;
    }
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
    static sortMapKeys(map, keyComparer = Sort.compareByValue) {
        // Sorting a map is expensive, so first check whether it's already sorted.
        if (Sort.isSorted(map.keys(), keyComparer)) {
            return;
        }
        const pairs = Array.from(map.entries());
        Sort.sortBy(pairs, (x) => x[0], keyComparer);
        map.clear();
        for (const pair of pairs) {
            map.set(pair[0], pair[1]);
        }
    }
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
    static sortSetBy(set, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keySelector, keyComparer = Sort.compareByValue) {
        // Sorting a set is expensive, so first check whether it's already sorted.
        if (Sort.isSortedBy(set, keySelector, keyComparer)) {
            return;
        }
        const array = Array.from(set);
        array.sort((x, y) => keyComparer(keySelector(x), keySelector(y)));
        set.clear();
        for (const item of array) {
            set.add(item);
        }
    }
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
    static sortSet(set, comparer = Sort.compareByValue) {
        // Sorting a set is expensive, so first check whether it's already sorted.
        if (Sort.isSorted(set, comparer)) {
            return;
        }
        const array = Array.from(set);
        array.sort((x, y) => comparer(x, y));
        set.clear();
        for (const item of array) {
            set.add(item);
        }
    }
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
    static sortKeys(object) {
        if (!isPlainObject(object) && !Array.isArray(object)) {
            throw new TypeError(`Expected object or array`);
        }
        return Array.isArray(object) ? innerSortArray(object) : innerSortKeys(object);
    }
}
exports.Sort = Sort;
function isPlainObject(obj) {
    return obj !== null && typeof obj === 'object';
}
function innerSortArray(arr) {
    const result = [];
    for (const entry of arr) {
        if (Array.isArray(entry)) {
            result.push(innerSortArray(entry));
        }
        else if (isPlainObject(entry)) {
            result.push(innerSortKeys(entry));
        }
        else {
            result.push(entry);
        }
    }
    return result;
}
function innerSortKeys(obj) {
    const result = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        const value = obj[key];
        if (Array.isArray(value)) {
            result[key] = innerSortArray(value);
        }
        else if (isPlainObject(value)) {
            result[key] = innerSortKeys(value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
//# sourceMappingURL=Sort.js.map