import { Key } from './_Internal';
import { List } from './List';
import { Update } from '../Object/Update';
import { x } from '../Any/x';
import { Cast } from '../Any/Cast';
/**
 * Make some entries of `L` not `undefined` (deeply or not)
 * @param L to make non nullable
 * @param K (?=`Key`) to choose fields
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Undefinable<L extends List, K extends Key = Key> = Cast<Update<L, `${K & number}` | K, x | undefined>, List>;
