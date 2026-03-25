/**
 * Created by user on 2019/6/8.
 */
/**
 * Exclude from T those types that are assignable to U, and replace to R
 */
export type ITSExclude2<T, U, R = T> = T extends U ? never : R;
/**
 * Extract from T those types that are assignable to U, and replace to R
 */
export type ITSExtract2<T, U, R = T> = T extends U ? R : never;
export type ITSExtractKeyof<T, U> = Extract<keyof T, U>;
export type ITSExtractArrayLike<A, K extends Extract<keyof A, number> = Extract<keyof A, number>> = {
    [Index in K]: A[Index];
};
export type ITSKeyofArrayLike<A> = keyof ITSExtractArrayLike<A>;
export type ITSNullable<T> = T extends null | undefined ? T : never;
/**
 * 找出 T 當中 與 U 相同的 key
 */
export type ITSKeyofSame<T, U> = Extract<keyof T, keyof U>;
/**
 * 找出 T 當中 與 U 不同的 key
 */
export type ITSKeyofDiff<T, U> = Exclude<keyof T, ITSKeyofSame<T, U>>;
/**
 * 找出 T 與 U 當中同時存在的 key
 */
export type ITSKeyofBothSame<T, U> = ITSKeyofSame<T, U> | ITSKeyofSame<U, T>;
/**
 * 去除 T 與 U 當中同時存在的 key
 */
export type ITSKeyofBothDiff<T, U> = ITSKeyofDiff<T, U> | ITSKeyofDiff<U, T>;
