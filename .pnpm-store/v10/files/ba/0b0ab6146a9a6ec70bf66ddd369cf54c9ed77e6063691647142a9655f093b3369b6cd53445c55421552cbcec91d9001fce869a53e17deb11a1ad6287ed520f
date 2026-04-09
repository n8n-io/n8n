/**
 * Promise 類型工具
 * Promise Type Utilities
 *
 * 提供 Promise 相關的類型操作工具
 * Provides Promise-related type manipulation utilities
 *
 * Created by user on 2019/6/11.
 */
/**
 * 延遲物件類型：將物件的所有屬性包裝為 Promise
 * Deferred object type: wraps all properties of an object in Promise
 *
 * 保持相同的屬性名稱，但將值類型包裝為 Promise
 * Keeps the same property names, but wraps value types in Promise
 *
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html
 *
 * @example
 * interface User {
 *   id: number;
 *   name: string;
 * }
 * type DeferredUser = ITSDeferred<User>;
 * // type DeferredUser = { id: Promise<number>; name: Promise<string>; }
 */
export type ITSDeferred<T> = {
    [P in keyof T]: Promise<T[P]>;
};
/**
 * Promise 解決結果介面
 * Promise fulfilled result interface
 *
 * 表示 Promise 已成功解決
 * Represents a promise that has been successfully resolved
 *
 * @example
 * const fulfilled: ITSPromiseFulfilledResult<string> = {
 *   status: "fulfilled",
 *   value: "success"
 * };
 */
export interface ITSPromiseFulfilledResult<T> {
    /** 解決狀態 / Fulfilled status */
    status: "fulfilled";
    /** 解決值 / Resolved value */
    value: T;
    /** 永不存在的拒絕原因 / Reason that never exists */
    reason?: never;
}
/**
 * Promise 拒絕結果介面
 * Promise rejected result interface
 *
 * 表示 Promise 被拒絕
 * Represents a promise that has been rejected
 *
 * @example
 * const rejected: ITSPromiseRejectedResult<Error> = {
 *   status: "rejected",
 *   reason: new Error("failed")
 * };
 */
export interface ITSPromiseRejectedResult<E = any> {
    /** 拒絕狀態 / Rejected status */
    status: "rejected";
    /** 拒絕原因 / Rejection reason */
    reason: E;
    /** 永不存在的解決值 / Value that never exists */
    value?: never;
}
/**
 * Promise settled 結果類型：解決或拒絕結果的聯合類型
 * Promise settled result type: union of fulfilled or rejected result
 *
 * @example
 * const result: ITSPromiseSettledResult<string> = Math.random() > 0.5
 *   ? { status: "fulfilled", value: "success" }
 *   : { status: "rejected", reason: new Error("failed") };
 */
export type ITSPromiseSettledResult<T, E = any> = ITSPromiseFulfilledResult<T> | ITSPromiseRejectedResult<E>;
