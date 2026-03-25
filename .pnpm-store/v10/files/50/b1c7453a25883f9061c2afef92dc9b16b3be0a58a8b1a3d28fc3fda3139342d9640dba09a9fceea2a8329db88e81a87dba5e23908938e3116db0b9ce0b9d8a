import { Iterator, IsOptionalKeysOf, UpdateAt, ValueOf } from './helpers.js';
export type BuildMany<data, xs extends readonly any[]> = xs extends any ? BuildOne<data, xs> : never;
type BuildOne<data, xs extends readonly any[]> = xs extends [
    [
        infer value,
        infer path
    ],
    ...infer tail
] ? BuildOne<SetDeep<data, value, path>, tail> : data;
export type SetDeep<data, value, path> = path extends readonly [
    infer head,
    ...infer tail
] ? data extends readonly any[] ? data extends readonly [any, ...any] ? head extends number ? UpdateAt<data, Iterator<head>, SetDeep<data[head], value, tail>> : never : SetDeep<ValueOf<data>, value, tail>[] : data extends Set<infer a> ? Set<SetDeep<a, value, tail>> : data extends Map<infer k, infer v> ? Map<k, SetDeep<v, value, tail>> : head extends keyof data ? [
    IsOptionalKeysOf<data, head>,
    tail,
    undefined
] extends [true, [], value] ? {
    [k in keyof data]: k extends head ? value : data[k];
} : {
    [k in keyof data]-?: k extends head ? SetDeep<data[head], value, tail> : data[k];
} : data : value;
export {};
