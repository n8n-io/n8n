import type { GridOptions } from './entities/gridOptions';
import type { AgGridCommon } from './interfaces/iCommon';
type GridOptionKey = keyof GridOptions;
type GetPropKeys<T, U> = {
    [K in keyof T]: U extends T[K] ? K : T[K] extends U | null | undefined ? K : never;
}[keyof T];
/**
 *  Get the GridProperties that are of type `any`.
 *  Works by finding the properties that can extend a non existing string.
 *  This will only be the properties of type `any`.
 */
export type AnyGridOptions = {
    [K in keyof GridOptions]: GridOptions[K] extends 'NO_MATCH' ? K : never;
}[keyof GridOptions];
/**
 * Get all the GridOptions properties of the provided type.
 * Will also include `any` properties.
 */
type KeysLike<U> = Exclude<GetPropKeys<GridOptions, U>, undefined>;
/**
 * Get all the GridOption properties that strictly contain the provided type.
 * Does not include `any` properties.
 */
type KeysWithType<U> = Exclude<GetPropKeys<GridOptions, U>, AnyGridOptions>;
type CallbackKeys = KeysWithType<(any: AgGridCommon<any, any>) => any>;
/** All function properties excluding those explicity match the common callback interface. */
type FunctionKeys = Exclude<KeysLike<Function>, CallbackKeys>;
export declare const _NUMBER_GRID_OPTIONS: KeysWithType<number>[];
export declare const _BOOLEAN_MIXED_GRID_OPTIONS: KeysWithType<boolean>[];
export declare const _BOOLEAN_GRID_OPTIONS: KeysWithType<boolean>[];
/** @knipIgnore Used in example generation */
export declare const _FUNCTION_GRID_OPTIONS: (CallbackKeys | FunctionKeys)[];
export declare const _GET_ALL_GRID_OPTIONS: () => GridOptionKey[];
export {};
