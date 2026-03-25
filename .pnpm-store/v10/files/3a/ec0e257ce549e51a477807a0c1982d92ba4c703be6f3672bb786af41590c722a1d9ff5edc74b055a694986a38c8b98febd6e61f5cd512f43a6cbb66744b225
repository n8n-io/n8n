import { Key } from './_Internal';
import { AtLeast as OAtLeast } from '../Object/AtLeast';
import { ObjectOf } from './ObjectOf';
import { _ListOf } from '../Object/ListOf';
import { List } from './List';
import { Keys } from '../Any/Keys';
/**
 * Make that at least one of the keys `K` are required in `L` at a time.
 * @param L to make required
 * @param K (?=`keyof L`) to choose fields
 * @returns [[List]] [[Union]]
 * @example
 * ```ts
 * import {L} from 'ts-toolbelt'
 *
 * type test0 = L.AtLeast<[1, 2, 3], 0> // [1, 2 | undefined, 3 | undefined]
 * type test1 = L.AtLeast<[1, 2, 3], 0 | 1> // [1, 2 | undefined, 3 | undefined] | [1 | undefined, 2, 3 | undefined]
 * type test2 = L.AtLeast<[1, 2, 3]>
 * // | [1, 2, 3]
 * // | [1, 2 | undefined, 3 | undefined]
 * // | [1 | undefined, 2, 3 | undefined]
 * // | [1 | undefined, 2 | undefined, 3]
 * ```
 */
export declare type AtLeast<L extends List, K extends Key = Keys<L>> = OAtLeast<ObjectOf<L>, `${K & number}` | K> extends infer U ? U extends unknown ? _ListOf<U & {}> : never : never;
