import { Boolean } from './_Internal';
/**
 * Logical `&&` operator (behaves like the JS one)
 * @param B1 Left-hand side
 * @param B2 Right-hand side
 * @returns [[Boolean]]
 * @example
 * ```ts
 * import {B} from 'ts-toolbelt'
 *
 * type test0 = B.And<B.True, B.False>          // False
 * type test1 = B.And<B.True, B.True>           // True
 * type test2 = B.And<B.True | B.False, B.True> // Boolean
 * ```
 */
export declare type And<B1 extends Boolean, B2 extends Boolean> = {
    0: {
        0: 0;
        1: 0;
    };
    1: {
        0: 0;
        1: 1;
    };
}[B1][B2];
