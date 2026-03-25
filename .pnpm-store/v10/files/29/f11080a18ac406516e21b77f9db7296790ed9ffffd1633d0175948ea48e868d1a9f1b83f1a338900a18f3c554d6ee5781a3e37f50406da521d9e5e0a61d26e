import { Match } from './_Internal';
import { Extends } from './Extends';
import { Equals } from './Equals';
import { Contains } from './Contains';
/**
 * Check whether `A` is similar to `A1` or not. In other words, it is a compact
 * type that bundles [[Equals]], [[Extends]], [[Contains]], comparison types.
 * @param A to be compared
 * @param A1 to compare to
 * @param match (?=`'default'`) to change precision
 * @returns [[Boolean]]
 * @example
 * ```ts
 * import {A} from 'ts-toolbelt'
 *
 * type test0 = A.Is<'a', 'a' | 'b', 'extends->'> // True
 * type test1 = A.Is<'a' | 'b', 'a', 'extends->'> // Boolean
 *
 * type test2 = A.Is<'a', 'a' | 'b', '<-extends'> // Boolean
 * type test3 = A.Is<'a' | 'b', 'a', '<-extends'> // True
 *
 * type test4 = A.Is<'a', 'a' | 'b', 'contains->'> // True
 * type test5 = A.Is<'a' | 'b', 'a', 'contains->'> // False
 *
 * type test6 = A.Is<'a', 'a' | 'b', '<-contains'> // False
 * type test7 = A.Is<'a' | 'b', 'a', '<-contains'> // True
 *
 * type test8 = A.Is<'a', 'a' | 'b', 'equals'>      // False
 * type test9 = A.Is<'b' |'a', 'a' | 'b', 'equals'> // True
 * ```
 */
export declare type Is<A extends any, A1 extends any, match extends Match = 'default'> = {
    'default': Extends<A, A1>;
    'contains->': Contains<A, A1>;
    'extends->': Extends<A, A1>;
    '<-contains': Contains<A1, A>;
    '<-extends': Extends<A1, A>;
    'equals': Equals<A1, A>;
}[match];
