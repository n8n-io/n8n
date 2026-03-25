import { Key } from '../../Any/Key';
import { Merge as OMerge } from '../Merge';
import { List } from '../../List/List';
import { BuiltIn } from '../../Misc/BuiltIn';
import { Tail } from '../../List/Tail';
import { Depth } from '../_Internal';
/**
 * @hidden
 */
declare type MergeAt<O, Path extends List<Key>, O1, depth extends Depth> = O extends BuiltIn ? O : Path extends [] ? O extends List ? OMerge<O, O1 & {}, depth> : O extends object ? OMerge<O, O1 & {}, depth> : O : {
    [K in keyof O]: K extends Path[0] ? MergeAt<O[K], Tail<Path>, O1, depth> : O[K];
};
/**
 * Complete the fields of `O` at `Path` with the ones of `O1`
 * @param O to complete
 * @param Path to be followed
 * @param O1 to copy from
 * @param depth (?=`'flat'`) 'deep' to do it deeply
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Merge<O extends object, Path extends List<Key>, O1 extends object, depth extends Depth = 'flat'> = Path extends unknown ? MergeAt<O, Path, O1, depth> : never;
export {};
