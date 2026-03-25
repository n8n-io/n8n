/**
 * @see https://github.com/type-challenges/type-challenges/blob/master/questions/2595-medium-pickbytype/README.md
 * @see https://github.com/type-challenges/type-challenges/issues/3814
 */
import { ITSNullPrimitive } from '../../type/base';
import { ITSValueOf } from '../key-value';
import { ITSExclude2, ITSExtract2 } from '../filter';
export type ITSKeyofByExtractType<T extends Record<keyof any, any>, U, K extends keyof T = keyof T> = K extends keyof T ? T[K] extends U ? K : never : never;
/**
 * @see https://github.com/type-challenges/type-challenges/blob/master/questions/2595-medium-pickbytype/README.md
 * @see https://github.com/type-challenges/type-challenges/issues/3814
 */
export type ITSKeyofByExcludeType<T extends Record<keyof any, any>, U, K extends keyof T = keyof T> = K extends keyof T ? T[K] extends U ? never : K : never;
/**
 * From `T`, pick a set of properties whose type are assignable to `U`.
 *
 * @example
type OmitBoolean = ITSPickByType<{
  name: string
  count: number
  isReadonly: boolean
  isEnable: boolean
}, boolean>
 *
 * @see https://github.com/type-challenges/type-challenges/blob/master/questions/2595-medium-pickbytype/README.md
 * @see https://github.com/type-challenges/type-challenges/issues/3814
 */
export type ITSPickByType<T extends Record<keyof any, any>, U, K extends keyof T = keyof T> = {
    [P in ITSKeyofByExtractType<T, U, K>]: T[P];
};
/**
 * From `T`, pick a set of properties whose type are not assignable to `U`.
 *
 * @example
type OmitBoolean = ITSOmitByType<{
  name: string
  count: number
  isReadonly: boolean
  isEnable: boolean
}, boolean>
 *
 * @see https://github.com/type-challenges/type-challenges/blob/master/questions/2595-medium-pickbytype/README.md
 * @see https://github.com/type-challenges/type-challenges/issues/3814
 */
export type ITSOmitByType<T extends Record<keyof any, any>, U, K extends keyof T = keyof T> = {
    [P in ITSKeyofByExcludeType<T, U, K>]: T[P];
};
/**
 * @internal
 */
export type ITSRecordExcludeToKey<Base, Type> = {
    [Key in keyof Base]: ITSExclude2<Base[Key], Type, Key>;
};
/**
 * @internal
 */
export type ITSRecordExtractToKey<Base, Type> = {
    [Key in keyof Base]: ITSExtract2<Base[Key], Type, Key>;
};
export type ITSKeyOfRecordExcludeToKey<Base, Type> = ITSValueOf<ITSRecordExcludeToKey<Base, Type>>;
export type ITSKeyOfRecordExtractToKey<Base, Type> = ITSValueOf<ITSRecordExtractToKey<Base, Type>>;
export type ITSPickRecordType<Base, Type> = Pick<Base, ITSKeyOfRecordExtractToKey<Base, Type>>;
export type ITSOmitRecordType<Base, Type> = Pick<Base, ITSKeyOfRecordExcludeToKey<Base, Type>>;
/**
 * @deprecated use `ITSPickByType<M, T, K>`
 */
export type ITSExtractRecord<M, T, K extends keyof M = keyof M> = ITSPickByType<M, T, K>;
export type ITSExtractRecordNoNull<M, T, K extends keyof M = keyof M> = {
    [P in K]: NonNullable<M[P]>;
};
/**
 * @deprecated use `ITSOmitByType<M, T, K>`
 */
export type ITSExcludeRecord<M, T, K extends keyof M = keyof M> = ITSOmitByType<M, T, K>;
export type ITSExcludeRecordNoNull<M, T, K extends keyof M = keyof M> = ITSOmitByType<M, ITSNullPrimitive, K>;
/**
 * @deprecated use `ITSKeyofByExtractType<T, U, K>`
 */
export type ITSExtractKeyofRecord<M, T, K extends keyof M = keyof M> = ITSKeyofByExtractType<M, T, K>;
/**
 * @deprecated use `ITSKeyofByExcludeType<M, T, K>`
 */
export type ITSExcludeKeyofRecord<M, T, K extends keyof M = keyof M> = ITSKeyofByExcludeType<M, T, K>;
