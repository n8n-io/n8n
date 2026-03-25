import { Key } from './_Internal';
import { List } from './List';
import { Update as OUpdate } from '../Object/Update';
import { Cast } from '../Any/Cast';
/**
 * Update in `L` the entries of key `K` with `A`.
 * Use the [[x]] placeholder to get the current field type.
 * @param L to update
 * @param K to chose fields
 * @param A to update with
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Update<L extends List, K extends Key, A extends any> = Cast<OUpdate<L, `${K & number}` | K, A>, List>;
