import { _Omit } from '../Object/Omit';
import { _Pick } from '../Object/Pick';
import { Length } from './Length';
import { List } from './List';
/**
 * Transform a [[List]] into an [[Object]] equivalent
 * @param L to transform
 * @returns [[Object]]
 * @example
 * ```ts
 * ```
 */
export declare type ObjectOf<O extends List> = O extends unknown ? number extends Length<O> ? _Pick<O, number> : _Omit<O, keyof any[]> : never;
