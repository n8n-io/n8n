/**
 * Get the result type of a `Promise`
 * @param P A promise
 * @returns [[Any]]
 * @example
 * ```ts
 * import {C} from 'ts-toolbelt'
 *
 * const promise = new Promise<string>((res, rej) => res('x'))
 *
 * type test0 = C.Await<typeof promise>  // string
 * type test1 = C.Await<Promise<number>> // number
 * ```
 */
export declare type Await<P extends any> = P extends Promise<infer A> ? A : P;
