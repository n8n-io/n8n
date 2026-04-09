import { ITSArrayListMaybeReadonly } from './type/base';
import { ITSAwaitedReturnType } from './helper/promise';
/**
 * 複製當前函數的參數並返回新的值類型
 * Copy current function with Parameters and return to new value
 *
 * 不支援函數重載
 * Not support overload
 *
 * @example
 * declare function f(a: number): number
 * declare let c: ITSOverwriteReturnType<typeof f, string>;
 * // c = (a: number) => string
 */
export type ITSOverwriteReturnType<T extends (...args: any[]) => any, R extends unknown> = (...args: Parameters<T>) => R;
/**
 * 將函數包裝為返回 PromiseLike 的版本
 * Wrap function to return PromiseLike version
 */
export type ITSWrapFunctionPromiseLike<T extends (...args: any[]) => any> = (...args: Parameters<T>) => PromiseLike<ITSAwaitedReturnType<T>>;
/**
 * 將函數包裝為返回 Promise 的版本
 * Wrap function to return Promise version
 */
export type ITSWrapFunctionPromise<T extends (...args: any[]) => any> = (...args: Parameters<T>) => Promise<ITSAwaitedReturnType<T>>;
/**
 * 擴展類型檢查：從 T 中提取屬於 U 的部分
 * Extend type check: extract parts of T that belong to U
 *
 * @deprecated 已棄用 / Deprecated
 */
export type ITSExtendsOf<T, U> = Extract<T, U>;
/**
 * 取得陣列類型的數字索引鍵
 * Get numeric index keys of array type
 */
export type ITSKeyOfArray<T extends ITSArrayListMaybeReadonly<any>> = Exclude<keyof T, symbol | string>;
