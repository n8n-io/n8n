import { Depth } from '../Object/_Internal';
import { ReadonlyPart } from '../Object/Readonly';
import { List } from './List';
import { Cast } from '../Any/Cast';
/**
 * Make `L` readonly (deeply or not)
 * @param L to make readonly
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Readonly<L extends List, depth extends Depth = 'flat'> = Cast<ReadonlyPart<L, depth>, List>;
