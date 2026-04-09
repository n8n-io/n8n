/**
 * 深層映射工具
 * Deep Mapping Utilities
 *
 * 提供對物件進行深層類型轉換的工具
 * Provides utilities for deep type transformation of objects
 */
import { ITSArrayListMaybeReadonly } from '../type/base';
/**
 * 深層映射：對物件的所有屬性應用轉換 - 無法實現
 * Deep mapping: apply transformation to all properties of an object
 *
 * TypeScript 無法在類型層級將函數作為泛型參數傳遞
 * TypeScript cannot pass functions as generic parameters at type level
 *
 * @example
 * interface User { name: string; profile: { age: number; } }
 * type ReadonlyUser = ITSDeepMap<User, readonly>;
 * // { readonly name: string; readonly profile: { readonly age: number; } }
 */
/**
 * 深層映射：對物件的所有屬性應用轉換（包含陣列）- 無法實現
 * Deep mapping: apply transformation to all properties of an object (including arrays)
 *
 * TypeScript 無法在類型層級將函數作為泛型參數傳遞
 * TypeScript cannot pass functions as generic parameters at type level
 *
 * @example
 * interface Data { items: string[]; nested: { values: number[]; } }
 * type ReadonlyData = ITSDeepMapWithArrays<Data, readonly>;
 * // { readonly items: readonly string[]; readonly nested: { readonly values: readonly number[]; } }
 */
/**
 * 深層部分映射：對物件的所有屬性應用 Partial
 * Deep partial mapping: apply Partial to all properties of an object
 *
 * @example
 * interface User { name: string; profile: { age: number; } }
 * type PartialUser = ITSDeepPartial<User>;
 * // { name?: string; profile?: { age?: number; } }
 */
export type ITSDeepPartial<T> = T extends object ? T extends ITSArrayListMaybeReadonly<any> ? T : {
    [K in keyof T]?: ITSDeepPartial<T[K]>;
} : T;
/**
 * 深層必填映射：對物件的所有屬性應用 Required
 * Deep required mapping: apply Required to all properties of an object
 *
 * @example
 * interface User { name?: string; profile?: { age?: number; } }
 * type RequiredUser = ITSDeepRequired<User>;
 * // { name: string; profile: { age: number; } }
 */
export type ITSDeepRequired<T> = T extends object ? T extends ITSArrayListMaybeReadonly<any> ? T : {
    [K in keyof T]-?: ITSDeepRequired<T[K]>;
} : T;
