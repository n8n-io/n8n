import { List } from './List';
/**
 * Add an element `A` at the end of `L`.
 * @param L to append to
 * @param A to be added to
 * @returns [[List]]
 * @example
 * ```ts
 * import {L} from 'ts-toolbelt'
 *
 * type test0 = L.Append<[1, 2, 3], 4> // [1, 2, 3, 4]
 * type test1 = L.Append<[], 'a'> // ['a']
 * type test2 = L.Append<readonly ['a', 'b'], 'c'> // ['a', 'b', 'c']
 * type test3 = L.Append<[1, 2], [3, 4]> // [1, 2, [3, 4]]
 * ```
 */
export declare type Append<L extends List, A extends any> = [
    ...L,
    A
];
