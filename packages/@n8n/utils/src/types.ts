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
