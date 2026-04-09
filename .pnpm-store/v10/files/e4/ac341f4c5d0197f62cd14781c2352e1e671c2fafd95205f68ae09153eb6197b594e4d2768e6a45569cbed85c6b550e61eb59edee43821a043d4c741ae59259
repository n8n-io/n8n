/**
 * Created by user on 2019/6/8.
 */
/**
 * 從 T 中排除可指派給 U 的類型，並替換為 R
 * Exclude from T those types that are assignable to U, and replace to R
 *
 * @example
 * type Test = string | number | boolean;
 * type Result = ITSExclude2<Test, string, never>; // number | boolean
 */
export type ITSExclude2<T, U, R = T> = T extends U ? never : R;
/**
 * 從 T 中提取可指派給 U 的類型，並替換為 R
 * Extract from T those types that are assignable to U, and replace to R
 *
 * @example
 * type Test = string | number | boolean;
 * type Result = ITSExtract2<Test, string, 'text'>; // 'text' | number | boolean
 */
export type ITSExtract2<T, U, R = T> = T extends U ? R : never;
/**
 * 提取 T 中屬於 U 的鍵
 * Extract keys from T that belong to U
 */
export type ITSExtractKeyof<T, U> = Extract<keyof T, U>;
/**
 * 從類陣列類型中提取指定索引的類型
 * Extract types of specified indexes from array-like type
 *
 * @example
 * type Test = [string, number, boolean];
 * type Result = ITSExtractArrayLike<Test, 0 | 2>; // [string, boolean]
 */
export type ITSExtractArrayLike<A, K extends Extract<keyof A, number> = Extract<keyof A, number>> = {
    [Index in K]: A[Index];
};
/**
 * 取得類陣列類型的所有數字索引鍵
 * Get all numeric index keys of array-like type
 */
export type ITSKeyofArrayLike<A> = keyof ITSExtractArrayLike<A>;
/**
 * 取得可為 null 或 undefined 的類型
 * Get types that can be null or undefined
 *
 * @example
 * type Test = string | number | null;
 * type Result = ITSNullable<Test>; // string | number | null
 */
export type ITSNullable<T> = T extends null | undefined ? T : never;
/**
 * 找出 T 當中與 U 相同的鍵
 * Find keys that are the same between T and U
 *
 * @example
 * type A = { a: 1; b: 2; };
 * type B = { a: 3; c: 4; };
 * type Result = ITSKeyofSame<A, B>; // 'a'
 */
export type ITSKeyofSame<T, U> = Extract<keyof T, keyof U>;
/**
 * 找出 T 當中與 U 不同的鍵
 * Find keys that are different between T and U
 *
 * @example
 * type A = { a: 1; b: 2; };
 * type B = { a: 3; c: 4; };
 * type Result = ITSKeyofDiff<A, B>; // 'b'
 */
export type ITSKeyofDiff<T, U> = Exclude<keyof T, ITSKeyofSame<T, U>>;
/**
 * 找出 T 與 U 當中同時存在的鍵
 * Find keys that exist in both T and U
 *
 * @example
 * type A = { a: 1; b: 2; };
 * type B = { a: 3; c: 4; };
 * type Result = ITSKeyofBothSame<A, B>; // 'a'
 */
export type ITSKeyofBothSame<T, U> = ITSKeyofSame<T, U> | ITSKeyofSame<U, T>;
/**
 * 去除 T 與 U 當中同時存在的鍵
 * Remove keys that exist in both T and U
 *
 * @example
 * type A = { a: 1; b: 2; };
 * type B = { a: 3; c: 4; };
 * type Result = ITSKeyofBothDiff<A, B>; // 'b' | 'c'
 */
export type ITSKeyofBothDiff<T, U> = ITSKeyofDiff<T, U> | ITSKeyofDiff<U, T>;
