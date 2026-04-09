import { ITSValueOfArray } from './key-value';
/**
 * 將類型的所有屬性設為唯讀且可選
 * Make all properties of a type readonly and optional
 *
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html
 * @example
 * interface User {
 *   name: string;
 *   age: number;
 * }
 * type ReadonlyPartialUser = ITSReadonlyPartial<User>;
 * // { readonly name?: string; readonly age?: number; }
 */
export type ITSReadonlyPartial<T> = {
    readonly [P in keyof T]?: T[P];
};
/**
 * 將類型的所有屬性設為可讀寫
 * Make all properties of a type writable
 *
 * @example
 * interface User {
 *   readonly name: string;
 *   readonly age: number;
 * }
 * type WritableUser = ITSWriteable<User>;
 * // { name: string; age: number; }
 */
export type ITSWriteable<T> = ITSWriteablePick<T, keyof T>;
/**
 * 將指定屬性設為可讀寫
 * Make specified properties writable
 *
 * @example
 * interface User {
 *   readonly name: string;
 *   readonly age: number;
 *   readonly email: string;
 * }
 * type PartialWritable = ITSWriteablePick<User, 'name' | 'age'>;
 * // { name: string; age: number; readonly email?: string; }
 */
export type ITSWriteablePick<T, K extends keyof T = keyof T> = {
    -readonly [P in K]: T[P];
};
/**
 * 將指定屬性設為唯讀
 * Make specified properties readonly
 *
 * @example
 * interface User {
 *   name: string;
 *   age: number;
 * }
 * type ReadonlyPartial = ITSReadonlyPick<User, 'name'>;
 * // { readonly name: string; age?: number; }
 */
export type ITSReadonlyPick<T, K extends keyof T = keyof T> = {
    readonly [P in K]: T[P];
};
/**
 * 保留指定屬性可讀寫，其他屬性不變
 * Keep specified properties writable, other properties unchanged
 *
 * @example
 * interface User {
 *   readonly name: string;
 *   readonly age: number;
 *   email: string;
 * }
 * type Result = ITSWriteableWith<User, 'email'>;
 * // { name: readonly string; age: readonly number; email: string; }
 */
export type ITSWriteableWith<T, K extends keyof T = keyof T> = Omit<T, K> & ITSWriteablePick<T, K>;
/**
 * 保留指定屬性唯讀，其他屬性不變
 * Keep specified properties readonly, other properties unchanged
 *
 * @example
 * interface User {
 *   name: string;
 *   age: number;
 *   email: string;
 * }
 * type Result = ITSReadonlyWith<User, 'name' | 'age'>;
 * // { readonly name: string; readonly age: number; email: string; }
 */
export type ITSReadonlyWith<T, K extends keyof T = keyof T> = Omit<T, K> & ITSReadonlyPick<T, K>;
/**
 * 將唯讀陣列轉換為可讀寫陣列
 * Convert readonly array to writable array
 *
 * @example
 * type ReadonlyArray = readonly [1, 2, 3];
 * type WritableArray = ITSReadonlyToWriteableArray<ReadonlyArray>;
 * // [1, 2, 3]
 */
export type ITSReadonlyToWriteableArray<T extends readonly any[]> = Omit<T, keyof any[]> & ITSValueOfArray<T>[] & {
    -readonly [P in number | 'length']: T[P];
};
/**
 * 深層移除唯讀修飾符
 * Deeply remove readonly modifier
 *
 * @example
 * interface Nested {
 *   readonly user: {
 *     readonly name: string;
 *     readonly profile: {
 *       readonly age: number;
 *     };
 *   };
 * }
 * type WritableNested = ITSWriteableDeep<Nested>;
 * // { user: { name: string; profile: { age: number; } } }
 */
export type ITSWriteableDeep<T, K extends keyof T = keyof T> = T extends Record<any, any> ? {
    -readonly [P in K]: ITSWriteableDeep<T[P]>;
} : T;
/**
 * 深層添加唯讀修飾符
 * Deeply add readonly modifier
 *
 * @example
 * interface Nested {
 *   user: {
 *     name: string;
 *     profile: {
 *       age: number;
 *     };
 *   };
 * }
 * type ReadonlyNested = ITSReadonlyDeep<Nested>;
 * // { readonly user: { readonly name: string; readonly profile: { readonly age: number; } } }
 */
export type ITSReadonlyDeep<T, K extends keyof T = keyof T> = T extends Record<any, any> ? {
    readonly [P in K]: ITSReadonlyDeep<T[P]>;
} : T;
