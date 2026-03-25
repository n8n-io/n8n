import { Match } from '../Any/_Internal';
import { Is } from '../Any/Is';
import { At } from '../Any/At';
import { Key } from '../Any/Key';
/**
 * Check whether `O` has a field of key `K` that matches `M`
 * @param O to be inspected
 * @param K to choose field
 * @param M (?=`any`) to check field type
 * @param match (?=`'default'`) to change precision
 * @returns [[Boolean]]
 * @example
 * ```ts
 * ```
 */
export declare type Has<O extends object, K extends Key, M extends any = any, match extends Match = 'default'> = Is<At<O, K>, M, match>;
