import { HasPath as OHasPath } from '../Object/HasPath';
import { Match } from '../Any/_Internal';
import { Key } from '../Any/Key';
import { ObjectOf } from './ObjectOf';
import { List } from './List';
/**
 * Check whether `L` has nested entries that match `M`
 * @param L to be inspected
 * @param Path to be followed
 * @param M (?=`any`) to check entry type
 * @param match (?=`'default'`) to change precision
 * @returns [[Boolean]]
 * @example
 * ```ts
 * ```
 */
export declare type HasPath<L extends List, Path extends List<Key>, M extends any = any, match extends Match = 'default'> = OHasPath<ObjectOf<L>, Path, M, match>;
