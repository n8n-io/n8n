import { FilterTarget } from '../../proto/v1/base.js';
import { ExtractCrossReferenceType, NonRefKeys, RefKeys } from '../types/internal.js';
export type Operator = 'Equal' | 'NotEqual' | 'GreaterThan' | 'GreaterThanEqual' | 'LessThan' | 'LessThanEqual' | 'Like' | 'IsNull' | 'WithinGeoRange' | 'ContainsAny' | 'ContainsAll' | 'ContainsNone' | 'And' | 'Or' | 'Not';
export type FilterValue<V = any> = {
    filters?: FilterValue[];
    operator: Operator;
    target?: FilterTarget;
    value: V;
};
export type SingleTargetRef = {
    type_: 'single';
    linkOn: string;
    target?: FilterTargetInternal;
};
export type MultiTargetRef = {
    type_: 'multi';
    linkOn: string;
    targetCollection: string;
    target?: FilterTargetInternal;
};
export type CountRef = {
    type_: 'count';
    linkOn: string;
};
export type FilterTargetInternal = SingleTargetRef | MultiTargetRef | CountRef | string;
export type TargetRefs = SingleTargetRef | MultiTargetRef;
export type GeoRangeFilter = {
    latitude: number;
    longitude: number;
    distance: number;
};
export type FilterValueType = PrimitiveFilterValueType | PrimitiveListFilterValueType;
export type PrimitiveFilterValueType = number | string | boolean | Date | GeoRangeFilter;
export type PrimitiveListFilterValueType = number[] | string[] | boolean[] | Date[];
export type ContainsValue<V> = V extends (infer U)[] ? U : V;
export interface Filter<T> {
    /**
     * Define a filter based on a property to be used when querying and deleting from a collection.
     *
     * @param {K} name The name of the property to filter on.
     * @param {boolean} [length] Whether to filter on the length of the property or not, defaults to false.
     * @returns {FilterByProperty<T[K]>} An interface exposing methods to filter on the property.
     */
    byProperty: <K extends NonRefKeys<T> & string>(name: K, length?: boolean) => FilterByProperty<T[K]>;
    /**
     * Define a filter based on a single-target reference to be used when querying and deleting from a collection.
     *
     * @param {K} linkOn The name of the property to filter on.
     * @returns {Filter<ExtractCrossReferenceType<T[K]>>} An interface exposing methods to filter on the reference.
     */
    byRef: <K extends RefKeys<T> & string>(linkOn: K) => Filter<ExtractCrossReferenceType<T[K]>>;
    /**
     * Define a filter based on a multi-target reference to be used when querying and deleting from a collection.
     *
     * @param {K} linkOn The name of the property to filter on.
     * @param {string} targetCollection The name of the target collection to filter on.
     * @returns {Filter<ExtractCrossReferenceType<T[K]>>} An interface exposing methods to filter on the reference.
     */
    byRefMultiTarget: <K extends RefKeys<T> & string>(linkOn: K, targetCollection: string) => Filter<ExtractCrossReferenceType<T[K]>>;
    /**
     * Define a filter based on the number of objects in a cross-reference to be used when querying and deleting from a collection.
     *
     * @param {K} linkOn The name of the property to filter on.
     * @returns {FilterByCount} An interface exposing methods to filter on the count.
     */
    byRefCount: <K extends RefKeys<T> & string>(linkOn: K) => FilterByCount;
    /**
     * Define a filter based on the ID to be used when querying and deleting from a collection.
     *
     * @returns {FilterById} An interface exposing methods to filter on the ID.
     */
    byId: () => FilterById;
    /**
     * Define a filter based on the creation time to be used when querying and deleting from a collection.
     *
     * @returns {FilterByTime} An interface exposing methods to filter on the creation time.
     */
    byCreationTime: () => FilterByTime;
    /**
     * Define a filter based on the update time to be used when querying and deleting from a collection.
     *
     * @returns {FilterByTime} An interface exposing methods to filter on the update time.
     */
    byUpdateTime: () => FilterByTime;
}
export interface FilterByProperty<T> {
    /**
     * Filter on whether the property is `null`.
     *
     * @param {boolean} value The value to filter on.
     * @returns {FilterValue<boolean>} The filter value.
     */
    isNull: (value: boolean) => FilterValue<boolean>;
    /**
     * Filter on whether the property contains any of the given values.
     *
     * @param {U[]} value The values to filter on.
     * @returns {FilterValue<U[]>} The filter value.
     */
    containsAny: <U extends ContainsValue<T>>(value: U[]) => FilterValue<U[]>;
    /**
     * Filter on whether the property contains all of the given values.
     *
     * @param {U[]} value The values to filter on.
     * @returns {FilterValue<U[]>} The filter value.
     */
    containsAll: <U extends ContainsValue<T>>(value: U[]) => FilterValue<U[]>;
    /**
     * Filter on whether the property contains none of the given values.
     *
     * @param {U[]} value The values to filter on.
     * @returns {FilterValue<U[]>} The filter value.
     */
    containsNone: <U extends ContainsValue<T>>(value: U[]) => FilterValue<U[]>;
    /**
     * Filter on whether the property is equal to the given value.
     *
     * @param {V} value The value to filter on.
     * @returns {FilterValue<V>} The filter value.
     */
    equal: (value: T) => FilterValue<T>;
    /**
     * Filter on whether the property is not equal to the given value.
     *
     * @param {V} value The value to filter on.
     * @returns {FilterValue<V>} The filter value.
     * */
    notEqual: (value: T) => FilterValue<T>;
    /**
     * Filter on whether the property is less than the given value.
     *
     * @param {number | Date} value The value to filter on.
     * @returns {FilterValue<number> | FilterValue<Date>} The filter value.
     */
    lessThan: <U extends number | Date>(value: U) => FilterValue<U>;
    /**
     * Filter on whether the property is less than or equal to the given value.
     *
     * @param {number | Date} value The value to filter on.
     * @returns {FilterValue<number> | FilterValue<Date>} The filter value.
     */
    lessOrEqual: <U extends number | Date>(value: U) => FilterValue<U>;
    /**
     * Filter on whether the property is greater than the given value.
     *
     * @param {number | Date} value The value to filter on.
     * @returns {FilterValue<number> | FilterValue<Date>} The filter value.
     */
    greaterThan: <U extends number | Date>(value: U) => FilterValue<U>;
    /**
     * Filter on whether the property is greater than or equal to the given value.
     *
     * @param {number | Date} value The value to filter on.
     * @returns {FilterValue<number> | FilterValue<Date>} The filter value.
     */
    greaterOrEqual: <U extends number | Date>(value: U) => FilterValue<U>;
    /**
     * Filter on whether the property is like the given value.
     *
     * This filter can make use of `*` and `?` as wildcards.
     * See [the docs](https://weaviate.io/developers/weaviate/search/filters#by-partial-matches-text) for more details.
     *
     * @param {string} value The value to filter on.
     * @returns {FilterValue<string>} The filter value.
     */
    like: (value: string) => FilterValue<string>;
    /**
     * Filter on whether the property is within a given range of a geo-coordinate.
     *
     * See [the docs](https://weaviate.io/developers/weaviate/search/filters##by-geo-coordinates) for more details.
     *
     * @param {GeoRangeFilter} value The geo-coordinate range to filter on.
     * @returns {FilterValue<GeoRangeFilter>} The filter value.
     */
    withinGeoRange: (value: GeoRangeFilter) => FilterValue<GeoRangeFilter>;
}
export interface FilterByCount {
    /**
     * Filter on whether the number of references is equal to the given integer.
     *
     * @param {number} value The value to filter on.
     * @returns {FilterValue<number>} The filter value.
     */
    equal: (value: number) => FilterValue<number>;
    /**
     * Filter on whether the number of references is not equal to the given integer.
     *
     * @param {number} value The value to filter on.
     * @returns {FilterValue<number>} The filter value.
     */
    notEqual: (value: number) => FilterValue<number>;
    /**
     * Filter on whether the number of references is less than the given integer.
     *
     * @param {number} value The value to filter on.
     * @returns {FilterValue<number>} The filter value.
     */
    lessThan: (value: number) => FilterValue<number>;
    /**
     * Filter on whether the number of references is less than or equal to the given integer.
     *
     * @param {number} value The value to filter on.
     * @returns {FilterValue<number>} The filter value.
     */
    lessOrEqual: (value: number) => FilterValue<number>;
    /**
     * Filter on whether the number of references is greater than the given integer.
     *
     * @param {number} value The value to filter on.
     * @returns {FilterValue<number>} The filter value.
     */
    greaterThan: (value: number) => FilterValue<number>;
    /**
     * Filter on whether the number of references is greater than or equal to the given integer.
     *
     * @param {number} value The value to filter on.
     * @returns {FilterValue<number>} The filter value.
     */
    greaterOrEqual: (value: number) => FilterValue<number>;
}
export interface FilterById {
    /**
     * Filter on whether the ID is equal to the given string.
     *
     * @param {string} value The value to filter on.
     * @returns {FilterValue<string>} The filter value.
     */
    equal: (value: string) => FilterValue<string>;
    /**
     * Filter on whether the ID is not equal to the given string.
     *
     * @param {string} value The value to filter on.
     * @returns {FilterValue<string>} The filter value.
     */
    notEqual: (value: string) => FilterValue<string>;
    /**
     * Filter on whether the ID is any one of the given strings.
     *
     * @param {string[]} value The values to filter on.
     * @returns {FilterValue<string[]>} The filter value.
     */
    containsAny: (value: string[]) => FilterValue<string[]>;
}
export interface FilterByTime {
    /**
     * Filter on whether the time is any one of the given strings or Dates.
     *
     * @param {(string | Date)[]} value The values to filter on.
     * @returns {FilterValue<string[]>} The filter value.
     */
    containsAny: (value: (string | Date)[]) => FilterValue<string[]>;
    /**
     * Filter on whether the time is equal to the given string or Date.
     *
     * @param {string | Date} value The value to filter on.
     * @returns {FilterValue<string>} The filter value.
     */
    equal: (value: string | Date) => FilterValue<string>;
    /**
     * Filter on whether the time is not equal to the given string or Date.
     *
     * @param {string | Date} value The value to filter on.
     * @returns {FilterValue<string>} The filter value.
     */
    notEqual: (value: string | Date) => FilterValue<string>;
    /**
     * Filter on whether the time is less than the given string or Date.
     *
     * @param {string | Date} value The value to filter on.
     * @returns {FilterValue<string>} The filter value.
     */
    lessThan: (value: string | Date) => FilterValue<string>;
    /**
     * Filter on whether the time is less than or equal to the given string or Date.
     *
     * @param {string | Date} value The value to filter on.
     * @returns {FilterValue<string>} The filter value.
     */
    lessOrEqual: (value: string | Date) => FilterValue<string>;
    /**
     * Filter on whether the time is greater than the given string or Date.
     *
     * @param {string | Date} value The value to filter on.
     * @returns {FilterValue<string>} The filter value.
     */
    greaterThan: (value: string | Date) => FilterValue<string>;
    /**
     * Filter on whether the time is greater than or equal to the given string or Date.
     *
     * @param {string | Date} value The value to filter on.
     * @returns {FilterValue<string>} The filter value.
     */
    greaterOrEqual: (value: string | Date) => FilterValue<string>;
}
