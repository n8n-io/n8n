import { Observable } from '../Observable';
import { Subject } from '../Subject';
import { ObservableInput, OperatorFunction, SubjectLike } from '../types';
export interface BasicGroupByOptions<K, T> {
    element?: undefined;
    duration?: (grouped: GroupedObservable<K, T>) => ObservableInput<any>;
    connector?: () => SubjectLike<T>;
}
export interface GroupByOptionsWithElement<K, E, T> {
    element: (value: T) => E;
    duration?: (grouped: GroupedObservable<K, E>) => ObservableInput<any>;
    connector?: () => SubjectLike<E>;
}
export declare function groupBy<T, K>(key: (value: T) => K, options: BasicGroupByOptions<K, T>): OperatorFunction<T, GroupedObservable<K, T>>;
export declare function groupBy<T, K, E>(key: (value: T) => K, options: GroupByOptionsWithElement<K, E, T>): OperatorFunction<T, GroupedObservable<K, E>>;
export declare function groupBy<T, K extends T>(key: (value: T) => value is K): OperatorFunction<T, GroupedObservable<true, K> | GroupedObservable<false, Exclude<T, K>>>;
export declare function groupBy<T, K>(key: (value: T) => K): OperatorFunction<T, GroupedObservable<K, T>>;
/**
 * @deprecated use the options parameter instead.
 */
export declare function groupBy<T, K>(key: (value: T) => K, element: void, duration: (grouped: GroupedObservable<K, T>) => Observable<any>): OperatorFunction<T, GroupedObservable<K, T>>;
/**
 * @deprecated use the options parameter instead.
 */
export declare function groupBy<T, K, R>(key: (value: T) => K, element?: (value: T) => R, duration?: (grouped: GroupedObservable<K, R>) => Observable<any>): OperatorFunction<T, GroupedObservable<K, R>>;
/**
 * Groups the items emitted by an Observable according to a specified criterion,
 * and emits these grouped items as `GroupedObservables`, one
 * {@link GroupedObservable} per group.
 *
 * ![](groupBy.png)
 *
 * When the Observable emits an item, a key is computed for this item with the key function.
 *
 * If a {@link GroupedObservable} for this key exists, this {@link GroupedObservable} emits. Otherwise, a new
 * {@link GroupedObservable} for this key is created and emits.
 *
 * A {@link GroupedObservable} represents values belonging to the same group represented by a common key. The common
 * key is available as the `key` field of a {@link GroupedObservable} instance.
 *
 * The elements emitted by {@link GroupedObservable}s are by default the items emitted by the Observable, or elements
 * returned by the element function.
 *
 * ## Examples
 *
 * Group objects by `id` and return as array
 *
 * ```ts
 * import { of, groupBy, mergeMap, reduce } from 'rxjs';
 *
 * of(
 *   { id: 1, name: 'JavaScript' },
 *   { id: 2, name: 'Parcel' },
 *   { id: 2, name: 'webpack' },
 *   { id: 1, name: 'TypeScript' },
 *   { id: 3, name: 'TSLint' }
 * ).pipe(
 *   groupBy(p => p.id),
 *   mergeMap(group$ => group$.pipe(reduce((acc, cur) => [...acc, cur], [])))
 * )
 * .subscribe(p => console.log(p));
 *
 * // displays:
 * // [{ id: 1, name: 'JavaScript' }, { id: 1, name: 'TypeScript'}]
 * // [{ id: 2, name: 'Parcel' }, { id: 2, name: 'webpack'}]
 * // [{ id: 3, name: 'TSLint' }]
 * ```
 *
 * Pivot data on the `id` field
 *
 * ```ts
 * import { of, groupBy, mergeMap, reduce, map } from 'rxjs';
 *
 * of(
 *   { id: 1, name: 'JavaScript' },
 *   { id: 2, name: 'Parcel' },
 *   { id: 2, name: 'webpack' },
 *   { id: 1, name: 'TypeScript' },
 *   { id: 3, name: 'TSLint' }
 * ).pipe(
 *   groupBy(p => p.id, { element: p => p.name }),
 *   mergeMap(group$ => group$.pipe(reduce((acc, cur) => [...acc, cur], [`${ group$.key }`]))),
 *   map(arr => ({ id: parseInt(arr[0], 10), values: arr.slice(1) }))
 * )
 * .subscribe(p => console.log(p));
 *
 * // displays:
 * // { id: 1, values: [ 'JavaScript', 'TypeScript' ] }
 * // { id: 2, values: [ 'Parcel', 'webpack' ] }
 * // { id: 3, values: [ 'TSLint' ] }
 * ```
 *
 * @param key A function that extracts the key
 * for each item.
 * @param element A function that extracts the
 * return element for each item.
 * @param duration
 * A function that returns an Observable to determine how long each group should
 * exist.
 * @param connector Factory function to create an
 * intermediate Subject through which grouped elements are emitted.
 * @return A function that returns an Observable that emits GroupedObservables,
 * each of which corresponds to a unique key value and each of which emits
 * those items from the source Observable that share that key value.
 *
 * @deprecated Use the options parameter instead.
 */
export declare function groupBy<T, K, R>(key: (value: T) => K, element?: (value: T) => R, duration?: (grouped: GroupedObservable<K, R>) => Observable<any>, connector?: () => Subject<R>): OperatorFunction<T, GroupedObservable<K, R>>;
/**
 * An observable of values that is the emitted by the result of a {@link groupBy} operator,
 * contains a `key` property for the grouping.
 */
export interface GroupedObservable<K, T> extends Observable<T> {
    /**
     * The key value for the grouped notifications.
     */
    readonly key: K;
}
//# sourceMappingURL=groupBy.d.ts.map