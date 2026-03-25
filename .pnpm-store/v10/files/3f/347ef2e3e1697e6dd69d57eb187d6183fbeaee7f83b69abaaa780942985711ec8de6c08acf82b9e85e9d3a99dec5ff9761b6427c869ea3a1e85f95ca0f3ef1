import { IterationOf } from '../Iteration/IterationOf';
import { Iteration } from '../Iteration/Iteration';
import { Pos } from '../Iteration/Pos';
import { Prev } from '../Iteration/Prev';
import { Next } from '../Iteration/Next';
import { _IsNegative } from './IsNegative';
import { Cast } from '../Any/Cast';
/**
 * @hidden
 */
declare type _SubPositive<N1 extends Iteration, N2 extends Iteration> = {
    0: _SubPositive<Prev<N1>, Prev<N2>>;
    1: N1;
    2: number;
}[Pos<N2> extends 0 ? 1 : number extends Pos<N2> ? 2 : 0];
/**
 * @hidden
 */
declare type SubPositive<N1 extends Iteration, N2 extends Iteration> = _SubPositive<N1, N2> extends infer X ? Cast<X, Iteration> : never;
/**
 * @hidden
 */
declare type _SubNegative<N1 extends Iteration, N2 extends Iteration> = {
    0: _SubNegative<Next<N1>, Next<N2>>;
    1: N1;
    2: number;
}[Pos<N2> extends 0 ? 1 : number extends Pos<N2> ? 2 : 0];
/**
 * @hidden
 */
declare type SubNegative<N1 extends Iteration, N2 extends Iteration> = _SubNegative<N1, N2> extends infer X ? Cast<X, Iteration> : never;
/**
 * @hidden
 */
export declare type _Sub<N1 extends Iteration, N2 extends Iteration> = {
    0: SubPositive<N1, N2>;
    1: SubNegative<N1, N2>;
}[_IsNegative<N2>];
/**
 * Subtract a [[Number]] from another one
 * @param N1 Left-hand side
 * @param N2 Right-hand side
 * @returns `string | number | boolean`
 * @example
 * ```ts
 * import {N} from 'ts-toolbelt'
 *
 * type test0 = N.Sub<'2', '10'>        // '-8'
 * type test1 = N.Sub<'0', '40'>        // '-40'
 * type test2 = N.Sub<'0', '40', 's'>   // '-40'
 * type test3 = N.Sub<'0', '40', 'n'>   //  -40
 * type test4 = N.Sub<'-20', '40', 's'> // string
 * type test5 = N.Sub<'-20', '40', 'n'> // number
 * ```
 */
export declare type Sub<N1 extends number, N2 extends number> = N1 extends unknown ? N2 extends unknown ? _Sub<IterationOf<N1>, IterationOf<N2>>[0] : never : never;
export {};
