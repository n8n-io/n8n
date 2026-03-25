/**
 * Explain to TS which function parameter has priority for generic inference
 * @param A to de-prioritize
 * @returns `A`
 * @example
 * ```ts
 * import {F} from 'ts-toolbelt'
 *
 * const fn0 = <A extends any>(a0: A, a1: F.NoInfer<A>): A => {
 *  return {} as unknown as A // just for the example
 * }
 *
 * const fn1 = <A extends any>(a0: F.NoInfer<A>, a1: A): A => {
 *  return {} as unknown as A // just for the example
 * }
 *
 * const fn2 = <A extends any>(a0: F.NoInfer<A>, a1: F.NoInfer<A>): A => {
 *  return {} as unknown as A // just for the example
 * }
 *
 * const test0 = fn0('b', 'a') // error: infer priority is `a0`
 * const test1 = fn1('b', 'a') // error: infer priority is `a1`
 * const test2 = fn2('b', 'a') // works: infer priority is `a0` | `a1`
 * ```
 * @see https://stackoverflow.com/questions/56687668
 */
export declare type NoInfer<A extends any> = [
    A
][A extends any ? 0 : never];
