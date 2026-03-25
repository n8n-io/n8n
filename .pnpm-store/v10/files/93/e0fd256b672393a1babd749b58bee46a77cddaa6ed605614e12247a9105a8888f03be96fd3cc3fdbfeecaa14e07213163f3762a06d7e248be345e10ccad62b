import { Key } from './_Internal';
import { List } from './List';
import { Update } from '../Object/Update';
import { x } from '../Any/x';
import { Cast } from '../Any/Cast';
/**
 * Make some entries of `L` nullable (deeply or not)
 * @param L to make nullable
 * @param K (?=`Key`) to choose fields
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Nullable<L extends List, K extends Key = Key> = Cast<Update<L, `${K & number}` | K, x | null | undefined>, List>;
