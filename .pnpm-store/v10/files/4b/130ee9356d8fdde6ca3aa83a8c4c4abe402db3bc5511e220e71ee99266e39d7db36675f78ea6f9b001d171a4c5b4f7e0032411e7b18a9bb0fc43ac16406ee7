/**
 * Created by user on 2019/6/11.
 */
import type { ITSKeyofBothDiff, ITSKeyofBothSame, ITSKeyofDiff, ITSKeyofSame } from '../helper/filter';
export type { ITSRequireRecord, ITSPartialRecord } from '../type/record/partial';
/**
 * @deprecated
 */
export type ITSDiff<T extends keyof any, U extends keyof any> = ({
    [P in T]: P;
} & {
    [P in U]: never;
} & {
    [x: string]: never;
})[T];
export type ITSPickSame<T, U> = Pick<T, ITSKeyofSame<T, U>>;
export type ITSPickDiff<T, U> = Pick<T, ITSKeyofDiff<T, U>>;
/**
 * 生成一個新類型 具有 T 與 U 當中同時存在的 KEY
 */
export type ITSPickBothSame<T, U> = Pick<T & U, ITSKeyofBothSame<T, U>>;
/**
 * 生成一個新類型 不具有 T 與 U 當中同時存在的 KEY
 */
export type ITSPickBothDiff<T, U> = Pick<T & U, ITSKeyofBothDiff<T, U>>;
export type ITSPickBoth<T, U, K extends ITSKeyofBothSame<T, U> = ITSKeyofBothSame<T, U>> = Pick<T & U, K>;
/**
 * @see https://stackoverflow.com/questions/49198713/override-the-properties-of-an-interface-in-typescript
 */
export type ITSPickMember<T, K extends keyof T> = T[K];
/**
 * exclude all key in K at T
 * @deprecated
 */
export type ITSPickNot<T, K extends keyof T> = Omit<T, K>;
/**
 * @see https://stackoverflow.com/questions/49198713/override-the-properties-of-an-interface-in-typescript
 *
 * @example
 * export interface A1 { s: string;}
 * export declare type A2 = ITSOverwrite<A1, { s: number; }>;
 * export declare let a2: A2;
 */
export type ITSOverwrite<T, U> = Omit<T, keyof U> & U;
/**
 * @example
 * type Test1 = { id: number, code: string }
 * type Test2 = { id: string, code: number }
 * type Test3 = ITSMergeBoth<Test1, Test2>
 * export const x: Test3 = { id: "bob", code: "bob" }
 * @see https://github.com/microsoft/TypeScript/issues/35627
 */
export type ITSMergeBoth<T, U> = ITSPickBothDiff<T, U> & Pick<T | U, ITSKeyofBothSame<T, U>>;
/**
 * pick K and mark as Required
 */
export type ITSRequiredPick<T, K extends keyof T = keyof T> = {
    [P in K]-?: T[P];
};
/**
 * pick K and mark as Partial
 */
export type ITSPartialPick<T, K extends keyof T = keyof T> = {
    [P in K]?: T[P];
};
/**
 * clone a type and mark all RK is Required, PK is Partial
 */
export type ITSPickExtra<T, RK extends keyof T, PK extends Exclude<keyof T, RK> = Exclude<keyof T, RK>> = ITSRequiredPick<T, RK> & ITSPartialPick<T, PK>;
/**
 * clone a type and mark all RK is Required, PK is Partial
 */
export type ITSPickExtra2<T, PK extends keyof T, RK extends Exclude<keyof T, PK> = Exclude<keyof T, PK>> = ITSRequiredPick<T, RK> & ITSPartialPick<T, PK>;
export type ITSRequiredWith<T, K extends keyof T> = Omit<T, K> & ITSRequiredPick<T, K>;
export type ITSPartialWith<T, K extends keyof T> = Omit<T, K> & ITSPartialPick<T, K>;
/**
 * https://stackoverflow.com/questions/40510611/typescript-interface-require-one-of-two-properties-to-exist
 */
export type ITSRequireAtLeastOne<T, Keys extends keyof T = keyof T> = Omit<T, Keys> & {
    [K in Keys]-?: ITSRequiredPick<T, K> & ITSPartialPick<T, Exclude<Keys, K>>;
}[Keys];
/**
 * https://stackoverflow.com/questions/40510611/typescript-interface-require-one-of-two-properties-to-exist
 */
export type ITSRequireOnlyOne<T, Keys extends keyof T = keyof T> = Omit<T, Keys> & {
    [K in Keys]-?: ITSRequiredPick<T, K> & Partial<Record<Exclude<Keys, K>, never>>;
}[Keys];
