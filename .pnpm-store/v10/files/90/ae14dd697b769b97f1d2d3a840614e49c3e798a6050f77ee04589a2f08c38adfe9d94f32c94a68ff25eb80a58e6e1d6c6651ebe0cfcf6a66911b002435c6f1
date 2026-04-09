/**
 * 記錄（Record）類型操作工具
 * Record Type Manipulation Utilities
 *
 * 提供物件類型選擇、覆寫、合併等操作
 * Provides object type selection, overwrite, merge and other operations
 *
 * Created by user on 2019/6/11.
 */
import type { ITSKeyofBothDiff, ITSKeyofBothSame, ITSKeyofDiff, ITSKeyofSame } from '../helper/filter';
export type { ITSRequireRecord, ITSPartialRecord } from '../type/record/partial';
/**
 * 取得兩個鍵集合的差異（已棄用）
 * Get the difference between two key sets (deprecated)
 *
 * @deprecated 請使用 ITSKeyofDiff 取代 / Please use ITSKeyofDiff instead
 */
export type ITSDiff<T extends keyof any, U extends keyof any> = ({
    [P in T]: P;
} & {
    [P in U]: never;
} & {
    [x: string]: never;
})[T];
/**
 * 選擇 T 中與 U 相同的鍵
 * Pick keys from T that are the same as U
 *
 * @example
 * type A = { a: 1; b: 2; };
 * type B = { a: 3; c: 4; };
 * type Result = ITSPickSame<A, B>;
 * // type Result = { a: 1 }
 */
export type ITSPickSame<T, U> = Pick<T, ITSKeyofSame<T, U>>;
/**
 * 選擇 T 中與 U 不同的鍵
 * Pick keys from T that are different from U
 *
 * @example
 * type A = { a: 1; b: 2; };
 * type B = { a: 3; c: 4; };
 * type Result = ITSPickDiff<A, B>;
 * // type Result = { b: 2 }
 */
export type ITSPickDiff<T, U> = Pick<T, ITSKeyofDiff<T, U>>;
/**
 * 選擇 T 與 U 中同時存在的鍵
 * Pick keys that exist in both T and U
 *
 * @example
 * type A = { a: 1; b: 2; };
 * type B = { a: 3; c: 4; };
 * type Result = ITSPickBothSame<A, B>;
 * // type Result = { a: 1 }
 */
export type ITSPickBothSame<T, U> = Pick<T & U, ITSKeyofBothSame<T, U>>;
/**
 * 選擇 T 與 U 中不同時存在的鍵
 * Pick keys that do not exist in both T and U
 *
 * @example
 * type A = { a: 1; b: 2; };
 * type B = { a: 3; c: 4; };
 * type Result = ITSPickBothDiff<A, B>;
 * // type Result = { b: 2; c: 4 }
 */
export type ITSPickBothDiff<T, U> = Pick<T & U, ITSKeyofBothDiff<T, U>>;
/**
 * 選擇指定鍵集合 K（必須是 T 與 U 中同時存在的鍵）
 * Pick a specified key set K (must be keys that exist in both T and U)
 */
export type ITSPickBoth<T, U, K extends ITSKeyofBothSame<T, U> = ITSKeyofBothSame<T, U>> = Pick<T & U, K>;
/**
 * 取得物件成員的類型
 * Get the type of an object member
 *
 * @see https://stackoverflow.com/questions/49198713/override-the-properties-of-an-interface-in-typescript
 */
export type ITSPickMember<T, K extends keyof T> = T[K];
/**
 * 排除指定鍵（已棄用）
 * Exclude specified keys (deprecated)
 *
 * @deprecated 請使用 Omit 取代 / Please use Omit instead
 */
export type ITSPickNot<T, K extends keyof T> = Omit<T, K>;
/**
 * 覆寫物件類型的屬性
 * Overwrite properties of an object type
 *
 * 用 U 中的屬性覆寫 T 中的同名屬性
 * Overwrites properties in T with the same name from U
 *
 * @see https://stackoverflow.com/questions/49198713/override-the-properties-of-an-interface-in-typescript
 *
 * @example
 * interface A1 { s: string }
 * type A2 = ITSOverwrite<A1, { s: number }>;
 * // type A2 = { s: number }
 */
export type ITSOverwrite<T, U> = Omit<T, keyof U> & U;
/**
 * 合併兩個物件類型，處理衝突屬性
 * Merge two object types, handling conflicting properties
 *
 * 對於 T 與 U 中同時存在的鍵，取兩者的聯集類型
 * For keys that exist in both T and U, takes the union type of both
 *
 * @example
 * type Test1 = { id: number, code: string }
 * type Test2 = { id: string, code: number }
 * type Test3 = ITSMergeBoth<Test1, Test2>
 * // type Test3 = { id: string | number; code: string | number }
 * @see https://github.com/microsoft/TypeScript/issues/35627
 */
