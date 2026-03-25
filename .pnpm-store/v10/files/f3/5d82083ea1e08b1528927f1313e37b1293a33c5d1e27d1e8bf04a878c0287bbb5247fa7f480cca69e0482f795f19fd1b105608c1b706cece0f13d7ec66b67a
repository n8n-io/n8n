import { Key } from './_Internal';
import { Either as OEither } from '../Object/Either';
import { ObjectOf } from './ObjectOf';
import { _ListOf } from '../Object/ListOf';
import { List } from './List';
import { Boolean } from '../Boolean/_Internal';
/**
 * Split `L` into a [[Union]] with `K` keys in such a way that none of
 * the keys are ever present with one another within the different unions.
 * @param L to split
 * @param K to split with
 * @param strict (?=`1`) to force excess property checks https://github.com/microsoft/TypeScript/issues/20863
 * @returns [[List]] [[Union]]
 * @example
 * ```ts
 * ```
 */
export declare type Either<L extends List, K extends Key, strict extends Boolean = 1> = OEither<ObjectOf<L>, `${K & number}` | K, strict> extends infer OE ? OE extends unknown ? _ListOf<OE & {}> : never : never;
