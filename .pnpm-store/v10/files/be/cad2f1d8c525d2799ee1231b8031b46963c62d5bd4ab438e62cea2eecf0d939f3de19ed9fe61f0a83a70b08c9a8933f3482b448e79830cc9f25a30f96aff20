import { Match } from '../Any/_Internal';
import { Has as OHas } from '../Object/Has';
import { Key } from './_Internal';
import { ObjectOf } from './ObjectOf';
import { List } from './List';
/**
 * Check whether `L` has a entry of key `K` that matches `M`
 * @param L to be inspected
 * @param K to choose entry
 * @param M (?=`any`) to check entry type
 * @param match (?=`'default'`) to change precision
 * @returns [[Boolean]]
 * @example
 * ```ts
 * ```
 */
export declare type Has<L extends List, K extends Key, M extends any = any, match extends Match = 'default'> = OHas<ObjectOf<L>, `${K & number}` | K, M, match>;
