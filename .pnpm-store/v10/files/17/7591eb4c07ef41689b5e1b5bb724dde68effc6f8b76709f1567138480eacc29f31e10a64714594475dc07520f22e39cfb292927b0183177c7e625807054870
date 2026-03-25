import { Match } from '../Any/_Internal';
import { ListOf } from '../Object/ListOf';
import { Exclude as OExclude } from '../Object/Exclude';
import { ObjectOf } from './ObjectOf';
import { List } from './List';
/**
 * Exclude the entries of `L1` out of `L`
 * (If `match = 'default'`, no type checks are done)
 * @param L to remove from
 * @param L1 to remove out
 * @param match (?=`'default'`) to change precision
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Exclude<L extends List, L1 extends List, match extends Match = 'default'> = ListOf<OExclude<ObjectOf<L>, ObjectOf<L1>, match>>;
