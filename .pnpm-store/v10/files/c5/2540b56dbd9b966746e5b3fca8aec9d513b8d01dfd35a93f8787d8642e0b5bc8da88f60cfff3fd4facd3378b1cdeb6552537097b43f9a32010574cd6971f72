import { Key } from '../Any/Key';
import { x } from '../Any/x';
import { Replace } from '../Union/Replace';
/**
 * Update in `O` the fields of key `K` with `A`.
 * Use the [[x]] placeholder to get the current field type.
 * @param O to update
 * @param K to chose fields
 * @param A to update with
 * @returns [[Object]]
 * @example
 * ```ts
 * import {A, O} from 'ts-toolbelt'
 *
 * type User = {
 *  info: {
 *      name: string
 *      age: number
 *      payment: {}
 *  }
 *  id: number
 * }
 *
 * type test0 = Update<User, 'id' | 'info', A.x | null>
 * // {
 * //     info: {
 * //         name: string;
 * //         age: number;
 * //         payment: {};
 * //     } | null;
 * //     id: number | null;
 * // }
 * ```
 */
export declare type Update<O extends object, K extends Key, A extends any> = {
    [P in keyof O]: P extends K ? Replace<A, x, O[P]> : O[P];
} & {};
