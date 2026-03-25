import { Key } from '../../Any/Key';
import { _Omit as _OOmit } from '../Omit';
import { _Omit as _LOmit } from '../../List/Omit';
import { List } from '../../List/List';
import { BuiltIn } from '../../Misc/BuiltIn';
import { Tail } from '../../List/Tail';
/**
 * @hidden
 */
declare type OmitAt<O, Path extends List<Key>> = O extends BuiltIn ? O : Path extends [Key] ? O extends List ? _LOmit<O, Path[0]> : O extends object ? _OOmit<O, Path[0]> : O : {
    [K in keyof O]: K extends Path[0] ? OmitAt<O[K], Tail<Path>> : O[K];
};
/**
 * Remove out of `O` the fields at `Path`
 * @param O to remove from
 * @param Path to be followed
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Omit<O extends object, Path extends List<Key>> = Path extends unknown ? OmitAt<O, Path> : never;
export {};
