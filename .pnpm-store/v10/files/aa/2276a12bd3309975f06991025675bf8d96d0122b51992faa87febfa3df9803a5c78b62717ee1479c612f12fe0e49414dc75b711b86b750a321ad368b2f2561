import type { ParamIndexMap, Result, Router } from '../../router';
export type HandlerData<T> = [T, ParamIndexMap][];
export type StaticMap<T> = Record<string, Result<T>>;
export type Matcher<T> = [RegExp, HandlerData<T>[], StaticMap<T>];
export type MatcherMap<T> = Record<string, Matcher<T> | null>;
export declare const emptyParam: string[];
export declare function match<R extends Router<T>, T>(this: R, method: string, path: string): Result<T>;
