import { ITSReadonlyRecord } from './readonly';
import { ITSTypeAndStringLiteral } from '../../helper/string';
export type ITSEnumLike<K extends string = string, V extends string | number = string | number> = ITSReadonlyRecord<K, V> | (V extends number ? ITSNumberEnumLikeReverse<K, Exclude<V, string>> : ITSEnumLikeReverseExcludeNumber);
export type ITSStringEnumLike<K extends string = string, V extends string = string> = (ITSReadonlyRecord<K, V> | ITSStringEnumLikeReverse<K, V>) & ITSEnumLikeReverseExcludeNumber;
export type ITSNumberEnumLike<K extends string = string, V extends number = number> = ITSReadonlyRecord<K, V> | ITSNumberEnumLikeReverse<K, V>;
/**
 * @internal
 */
export type ITSStringEnumLikeReverse<K extends string = string, V extends string = string> = ITSReadonlyRecord<V, K>;
/**
 * @internal
 * @see https://github.com/microsoft/TypeScript/issues/51105
 */
export type ITSNumberEnumLikeReverse<K extends string = string, V extends number = number> = ITSReadonlyRecord<Exclude<ITSTypeAndStringLiteral<V>, K>, K>;
/**
 * @internal
 */
export type ITSEnumLikeReverseExcludeNumber = ITSReadonlyRecord<number, void | never>;
