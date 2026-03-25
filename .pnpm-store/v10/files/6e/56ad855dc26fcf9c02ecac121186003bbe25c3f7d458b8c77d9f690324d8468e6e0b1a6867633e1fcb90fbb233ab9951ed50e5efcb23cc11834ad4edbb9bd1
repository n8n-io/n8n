import { Key } from '../../Any/Key';
import { _Pick as _OPick } from '../Pick';
import { List } from '../../List/List';
import { Tail } from '../../List/Tail';
import { BuiltIn } from '../../Misc/BuiltIn';
import { _ListOf } from '../ListOf';
/**
 * @hidden
 */
declare type PickAt<O, Path extends List<Key>> = [
] extends Path ? O : O extends BuiltIn ? O : O extends List ? _ListOf<{
    [K in keyof _OPick<O, Path[0]>]: PickAt<O[K], Tail<Path>>;
}> : O extends object ? {
    [K in keyof _OPick<O, Path[0]>]: PickAt<O[K], Tail<Path>>;
} : O;
/**
 * Extract out of `O` the fields at `Path`
 * @param O to extract from
 * @param Path to be followed
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type Pick<O extends object, Path extends List<Key>> = Path extends unknown ? PickAt<O, Path> : never;
export {};
