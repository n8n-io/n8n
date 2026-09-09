/**
 * Like `Omit`, but distributes over union members so each branch keeps its own
 * shape. Plain `Omit<A | B, K>` collapses the union into a single object type and
 * loses the discriminant correlation; `DistributiveOmit` preserves `A | B`.
 *
 * @example
 * type Event =
 *   | { kind: 'a'; value: boolean }
 *   | { kind: 'b'; value: string };
 *
 * // { kind: 'a'; value: boolean } | { kind: 'b'; value: string }
 * type WithoutKind = DistributiveOmit<Event, never>;
 */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Converts a union into an intersection of its members.
 *
 * @example
 * type Merged = UnionToIntersection<{ a: string } | { b: number }>;
 * // => { a: string } & { b: number }
 */
export type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
	x: infer I,
) => void
	? I
	: never;

/**
 * Picks one member of a union (the last one in the compiler's internal order).
 * Mainly a building block for iterating over union members.
 *
 * @example
 * type Last = LastOf<'a' | 'b'>;
 * // => 'b'
 */
export type LastOf<U> = UnionToIntersection<
	U extends unknown ? () => U : never
> extends () => infer R
	? R
	: never;

/**
 * Joins a union of string literals into a single quoted, comma-separated string literal.
 * Useful for building readable custom compile-error messages. Uses single quotes so the
 * result renders without escapes when the compiler prints it inside a double-quoted string.
 *
 * @example
 * type Keys = JoinKeys<'a' | 'b'>;
 * // => "'a', 'b'"
 */
export type JoinKeys<U extends string> = [U] extends [never]
	? ''
	: JoinKeys<Exclude<U, LastOf<U>>> extends infer TRest extends string
		? TRest extends ''
			? `'${LastOf<U> & string}'`
			: `${TRest}, '${LastOf<U> & string}'`
		: never;
