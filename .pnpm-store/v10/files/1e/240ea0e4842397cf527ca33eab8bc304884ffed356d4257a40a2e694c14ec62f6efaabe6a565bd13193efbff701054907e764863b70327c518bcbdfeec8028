import { Cast } from '../Any/Cast';
import { Literal } from './_Internal';
/**
 * @hidden
 */
declare type _Replace<S extends string, R extends Literal, W extends Literal> = S extends `${infer BS}${R}${infer AS}` ? Replace<`${BS}${W}${AS}`, R, W> : S;
/**
 * Replace `R` with `W` in `S`
 * @param S
 * @param R
 * @param W
 */
export declare type Replace<S extends string, R extends Literal, W extends Literal> = _Replace<S, R, W> extends infer X ? Cast<X, string> : never;
export {};
