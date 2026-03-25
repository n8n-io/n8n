import { Merge as OMerge } from '../Object/Merge';
import { List } from './List';
import { Depth } from '../Object/_Internal';
import { BuiltIn } from '../Misc/BuiltIn';
import { Cast } from '../Any/Cast';
/**
 * Accurately merge the fields of `L` with the ones of `L1`. It is
 * equivalent to the spread operator in JavaScript. [[Union]]s and [[Optional]]
 * fields will be handled gracefully.
 *
 * (⚠️ needs `--strictNullChecks` enabled)
 * @param L to complete
 * @param L1 to copy from
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @param ignore (?=`BuiltIn`) types not to merge
 * @param fill (?=`undefined`) types of `O` to be replaced with ones of `O1`
 * @returns [[List]]
 * @example
 * ```ts
 * ```
 */
export declare type Merge<L extends List, L1 extends List, depth extends Depth = 'flat', ignore extends object = BuiltIn, fill extends any = undefined> = Cast<OMerge<L, L1, depth, ignore, fill>, List>;
