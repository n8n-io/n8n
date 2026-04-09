/**
 * 記錄成員工具
 * Record Member Utilities
 *
 * 提供提取物件成員（方法）的工具類型
 * Provides utility types for extracting object members (methods)
 */
import { ITSExtractRecord } from './pick-type';
import { ITSPropertyKey } from '../../type/base';
import { ITSExtractKeyof } from '../filter';
/**
 * 過濾出所有成員是函數且鍵類型為字串或符號的屬性
 * Filter out all members that are functions and key types are string or symbol
 *
 * @example
 * class User {
 *   name: string;
 *   greet(): void;
 *   async fetch(): Promise<void>;
 * }
 * type Methods = ITSMemberMethods<User>;
 * // type Methods = { greet(): void; fetch(): Promise<void>; }
 */
export type ITSMemberMethods<T> = ITSExtractRecord<T, Function, Extract<keyof T, ITSPropertyKey>>;
/**
 * 取得物件方法的鍵
 * Get keys of object methods
 *
 * @example
 * class User {
 *   name: string;
 *   greet(): void;
 *   async fetch(): Promise<void>;
 * }
 * type MethodKeys = ITSKeyofMemberMethods<User>;
 * // type MethodKeys = "greet" | "fetch"
 */
export type ITSKeyofMemberMethods<T> = ITSExtractKeyof<ITSMemberMethods<T>, ITSPropertyKey>;
