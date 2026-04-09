/** An array that is always empty and that cannot be modified */
export declare const _EmptyArray: any[];
export declare function _last<T>(arr: T[]): T;
export declare function _last<T extends Node>(arr: NodeListOf<T>): T;
export declare function _areEqual<T>(a: readonly T[] | null | undefined, b: readonly T[] | null | undefined, comparator?: (a: T, b: T) => boolean): boolean;
/**
 * Utility that uses the fastest looping approach to apply a callback to each element of the array
 * https://jsperf.app/for-for-of-for-in-foreach-comparison
 */
export declare function _forAll<T>(array: T[] | undefined, callback: (value: T) => void): void;
export declare function _removeFromArray<T>(array: T[], object: T): void;
/**
 * O(N+M) way to remove M elements from an array of size N. Better than calling _removeFromArray in a loop
 *
 * Note: this implementation removes _any_ instances of the `elementsToRemove`
 */
export declare function _removeAllFromArray<T>(array: T[], elementsToRemove: readonly T[]): void;
export declare function _moveInArray<T>(array: T[], objectsToMove: T[], toIndex: number): void;
export declare function _flatten<T>(arrays: Array<T[]>): T[];
