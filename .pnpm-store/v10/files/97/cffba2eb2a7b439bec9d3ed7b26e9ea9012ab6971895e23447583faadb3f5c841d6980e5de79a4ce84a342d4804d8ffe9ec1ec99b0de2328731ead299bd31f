import { ITSAnyFunction } from '../type/base';
export type ITSAwaitedLazy<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;
export type ITSAwaitedReturnType<T extends ITSAnyFunction> = ITSAwaitedLazy<ReturnType<T>>;
