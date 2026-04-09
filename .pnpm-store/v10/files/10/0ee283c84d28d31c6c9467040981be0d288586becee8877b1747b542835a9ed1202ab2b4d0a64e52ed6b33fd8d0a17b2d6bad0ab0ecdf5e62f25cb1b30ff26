/**
 * 記錄唯讀類型工具
 * Record Readonly Type Utilities
 *
 * 提供唯讀和可讀寫記錄類型的工具
 * Provides readonly and writable record type utilities
 */
/**
 * 唯讀記錄類型
 * Readonly record type
 *
 * 將指定鍵集合的所有屬性設為唯讀
 * Makes all properties of the specified key set readonly
 *
 * @example
 * type ReadonlyUser = ITSReadonlyRecord<'name' | 'age', string>;
 * // type ReadonlyUser = { readonly name: string; readonly age: string; }
 */
export type ITSReadonlyRecord<K extends keyof any, T> = {
    readonly [P in K]: T;
};
/**
 * 可讀寫記錄類型
 * Writable record type
 *
 * 將指定鍵集合的所有屬性設為可讀寫（移除 readonly）
 * Makes all properties of the specified key set writable (removes readonly)
 *
 * @example
 * type WritableUser = ITSWriteableRecord<'name' | 'age', string>;
 * // type WritableUser = { name: string; age: string; }
 */
export type ITSWriteableRecord<K extends keyof any, T> = {
    -readonly [P in K]: T;
};
