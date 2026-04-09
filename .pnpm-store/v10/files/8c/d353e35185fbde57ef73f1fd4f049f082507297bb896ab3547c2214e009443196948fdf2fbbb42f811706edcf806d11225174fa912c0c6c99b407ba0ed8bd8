/**
 * 空記錄類型工具
 * Empty Record Type Utilities
 *
 * 提供空記錄類型的工具
 * Provides empty record type utilities
 *
 * @see https://juejin.cn/post/7116327095118069773
 */
/**
 * 指定鍵集合的空記錄
 * Empty record with specified key set
 *
 * 建立一個具有指定鍵集合但所有值都為 never 的記錄類型
 * Creates a record type with specified key set but all values are never
 *
 * @example
 * type EmptyByKeys = ITSEmptyRecordByKeys<'a' | 'b'>;
 * // type EmptyByKeys = { a: never; b: never; }
 */
export type ITSEmptyRecordByKeys<K extends PropertyKey> = Record<K, never>;
/**
 * 空記錄（接受任何鍵，但值都為 never）
 * Empty record (accepts any key, but values are never)
 *
 * @example
 * type Empty = ITSEmptyRecord;
 * // type Empty = Record<PropertyKey, never>
 *
 * @see https://juejin.cn/post/7116327095118069773
 */
export type ITSEmptyRecord = ITSEmptyRecordByKeys<PropertyKey>;
