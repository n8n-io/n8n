import { Match } from '../Any/_Internal';
import { Select as OSelect } from '../Object/Select';
import { ListOf } from '../Object/ListOf';
import { ObjectOf } from './ObjectOf';
import { List } from './List';
/**
 * Extract the entries of `L` that match `M`
 * @param L to extract from
 * @param M to select entries
 * @param match (?=`'default'`) to change precision
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Select<L extends List, M extends any, match extends Match = 'default'> = ListOf<OSelect<ObjectOf<L>, M, match>>;
