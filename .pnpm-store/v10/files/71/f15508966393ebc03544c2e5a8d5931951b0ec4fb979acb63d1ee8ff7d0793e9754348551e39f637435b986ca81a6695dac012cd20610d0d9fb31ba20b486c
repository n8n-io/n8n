import type { Options, Primitives } from '../types';
export type ArgumentFilterPredicate<T> = (input: T | unknown) => input is T;
export declare function filterType<T, K>(input: K, filter: ArgumentFilterPredicate<T>): K extends T ? T : undefined;
export declare function filterType<T, K>(input: K, filter: ArgumentFilterPredicate<T>, def: T): T;
export declare const filterArray: ArgumentFilterPredicate<Array<unknown>>;
export declare function filterPrimitives(input: unknown, omit?: Array<'boolean' | 'string' | 'number'>): input is Primitives;
export declare const filterNumber: ArgumentFilterPredicate<number>;
export declare const filterString: ArgumentFilterPredicate<string>;
export declare const filterStringOrStringArray: ArgumentFilterPredicate<string | string[]>;
export declare function filterPlainObject<T extends Options>(input: T | unknown): input is T;
export declare function filterFunction(input: unknown): input is (...args: unknown[]) => unknown;
export declare const filterHasLength: ArgumentFilterPredicate<{
    length: number;
}>;
