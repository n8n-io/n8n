import type { FormValue, ParsedFormValue, ValidationTargets } from '../types';
import type { UnionToIntersection } from '../utils/types';
/**
 * Checks if T is a literal union type (e.g., 'asc' | 'desc')
 * that should be preserved in input types.
 * Returns true for union literals, false for single literals or wide types.
 */
export type IsLiteralUnion<T, Base> = [Exclude<T, undefined>] extends [Base] ? [Exclude<T, undefined>] extends [UnionToIntersection<Exclude<T, undefined>>] ? false : true : false;
type IsOptionalUnion<T> = [unknown] extends [T] ? false : undefined extends T ? true : false;
type SimplifyDeep<T> = {
    [K in keyof T]: T[K];
} & {};
type InferInputInner<Output, Target extends keyof ValidationTargets, T extends FormValue> = SimplifyDeep<{
    [K in keyof Output]: IsLiteralUnion<Output[K], string> extends true ? Output[K] : IsOptionalUnion<Output[K]> extends true ? Output[K] : Target extends 'form' ? T | T[] : Target extends 'query' ? string | string[] : Target extends 'param' ? string : Target extends 'header' ? string : Target extends 'cookie' ? string : unknown;
}>;
/**
 * Utility type to infer input types for validation targets.
 * Preserves literal union types (e.g., 'asc' | 'desc') while using
 * the default ValidationTargets type for other values.
 *
 * @example
 * ```ts
 * // In @hono/zod-validator or similar:
 * type Input = InferInput<z.input<Schema>, 'query'>
 * // { orderBy: 'asc' | 'desc', page: string | string[] }
 * ```
 */
export type InferInput<Output, Target extends keyof ValidationTargets, T extends FormValue = ParsedFormValue> = [Exclude<Output, undefined>] extends [never] ? {} : [Exclude<Output, undefined>] extends [object] ? undefined extends Output ? SimplifyDeep<InferInputInner<Exclude<Output, undefined>, Target, T>> | undefined : SimplifyDeep<InferInputInner<Output, Target, T>> : {};
export {};
