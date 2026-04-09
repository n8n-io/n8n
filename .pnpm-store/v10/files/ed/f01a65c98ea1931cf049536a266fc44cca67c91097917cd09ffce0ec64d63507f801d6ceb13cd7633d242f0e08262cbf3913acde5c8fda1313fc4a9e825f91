/**
 * 元組類型工具
 * Tuple Type Utilities
 *
 * 提供元組相關的類型操作工具
 * Provides tuple-related type manipulation utilities
 */
/**
 * 取得元組的數字索引鍵
 * Get numeric index keys of a tuple
 *
 * 回傳元組的所有數字索引（不包括陣列方法如 length、push 等）
 * Returns all numeric indices of the tuple (excluding array methods like length, push, etc.)
 *
 * @example
 * type Keys = ITSTupleKeys<[string, string, string]>;
 * // type Keys = "0" | "1" | "2"
 *
 * @see https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
 */
export type ITSTupleKeys<T extends any[]> = Exclude<keyof T, keyof []>;