export type ITSMergeBoth<T, U> = ITSPickBothDiff<T, U> & Pick<T | U, ITSKeyofBothSame<T, U>>;
/**
 * 選擇指定鍵並設為必填
 * Pick specified keys and mark as Required
 *
 * @example
 * interface User { name?: string; age?: number; email?: string; }
 * type RequiredName = ITSRequiredPick<User, 'name'>;
 * // type RequiredName = { name: string; age?: number; email?: string; }
 */
export type ITSRequiredPick<T, K extends keyof T = keyof T> = {
    [P in K]-?: T[P];
};
/**
 * 選擇指定鍵並設為可選
 * Pick specified keys and mark as Partial
 *
 * @example
 * interface User { name: string; age: number; email: string; }
 * type PartialName = ITSPartialPick<User, 'name'>;
 * // type PartialName = { name?: string; age: number; email: string; }
 */
export type ITSPartialPick<T, K extends keyof T = keyof T> = {
    [P in K]?: T[P];
};
/**
 * 複製類型並將指定鍵RK設為必填，其他鍵Pk設為可選
 * Clone a type and mark specified keys as Required, other keys as Partial
 *
 * @example
 * interface User { name: string; age: number; email: string; }
 * type Result = ITSPickExtra<User, 'name', 'email'>;
 * // type Result = { name: string; } & { age?: number; email?: string; }
 */
export type ITSPickExtra<T, RK extends keyof T, PK extends Exclude<keyof T, RK> = Exclude<keyof T, RK>> = ITSRequiredPick<T, RK> & ITSPartialPick<T, PK>;
/**
 * 複製類型並將指定鍵Pk設為可選，其他鍵Rk設為必填（與 ITSPickExtra 相反）
 * Clone a type and mark specified keys as Partial, other keys as Required (opposite of ITSPickExtra)
 *
 * @example
 * interface User { name: string; age: number; email: string; }
 * type Result = ITSPickExtra2<User, 'name', 'email'>;
 * // type Result = { name?: string; } & { age: number; email: string; }
 */
export type ITSPickExtra2<T, PK extends keyof T, RK extends Exclude<keyof T, PK> = Exclude<keyof T, PK>> = ITSRequiredPick<T, RK> & ITSPartialPick<T, PK>;
/**
 * 保留指定鍵為必填，其他鍵不變
 * Keep specified keys as Required, other keys unchanged
 *
 * @example
 * interface User { name: string; age: number; email: string; }
 * type Result = ITSRequiredWith<User, 'name'>;
 * // type Result = { name: string; age: number; email: string; }
 */
export type ITSRequiredWith<T, K extends keyof T> = Omit<T, K> & ITSRequiredPick<T, K>;
/**
 * 保留指定鍵為可選，其他鍵不變
 * Keep specified keys as Partial, other keys unchanged
 *
 * @example
 * interface User { name: string; age: number; email: string; }
 * type Result = ITSPartialWith<User, 'name'>;
 * // type Result = { name?: string; age: number; email: string; }
 */
export type ITSPartialWith<T, K extends keyof T> = Omit<T, K> & ITSPartialPick<T, K>;
/**
 * 確保物件至少具有指定的鍵集合中的一個
 * Ensure the object has at least one of the specified key sets
 *
 * @see https://stackoverflow.com/questions/40510611/typescript-interface-require-one-of-two-properties-to-exist
 *
 * @example
 * interface User { name?: string; age?: number; }
 * type AtLeastOne = ITSRequireAtLeastOne<User, 'name' | 'age'>;
 * // 需要至少提供 name 或 age 其中一個
 */
export type ITSRequireAtLeastOne<T, Keys extends keyof T = keyof T> = Omit<T, Keys> & {
    [K in Keys]-?: ITSRequiredPick<T, K> & ITSPartialPick<T, Exclude<Keys, K>>;
}[Keys];
/**
 * 確保物件只能具有指定的鍵集合中的其中一個（互斥）
 * Ensure the object can only have exactly one of the specified key sets (mutually exclusive)
 *
 * @see https://stackoverflow.com/questions/40510611/typescript-interface-require-one-of-two-properties-to-exist
 * @see {@link ITSPickOne} 另一種實現方式，使用 `void` 作為其餘鍵的類型
 *
 * @example
 * interface User { name?: string; age?: number; }
 * type OnlyOne1 = ITSRequireOnlyOne<User, 'name' | 'age'>;
 * // 輸出結果：
 * // type OnlyOne1 = { name: string; age?: never; } | { age: number; name?: never; }
 * // 只能提供 name 或 age 其中一個，不能同時提供
 */
export type ITSRequireOnlyOne<T, Keys extends keyof T = keyof T> = Omit<T, Keys> & {
    [K in Keys]-?: ITSRequiredPick<T, K> & Partial<Record<Exclude<Keys, K>, never>>;
}[Keys];
