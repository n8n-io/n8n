import { Try } from '../Any/Try';
import { Narrowable } from './_Internal';
/**
 * @hidden
 */
declare type NarrowRaw<A> = (A extends [] ? [] : never) | (A extends Narrowable ? A : never) | ({
    [K in keyof A]: A[K] extends Function ? A[K] : NarrowRaw<A[K]>;
});
/**
 * Prevent type widening on generic function parameters
 * @param A to narrow
 * @returns `A`
 * @example
 * ```ts
 * import {F} from 'ts-toolbelt'
 *
 * declare function foo<A extends any[]>(x: F.Narrow<A>): A;
 * declare function bar<A extends object>(x: F.Narrow<A>): A;
 *
 * const test0 = foo(['e', 2, true, {f: ['g', ['h']]}])
 * // `A` inferred : ['e', 2, true, {f: ['g']}]
 *
 * const test1 = bar({a: 1, b: 'c', d: ['e', 2, true, {f: ['g']}]})
 * // `A` inferred : {a: 1, b: 'c', d: ['e', 2, true, {f: ['g']}]}
 * ```
 */
declare type Narrow<A extends any> = Try<A, [], NarrowRaw<A>>;
export { Narrow };
