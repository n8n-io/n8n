/**
 * Utility functions for managing date and time operations.
 */
/**
 * return the current time in Unix time (seconds).
 */
export declare function nowSeconds(): number;
/**
 * Converts JS Date object to seconds
 * @param date Date
 */
export declare function toSecondsFromDate(date: Date): number;
/**
 * Convert seconds to JS Date object. Seconds can be in a number or string format or undefined (will still return a date).
 * @param seconds
 */
export declare function toDateFromSeconds(seconds: number | string | undefined): Date;
/**
 * check if a token is expired based on given UTC time in seconds.
 * @param expiresOn
 */
export declare function isTokenExpired(expiresOn: string, offset: number): boolean;
/**
 * Checks if a cache entry is expired based on the last updated time and cache retention days.
 * @param lastUpdatedAt
 * @param cacheRetentionDays
 * @returns
 */
export declare function isCacheExpired(lastUpdatedAt: string, cacheRetentionDays: number): boolean;
/**
 * If the current time is earlier than the time that a token was cached at, we must discard the token
 * i.e. The system clock was turned back after acquiring the cached token
 * @param cachedAt
 * @param offset
 */
export declare function wasClockTurnedBack(cachedAt: string): boolean;
/**
 * Waits for t number of milliseconds
 * @param t number
 * @param value T
 */
export declare function delay<T>(t: number, value?: T): Promise<T | void>;
//# sourceMappingURL=TimeUtils.d.ts.map