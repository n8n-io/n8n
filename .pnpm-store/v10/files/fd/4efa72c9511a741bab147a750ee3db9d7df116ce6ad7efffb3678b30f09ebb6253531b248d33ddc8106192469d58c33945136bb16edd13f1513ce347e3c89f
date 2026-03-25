import { Cast } from '../Any/Cast';
import { OptionalPart } from '../Object/Optional';
import { Depth } from '../Object/_Internal';
import { List } from './List';
/**
 * Make `L` optional (deeply or not)
 * @param L to make optional
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Optional<L extends List, depth extends Depth = 'flat'> = Cast<OptionalPart<L, depth>, List>;
