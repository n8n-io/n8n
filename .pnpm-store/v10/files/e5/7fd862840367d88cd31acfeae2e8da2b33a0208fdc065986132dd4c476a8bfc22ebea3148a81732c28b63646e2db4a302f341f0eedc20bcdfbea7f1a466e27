/**
 * detect if T is a union
 */
export type IsAUnion<T, Y = true, N = false, U = T> = U extends any ? ([T] extends [U] ? N : Y) : never;
/**
 * detect if T is a single string literal
 */
export type IsASingleStringLiteral<T extends string, Y = true, N = false> = string extends T ? N : [T] extends [never] ? N : IsAUnion<T, N, Y>;
