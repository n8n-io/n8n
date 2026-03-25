import { Narrowable } from './_Internal';
/**
 * Force `A` to comply with `W`. `A` must be a shape of `W`. In other words, `A`
 * must extend `W` and have the same properties - no more, no less.
 * @param A
 * @param W
 */
declare type Exact<A, W> = W extends unknown ? A extends W ? A extends Narrowable ? A : {
    [K in keyof A]: K extends keyof W ? Exact<A[K], W[K]> : never;
} : W : never;
export { Exact };
