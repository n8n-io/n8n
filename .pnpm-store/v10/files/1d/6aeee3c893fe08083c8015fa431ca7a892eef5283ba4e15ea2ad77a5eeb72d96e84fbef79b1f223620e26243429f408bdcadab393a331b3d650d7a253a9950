/**
 * Create an asynchronous operation like the original `Promise` type but this
 * one prevents promises to be wrapped within more promises (not possible).
 * @param A
 * @example
 * ```ts
 * import {A} from 'ts-toolbelt'
 *
 * type test0 = A.Promise<Promise<number>> // Promise<number>
 * type test1 = Promise<Promise<number>> // Promise<Promise<number>>
 * ```
 */
export declare type Promise<A extends any> = globalThis.Promise<A extends globalThis.Promise<infer X> ? X : A>;
