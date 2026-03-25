import { Filter as OFilter } from '../Object/Filter';
import { ListOf } from '../Object/ListOf';
import { Match } from '../Any/_Internal';
import { ObjectOf } from './ObjectOf';
import { List } from './List';
/**
 * Filter out of `L` the entries that match `M`
 * @param L to remove from
 * @param M to select entries
 * @param match (?=`'default'`) to change precision
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Filter<L extends List, M extends any, match extends Match = 'default'> = ListOf<OFilter<ObjectOf<L>, M, match>>;
