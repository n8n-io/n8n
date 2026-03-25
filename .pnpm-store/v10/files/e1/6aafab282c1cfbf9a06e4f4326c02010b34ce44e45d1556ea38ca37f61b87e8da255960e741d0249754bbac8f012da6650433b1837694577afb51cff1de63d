import { And } from '../Boolean/And';
import { Or } from '../Boolean/Or';
import { Extends } from '../Any/Extends';
/**
 * @hidden
 */
export declare type IsStringLiteral<A extends any> = A extends string ? string extends A ? 0 : 1 : 0;
/**
 * @hidden
 */
export declare type IsNumberLiteral<A extends any> = A extends number ? number extends A ? 0 : 1 : 0;
/**
 * Literal to restrict against
 */
export declare type Kind = string | number;
/**
 * Determine whether `A` is literal or not
 * @param A to be checked
 * @param kind (?=`'string' | 'number'`) to restrict
 * @example
 * ```ts
 * import {A} from 'ts-toolbelt'
 *
 * type test0 = A.IsLiteral<1 | 2> // 1
 * type test1 = A.IsLiteral<1 | 2, string> // 0
 * type test2 = A.IsLiteral<1 | '2', string> // 0 | 1
 * type test3 = A.IsLiteral<number> // 0
 * ```
 */
export declare type IsLiteral<A extends any, kind extends Kind = Kind> = And<Or<IsStringLiteral<A>, IsNumberLiteral<A>>, Extends<A, kind>>;
