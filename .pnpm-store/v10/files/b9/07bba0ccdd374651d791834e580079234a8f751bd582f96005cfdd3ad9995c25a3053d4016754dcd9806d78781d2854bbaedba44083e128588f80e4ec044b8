import { ITSValueOfArray } from './key-value';
/**
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html
 *
 * Add readonly and ?
 */
export type ITSReadonlyPartial<T> = {
    readonly [P in keyof T]?: T[P];
};
export type ITSWriteable<T> = ITSWriteablePick<T, keyof T>;
export type ITSWriteablePick<T, K extends keyof T = keyof T> = {
    -readonly [P in K]: T[P];
};
export type ITSReadonlyPick<T, K extends keyof T = keyof T> = {
    readonly [P in K]: T[P];
};
export type ITSWriteableWith<T, K extends keyof T = keyof T> = Omit<T, K> & ITSWriteablePick<T, K>;
export type ITSReadonlyWith<T, K extends keyof T = keyof T> = Omit<T, K> & ITSReadonlyPick<T, K>;
export type ITSReadonlyToWriteableArray<T extends readonly any[]> = Omit<T, keyof any[]> & ITSValueOfArray<T>[] & {
    -readonly [P in number | 'length']: T[P];
};
export type ITSWriteableDeep<T, K extends keyof T = keyof T> = T extends Record<any, any> ? {
    -readonly [P in K]: ITSWriteableDeep<T[P]>;
} : T;
export type ITSReadonlyDeep<T, K extends keyof T = keyof T> = T extends Record<any, any> ? {
    readonly [P in K]: ITSReadonlyDeep<T[P]>;
} : T;
