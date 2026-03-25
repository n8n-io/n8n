import { Extends } from './Extends';
/**
 * Check whether `A1` is part of `A2` or not. It works like
 * [[Extends]] but [[Boolean]] results are narrowed to [[False]].
 * @param A1
 * @param A2
 * @returns [[Boolean]]
 * @example
 * ```ts
 * type test0 = A.Contains<'a' | 'b', 'b'> // False
 * type test1 = A.Contains<'a', 'a' | 'b'> // True
 *
 * type test2 = A.Contains<{a: string}, {a: string, b: number}> // False
 * type test3 = A.Contains<{a: string, b: number}, {a: string}> // True
 *
 * type test4 = A.Contains<never, never> // False
 * /// Nothing cannot contain nothing, use `A.Equals`
 * ```
 */
export declare type Contains<A1 extends any, A2 extends any> = Extends<A1, A2> extends 1 ? 1 : 0;
