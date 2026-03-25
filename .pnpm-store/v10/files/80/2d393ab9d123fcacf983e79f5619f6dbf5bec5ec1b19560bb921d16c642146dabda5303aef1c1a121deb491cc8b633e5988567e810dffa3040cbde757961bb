import { List } from './List';
/**
 * Attach `L1` at the end of `L`
 * @param L to concat with
 * @param L1 to be attached
 * @returns [[List]]
 * @example
 * ```ts
 * import {L} from 'ts-toolbelt'
 *
 * type test0 = L.Concat<[1, 2], [3, 4]> // [1, 2, 3, 4]
 * type test1 = L.Concat<[1, 2], [[3], 4]> // [1, 2, [3], 4]
 * type test2 = L.Concat<[1, 2], number[]> // [1, 2, ...number[]]
 * type test3 = L.Concat<readonly [1, 2], readonly [3]> // [1, 2, 3]
 * ```
 */
export declare type Concat<L extends List, L1 extends List> = [
    ...L,
    ...L1
];
