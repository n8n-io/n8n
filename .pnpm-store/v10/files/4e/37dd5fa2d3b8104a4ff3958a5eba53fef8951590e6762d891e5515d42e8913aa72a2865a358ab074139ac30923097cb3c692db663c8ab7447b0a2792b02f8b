import { Boolean } from './_Internal';
/**
 * Logical `^` operator (behaves like the JS one)
 * @param B1 Left-hand side
 * @param B2 Right-hand side
 * @returns [[Boolean]]
 * @example
 * ```ts
 * import {B} from 'ts-toolbelt'
 *
 * type test0 = B.Xor<B.True, B.True>    // False
 * type test1 = B.Xor<B.False, B.True>   // True
 * type test2 = B.Xor<B.Boolean, B.True> // Boolean
 * ```
 */
export declare type Xor<B1 extends Boolean, B2 extends Boolean> = {
    0: {
        0: 0;
        1: 1;
    };
    1: {
        0: 1;
        1: 0;
    };
}[B1][B2];
