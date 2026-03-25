import { _Pick as _OPick } from '../Object/Pick';
import { _ListOf } from '../Object/ListOf';
import { Key } from './_Internal';
import { ObjectOf } from './ObjectOf';
import { List } from './List';
/**
 * @hidden
 */
export declare type _Pick<L extends List, K extends Key> = _ListOf<_OPick<ObjectOf<L>, `${K & number}` | K>>;
/**
 * Extract out of `L` the entries of key `K`
 * @param L to extract from
 * @param K to chose entries
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Pick<L extends List, K extends Key> = L extends unknown ? _Pick<L, K> : never;
