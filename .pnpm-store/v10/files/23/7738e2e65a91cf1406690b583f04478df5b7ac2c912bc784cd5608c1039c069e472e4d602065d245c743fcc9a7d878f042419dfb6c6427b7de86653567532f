import { Partial as OPartial } from '../Object/Partial';
import { Depth } from '../Object/_Internal';
import { Cast } from '../Any/Cast';
import { List } from './List';
/**
 * Make all fields of `O` optional (deeply or not)
 * @param L to make optional
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[List]]
 * @example
 * ```ts
 * import {O} from 'ts-toolbelt'
 *
 * type L = [1, 2, 3, [4, [5]]]
 *
 * type test0 = O.Partial<L>
 * type test1 = O.Partial<L, 'deep'>
 * ```
 */
export declare type Partial<L extends List, depth extends Depth = 'flat'> = Cast<OPartial<L, depth>, List>;
