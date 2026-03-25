/**
 * Ask TS to re-check that `A1` extends `A2`.
 * And if it fails, `A2` will be enforced anyway.
 * Can also be used to add constraints on parameters.
 * @param A1 to check against
 * @param A2 to cast to
 * @returns `A1 | A2`
 * @example
 * ```ts
 * import {A} from 'ts-toolbelt'
 *
 * type test0 = A.Cast<'42', string> // '42'
 * type test1 = A.Cast<'42', number> // number
 * ```
 */
export declare type Cast<A1 extends any, A2 extends any> = A1 extends A2 ? A1 : A2;
