import { Curry } from './Curry';
/**
 * Undoes the work that was done by [[Curry]]
 * @param F to uncurry
 * @returns [[Function]]
 * @example
 * ```ts
 * import {F} from 'ts-toolbelt'
 *
 * type test0 = F.Curry<(a: string, b: number) => boolean>
 * declare const foo: test0
 * const res0 = foo('a') // F.Curry<(b: number) => boolean> & ((b: number) => boolean)
 *
 * type test1 = F.UnCurry<test0> // (a: string, b: number) => boolean
 * declare const bar: test1
 * const res1 = bar('a') // TS2554: Expected 2 arguments, but got 1.
 * ```
 * @ignore
 */
export declare type UnCurry<F extends Curry<any>> = F extends Curry<infer UF> ? UF : never;
