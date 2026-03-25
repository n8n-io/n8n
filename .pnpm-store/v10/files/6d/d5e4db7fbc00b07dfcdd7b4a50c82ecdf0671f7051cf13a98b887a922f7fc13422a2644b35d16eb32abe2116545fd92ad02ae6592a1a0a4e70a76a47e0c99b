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
declare type _AddPositive<N1 extends Iteration, N2 extends Iteration> = {
    0: _AddPositive<Next<N1>, Prev<N2>>;
    1: N1;
    2: IterationOf<number>;
}[Pos<N2> extends 0 ? 1 : number extends Pos<N2> ? 2 : 0];
/**
 * @hidden
 */
declare type AddPositive<N1 extends Iteration, N2 extends Iteration> = _AddPositive<N1, N2> extends infer X ? Cast<X, Iteration> : never;
/**
 * @hidden
 */
declare type _AddNegative<N1 extends Iteration, N2 extends Iteration> = {
    0: _AddNegative<Prev<N1>, Next<N2>>;
    1: N1;
    2: number;
}[Pos<N2> extends 0 ? 1 : number extends Pos<N2> ? 2 : 0];
/**
 * @hidden
 */
declare type AddNegative<N1 extends Iteration, N2 extends Iteration> = _AddNegative<N1, N2> extends infer X ? Cast<X, Iteration> : never;
/**
 * @hidden
 */
export declare type _Add<N1 extends Iteration, N2 extends Iteration> = {
    0: AddPositive<N1, N2>;
    1: AddNegative<N1, N2>;
}[_IsNegative<N2>];
/**
 * Add a [[Number]] to another one
 * @param N1 Left-hand side
 * @param N2 Right-hand side
 * @returns `string | number | boolean`
 * @example
 * ```ts
 * import {N} from 'ts-toolbelt'
 *
 * type test0 = N.Add<'2', '10'>        // '12'
 * type test1 = N.Add<'0', '40'>        // '40'
 * type test2 = N.Add<'0', '40', 's'>   // '40'
 * type test3 = N.Add<'0', '40', 'n'>   //  40
 * type test4 = N.Add<'-20', '40', 's'> // '20'
 * type test5 = N.Add<'-20', '40', 'n'> //  20
 * ```
 */
export declare type Add<N1 extends number, N2 extends number> = N1 extends unknown ? N2 extends unknown ? _Add<IterationOf<N1>, IterationOf<N2>>[0] : never : never;
export {};
