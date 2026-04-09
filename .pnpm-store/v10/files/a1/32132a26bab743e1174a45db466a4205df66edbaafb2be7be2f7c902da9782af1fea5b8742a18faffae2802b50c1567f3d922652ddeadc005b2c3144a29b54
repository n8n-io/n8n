/**
 * 索引簽名移除工具
 * Index Signature Removal Utilities
 *
 * 提供移除物件索引簽名的工具類型
 * Provides utility types for removing object index signatures
 */
/**
 * 移除索引簽名
 * Remove index signature
 *
 * 從物件類型中移除索引簽名，保留明確宣告的鍵
 * Removes index signature from object type, keeping explicitly declared keys
 *
 * @see https://stackoverflow.com/a/51956054/4563339
 *
 * @example
 * interface WithIndex {
 *   name: string;
 *   [key: string]: any;
 * }
 * type WithoutIndex = ITSOmitIndexSignatures<WithIndex>;
 * // type WithoutIndex = { name: string }
 */
export type ITSOmitIndexSignatures<T extends Record<any, any>> = {
    [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};
/**
 * 取得已知的鍵（排除索引簽名）
 * Get known keys (excluding index signature)
 *
 * @example
 * interface WithIndex {
 *   name: string;
 *   [key: string]: any;
 * }
 * type Keys = ITSKnownKeys<WithIndex>;
 * // type Keys = "name"
 */
export type ITSKnownKeys<T extends Record<any, any>> = keyof ITSOmitIndexSignatures<T>;
/**
 * 取得已知的鍵（另一種實現）
 * Get known keys (alternative implementation)
 *
 * @example
 * interface WithIndex {
 *   name: string;
 *   age: number;
 *   [key: string]: any;
 * }
 * type Keys = ITSKnownKeys2<WithIndex>;
 * // type Keys = "name" | "age"
 */
export type ITSKnownKeys2<T> = {
    [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends {
    [_ in keyof T]: infer U;
} ? U : never;
