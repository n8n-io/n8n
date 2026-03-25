/**
 * Simplified interface analogous to the tc39 Temporal.Duration
 * parameter to from(). This doesn't support the full gamut (years, days).
 */
export interface DurationLike {
    hours?: number;
    minutes?: number;
    seconds?: number;
    millis?: number;
}
/**
 * Simplified list of values to pass to Duration.totalOf(). This
 * list is taken from the tc39 Temporal.Duration proposal, but
 * larger and smaller units have been left off.
 */
export type TotalOfUnit = 'hour' | 'minute' | 'second' | 'millisecond';
/**
 * Duration class with an interface similar to the tc39 Temporal
 * proposal. Since it's not fully finalized, and polyfills have
 * inconsistent compatibility, for now this shim class will be
 * used to set durations in Pub/Sub.
 *
 * This class will remain here for at least the next major version,
 * eventually to be replaced by the tc39 Temporal built-in.
 *
 * https://tc39.es/proposal-temporal/docs/duration.html
 */
export declare class Duration {
    private millis;
    private static secondInMillis;
    private static minuteInMillis;
    private static hourInMillis;
    private constructor();
    /**
     * Calculates the total number of units of type 'totalOf' that would
     * fit inside this duration.
     */
    totalOf(totalOf: TotalOfUnit): number;
    /**
     * Creates a Duration from a DurationLike, which is an object
     * containing zero or more of the following: hours, seconds,
     * minutes, millis.
     */
    static from(durationLike: DurationLike): Duration;
}
