/**
 * get keys of tuple
 *
 * @example
 * ITSTupleKeys<[string, string, string]> = "0" | "1" | "2"
 * @see https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
 */
export type ITSTupleKeys<T extends any[]> = Exclude<keyof T, keyof []>;
