import { DateTime, Duration, Interval } from 'luxon';

/** Sentinel returned when __prepareForTransfer encounters a lazy proxy. */
export interface ProxyResultSentinel {
	__isProxyResult: true;
	__path: string[];
}

export function isProxyResultSentinel(value: unknown): value is ProxyResultSentinel {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isProxyResult === true
	);
}

/** Type guard: plain object with Object.prototype or null prototype. */
function isPlainObject(value: object): value is Record<string, unknown> {
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * Prepare a value for transfer across the V8 isolate boundary.
 *
 * Recursively walks a value and converts types that don't survive
 * structured clone into their string representations.
 *
 * - Luxon DateTime/Duration/Interval -> ISO strings
 * - JS Date objects pass through (structured-cloneable)
 * - Plain objects and arrays are walked recursively
 *
 * This function is used on BOTH sides of the boundary:
 * - Inside the isolate: called as __prepareForTransfer before copy:true
 * - On the host: called on resolved proxy results to serialize Luxon types
 */
export function prepareForTransfer(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value !== 'object') return value;

	// Luxon DateTime -> ISO string (toISO() returns null for invalid DateTime)
	if (DateTime.isDateTime(value)) return value.toISO() ?? null;
	// Luxon Duration -> ISO string (toISO() returns null for invalid Duration)
	if (Duration.isDuration(value)) return value.toISO() ?? null;
	// Luxon Interval -> ISO string (toISO() returns "Invalid Interval" for invalid Interval)
	if (Interval.isInterval(value)) {
		const iso = value.toISO();
		return iso === 'Invalid Interval' ? null : iso;
	}

	// Array — walk elements
	if (Array.isArray(value)) return value.map(prepareForTransfer);

	// Only walk plain objects — structured-cloneable types like Date, Map, Set,
	// RegExp, Error, typed arrays survive copy:true with prototypes intact.
	if (!isPlainObject(value)) return value;

	// Plain object — walk values
	const result: Record<string, unknown> = Object.create(null);
	for (const key of Object.keys(value)) {
		result[key] = prepareForTransfer(value[key]);
	}
	return result;
}
