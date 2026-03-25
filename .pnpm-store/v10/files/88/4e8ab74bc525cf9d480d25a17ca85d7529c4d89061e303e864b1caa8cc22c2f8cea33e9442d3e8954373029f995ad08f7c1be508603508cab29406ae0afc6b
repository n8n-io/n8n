/**
 * Check whether `A1` is equal to `A2` or not.
 * @param A1
 * @param A2
 * @returns [[Boolean]]
 * @example
 * ```ts
 * import {A} from 'ts-toolbelt'
 *
 * type test0 = A.Equals<42 | 0, 42 | 0>                    // true
 * type test1 = A.Equals<{a: string}, {b: string}>          // false
 * type test3 = A.Equals<{a: string}, {readonly a: string}> // false
 * ```
 */
export declare type Equals<A1 extends any, A2 extends any> = (<A>() => A extends A2 ? 1 : 0) extends (<A>() => A extends A1 ? 1 : 0) ? 1 : 0;
