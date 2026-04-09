import { ITSAnyFunction } from '../type/base';
/**
 * 解析類型：遞迴解析 PromiseLike 類型
 * Awaited type: recursively resolve PromiseLike types
 */
export type ITSAwaitedLazy<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;
/**
 * 取得函數返回值的解析類型
 * Get the awaited return type of a function
 */
export type ITSAwaitedReturnType<T extends ITSAnyFunction> = ITSAwaitedLazy<ReturnType<T>>;
