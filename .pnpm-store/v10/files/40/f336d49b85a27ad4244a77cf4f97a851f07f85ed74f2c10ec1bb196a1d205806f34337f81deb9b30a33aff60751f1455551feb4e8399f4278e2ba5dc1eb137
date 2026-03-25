/**
 * Created by user on 2019/6/11.
 */
/**
 * Same property names, but make the value a promise instead of a concrete one
 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html
 */
export type ITSDeferred<T> = {
    [P in keyof T]: Promise<T[P]>;
};
export interface ITSPromiseFulfilledResult<T> {
    status: "fulfilled";
    value: T;
    reason?: never;
}
export interface ITSPromiseRejectedResult<E = any> {
    status: "rejected";
    reason: E;
    value?: never;
}
export type ITSPromiseSettledResult<T, E = any> = ITSPromiseFulfilledResult<T> | ITSPromiseRejectedResult<E>;
