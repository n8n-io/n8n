import { Depth } from '../Object/_Internal';
import { CompulsoryPart } from '../Object/Compulsory';
import { List } from './List';
import { Cast } from '../Any/Cast';
/**
 * Make that `L`'s fields cannot be [[Nullable]] or [[Optional]] (it's like
 * [[Required]] & [[NonNullable]] at once).
 * @param L to make compulsory
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[List]]
 * @example
 * ```ts
 *  * import {L} from 'ts-toolbelt'
 *
 * type test0 = L.Compulsory<[1, 2, 3?, 4?]> // [1, 2, 3, 4]
 * type test1 = L.Compulsory<['a', 'b' | undefined, 'c', 'd', 'e' | null]> // ['a', 'b', 'c', 'd', 'e']
 * ```
 */
export declare type Compulsory<L extends List, depth extends Depth = 'flat'> = Cast<CompulsoryPart<L, depth>, List>;
