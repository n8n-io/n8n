import { Key } from '../Any/Key';
import { Head } from '../List/Head';
import { List } from '../List/List';
import { Pop } from '../List/Pop';
import { Tail } from '../List/Tail';
import { Path } from '../Object/Path';
import { UnionOf } from '../Object/UnionOf';
import { Select } from '../Union/Select';
import { Join } from '../String/Join';
import { Split } from '../String/Split';
/**
 * @ignore
 */
declare type Index = number | string;
/**
 * @ignore
 */
declare type KeyToIndex<K extends Key, SP extends List<Index>> = number extends K ? Head<SP> : K & Index;
/**
 * @ignore
 */
declare type MetaPath<O, D extends string, SP extends List<Index> = [], P extends List<Index> = []> = {
    [K in keyof O]: MetaPath<O[K], D, Tail<SP>, [...P, KeyToIndex<K, SP>]> | Join<[...P, KeyToIndex<K, SP>], D>;
};
/**
 * @ignore
 */
declare type NextPath<OP> = Select<UnionOf<Exclude<OP, string> & {}>, string>;
/**
 * @ignore
 */
declare type ExecPath<A, SP extends List<Index>, Delimiter extends string> = NextPath<Path<MetaPath<A, Delimiter, SP>, SP>>;
/**
 * @ignore
 */
declare type HintPath<A, P extends string, SP extends List<Index>, Exec extends string, D extends string> = [Exec] extends [never] ? ExecPath<A, Pop<SP>, D> : Exec | P;
/**
 * @ignore
 */
declare type _AutoPath<A, P extends string, D extends string, SP extends List<Index> = Split<P, D>> = HintPath<A, P, SP, ExecPath<A, SP, D>, D>;
/**
 * Auto-complete, validate, and query the string path of an object `O`
 * @param O to work on
 * @param P path of `O`
 * @param D (?=`'.'`) delimiter for path
 *
 * ```ts
 * declare function get<O extends object, P extends string>(
 *     object: O, path: AutoPath<O, P>
 * ): Path<O, Split<P, '.'>>
 *
 * declare const user: User
 *
 * type User = {
 *     name: string
 *     friends: User[]
 * }
 *
 * // works
 * const friendName = get(user, 'friends.40.name')
 * const friendFriendName = get(user, 'friends.40.friends.12.name')
 *
 * // errors
 * const friendNames = get(user, 'friends.40.names')
 * const friendFriendNames = get(user, 'friends.40.friends.12.names')
 * ```
 */
export declare type AutoPath<O extends any, P extends string, D extends string = '.'> = _AutoPath<O, P, D>;
export {};
