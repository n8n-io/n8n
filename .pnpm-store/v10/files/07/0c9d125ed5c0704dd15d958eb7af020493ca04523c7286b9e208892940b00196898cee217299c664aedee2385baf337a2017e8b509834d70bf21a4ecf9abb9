/**
 * 記錄部分類型工具
 * Record Partial Type Utilities
 *
 * 提供可選和必填記錄類型的工具
 * Provides optional and required record type utilities
 */
/**
 * 可選的記錄類型
 * Optional record type
 *
 * 類似 Partial，但使用指定的鍵集合
 * Similar to Partial, but uses a specified key set
 *
 * @example
 * type PartialUser = ITSPartialRecord<'name' | 'age', string>;
 * // type PartialUser = { name?: string; age?: string; }
 */
export type ITSPartialRecord<K extends keyof any, T> = {
    [P in K]?: T;
};
/**
 * 必填的記錄類型
 * Required record type
 *
 * 類似 Required，但使用指定的鍵集合
 * Similar to Required, but uses a specified key set
 *
 * @example
 * type RequiredUser = ITSRequireRecord<'name' | 'age', string>;
 * // type RequiredUser = { name: string; age: string; }
 */
export type ITSRequireRecord<K extends keyof any, T> = {
    [P in K]-?: T;
};
