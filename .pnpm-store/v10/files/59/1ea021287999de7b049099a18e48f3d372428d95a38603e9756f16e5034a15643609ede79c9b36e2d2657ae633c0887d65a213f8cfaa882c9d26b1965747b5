/**
 * Merge two baggage headers into one.
 * - Sentry-specific entries (keys starting with "sentry-") from the new baggage take precedence
 * - Non-Sentry entries from existing baggage take precedence
 * The order of the existing baggage will be preserved, and new entries will be added to the end.
 *
 * This matches the behavior of OTEL's propagation.inject() which uses baggage.setEntry()
 * to overwrite existing entries with the same key.
 */
export declare function mergeBaggageHeaders<Existing extends string | string[] | number | undefined>(existing: Existing, baggage: string): string | undefined | Existing;
//# sourceMappingURL=baggage.d.ts.map