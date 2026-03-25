import { FilterTarget } from '../../proto/v1/base.js';
import { ExtractCrossReferenceType, NonRefKeys, RefKeys } from '../types/internal.js';
import { ContainsValue, CountRef, Filter, FilterByProperty, FilterValue, GeoRangeFilter, TargetRefs } from './types.js';
/**
 * Use this class when you want to chain filters together using logical operators.
 *
 * Since JS/TS has no native support for & and | as logical operators, you must use these methods and nest
 * the filters you want to combine.
 *
 * ANDs and ORs can be nested an arbitrary number of times.
 *
 * @example
 * ```ts
 * const filter = Filters.and(
 *   collection.filter.byProperty('name').equal('John'),
 *   collection.filter.byProperty('age').greaterThan(18),
 * );
 * ```
 */
export declare class Filters {
    /**
     * Combine filters using the logical AND operator.
     *
     * @param {FilterValue[]} filters The filters to combine.
     */
    static and(...filters: FilterValue[]): FilterValue<null>;
    /**
     * Combine filters using the logical OR operator.
     *
     * @param {FilterValue[]} filters The filters to combine.
     */
    static or(...filters: FilterValue[]): FilterValue<null>;
    /**
     * Negate a filter using the logical NOT operator.
     *
     * @param {FilterValue} filter The filter to negate.
     */
    static not(filter: FilterValue): FilterValue<null>;
}
export declare class FilterBase {
    protected target?: TargetRefs;
    protected property: string | CountRef;
    constructor(property: string | CountRef, target?: TargetRefs);
    protected targetPath(): FilterTarget;
    private resolveTargets;
}
export declare class FilterProperty<V> extends FilterBase implements FilterByProperty<V> {
    constructor(property: string, length: boolean, target?: TargetRefs);
    isNull(value: boolean): FilterValue<boolean>;
    containsAny<U extends ContainsValue<V>>(value: U[]): FilterValue<U[]>;
    containsNone<U extends ContainsValue<V>>(value: U[]): FilterValue<U[]>;
    containsAll<U extends ContainsValue<V>>(value: U[]): FilterValue<U[]>;
    equal(value: V): FilterValue<V>;
    notEqual(value: V): FilterValue<V>;
    lessThan<U extends number | Date>(value: U): FilterValue<U>;
    lessOrEqual<U extends number | Date>(value: U): FilterValue<U>;
    greaterThan<U extends number | Date>(value: U): FilterValue<U>;
    greaterOrEqual<U extends number | Date>(value: U): FilterValue<U>;
    like(value: string): FilterValue<string>;
    withinGeoRange(value: GeoRangeFilter): FilterValue<GeoRangeFilter>;
}
export declare class FilterRef<T> implements Filter<T> {
    private target;
    constructor(target: TargetRefs);
    byRef<K extends RefKeys<T> & string>(linkOn: K): Filter<ExtractCrossReferenceType<T[K]>>;
    byRefMultiTarget<K extends RefKeys<T> & string>(linkOn: K, targetCollection: string): FilterRef<ExtractCrossReferenceType<T[K]>>;
    byProperty<K extends NonRefKeys<T> & string>(name: K, length?: boolean): FilterProperty<T[K]>;
    byRefCount<K extends RefKeys<T> & string>(linkOn: K): FilterCount;
    byId(): FilterId;
    byCreationTime(): FilterCreationTime;
    byUpdateTime(): FilterUpdateTime;
}
export declare class FilterCount extends FilterBase {
    constructor(linkOn: string, target?: TargetRefs);
    equal(value: number): FilterValue<number>;
    notEqual(value: number): FilterValue<number>;
    lessThan(value: number): FilterValue<number>;
    lessOrEqual(value: number): FilterValue<number>;
    greaterThan(value: number): FilterValue<number>;
    greaterOrEqual(value: number): FilterValue<number>;
}
export declare class FilterId extends FilterBase {
    constructor(target?: TargetRefs);
    equal(value: string): FilterValue<string>;
    notEqual(value: string): FilterValue<string>;
    containsAny(value: string[]): FilterValue<string[]>;
}
export declare class FilterTime extends FilterBase {
    containsAny(value: (string | Date)[]): FilterValue<string[]>;
    equal(value: string | Date): FilterValue<string>;
    notEqual(value: string | Date): FilterValue<string>;
    lessThan(value: string | Date): FilterValue<string>;
    lessOrEqual(value: string | Date): FilterValue<string>;
    greaterThan(value: string | Date): FilterValue<string>;
    greaterOrEqual(value: string | Date): FilterValue<string>;
    private toValue;
}
export declare class FilterCreationTime extends FilterTime {
    constructor(target?: TargetRefs);
}
export declare class FilterUpdateTime extends FilterTime {
    constructor(target?: TargetRefs);
}
