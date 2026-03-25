import { Key } from '../../Any/Key';
import { Update as OUpdate } from '../Update';
import { Update as LUpdate } from '../../List/Update';
import { List } from '../../List/List';
import { BuiltIn } from '../../Misc/BuiltIn';
import { Tail } from '../../List/Tail';
/**
 * @hidden
 */
declare type UpdateAt<O, Path extends List<Key>, A> = O extends BuiltIn ? O : Path extends [Key] ? O extends List ? LUpdate<O, Path[0], A> : O extends object ? OUpdate<O, Path[0], A> : O : {
    [K in keyof O]: K extends Path[0] ? UpdateAt<O[K], Tail<Path>, A> : O[K];
};
/**
 * Update in `O` the fields at `Path` with `A`
 * @param O to update
 * @param Path to be followed
 * @param A to update with
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Update<O extends object, Path extends List<Key>, A extends any> = Path extends unknown ? UpdateAt<O, Path, A> : never;
export {};
