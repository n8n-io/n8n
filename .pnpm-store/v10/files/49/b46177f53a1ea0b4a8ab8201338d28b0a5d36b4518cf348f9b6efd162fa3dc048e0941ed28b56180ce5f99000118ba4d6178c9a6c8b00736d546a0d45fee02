/**
 * 記錄部分鍵檢測工具
 * Record Partial Key Detection Utilities
 *
 * 提供檢測物件鍵是否為可選的工具類型
 * Provides utility types for detecting if object keys are optional
 */
/**
 * 檢測鍵是否為物件的部分鍵（可選鍵）
 * Check if key is a partial key (optional key) of the record
 *
 * 如果排除指定鍵後的類型可以賦值給原始類型，則該鍵為可選鍵
 * If the type after excluding the specified key is assignable to the original type, the key is optional
 *
 * @example
 * interface User {
 *   name: string;
 *   age?: number;
 * }
 * type PartialKeys = ITSKeyIsPartialOfRecord<User, 'age'>;
 * // type PartialKeys = "age"
 *
 * @example
 * interface User {
 *   name: string;
 *   age: number;
 * }
 * type PartialKeys = ITSKeyIsPartialOfRecord<User, 'age'>;
 * // type PartialKeys = never
 */
export type ITSKeyIsPartialOfRecord<T, K extends keyof T> = Omit<T, K> extends T ? K : never;
