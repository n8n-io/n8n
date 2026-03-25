import { Key } from './Key';
import { List } from '../List/List';
/**
 * Get in `O` the type of a field of key `K`
 * @param O to extract from
 * @param K to extract at
 * @returns [[Any]]
 * @example
 * ```ts
 * import {O} from 'ts-toolbelt'
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
 * type test0 = O.At<User, 'id'> // number
 * ```
 */
export declare type At<A extends any, K extends Key> = A extends List ? number extends A['length'] ? K extends number | `${number}` ? A[never] | undefined : undefined : K extends keyof A ? A[K] : undefined : unknown extends A ? unknown : K extends keyof A ? A[K] : undefined;
