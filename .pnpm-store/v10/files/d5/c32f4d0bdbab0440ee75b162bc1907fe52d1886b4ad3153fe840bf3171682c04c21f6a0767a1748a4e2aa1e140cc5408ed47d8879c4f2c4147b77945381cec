/**
 * Binary search
 * @param table - the table search. must be sorted!
 * @param value - value to find
 * @param cmp
 * @private
 */
export declare function _lookup(table: number[], value: number, cmp?: (value: number) => boolean): {
    lo: number;
    hi: number;
};
export declare function _lookup<T>(table: T[], value: number, cmp: (value: number) => boolean): {
    lo: number;
    hi: number;
};
/**
 * Binary search
 * @param table - the table search. must be sorted!
 * @param key - property name for the value in each entry
 * @param value - value to find
 * @param last - lookup last index
 * @private
 */
export declare const _lookupByKey: (table: Record<string, number>[], key: string, value: number, last?: boolean) => {
    lo: number;
    hi: number;
};
/**
 * Reverse binary search
 * @param table - the table search. must be sorted!
 * @param key - property name for the value in each entry
 * @param value - value to find
 * @private
 */
export declare const _rlookupByKey: (table: Record<string, number>[], key: string, value: number) => {
    lo: number;
    hi: number;
};
/**
 * Return subset of `values` between `min` and `max` inclusive.
 * Values are assumed to be in sorted order.
 * @param values - sorted array of values
 * @param min - min value
 * @param max - max value
 */
export declare function _filterBetween(values: number[], min: number, max: number): number[];
export interface ArrayListener<T> {
    _onDataPush?(...item: T[]): void;
    _onDataPop?(): void;
    _onDataShift?(): void;
    _onDataSplice?(index: number, deleteCount: number, ...items: T[]): void;
    _onDataUnshift?(...item: T[]): void;
}
/**
 * Hooks the array methods that add or remove values ('push', pop', 'shift', 'splice',
 * 'unshift') and notify the listener AFTER the array has been altered. Listeners are
 * called on the '_onData*' callbacks (e.g. _onDataPush, etc.) with same arguments.
 */
export declare function listenArrayEvents<T>(array: T[], listener: ArrayListener<T>): void;
/**
 * Removes the given array event listener and cleanup extra attached properties (such as
 * the _chartjs stub and overridden methods) if array doesn't have any more listeners.
 */
export declare function unlistenArrayEvents<T>(array: T[], listener: ArrayListener<T>): void;
/**
 * @param items
 */
export declare function _arrayUnique<T>(items: T[]): T[];
