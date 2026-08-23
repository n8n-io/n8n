import { DateTime, Duration, Interval } from 'luxon';

/** Type guard: plain object with Object.prototype or null prototype. */
function isPlainObject(value: object): value is Record<string, unknown> {
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * Prepare a value for transfer across the V8 isolate boundary.
 *
 * isolated-vm's `copy: true` uses structured clone, which strips prototypes
 * from non-standard types. Luxon DateTime/Duration/Interval lose their class
 * identity and arrive on the host as plain objects.
 *
 * This function recursively walks a value and converts types that don't
 * survive structured clone into their string representations. It runs
 * inside the isolate before the result is transferred.
 *
 * Note: JS Date objects survive structured clone with prototype intact
 * (Date is a standard structured-cloneable type) and are not converted.
 *
 * Circular references are not handled — expression results should not
 * contain cycles.
 */
export function __prepareForTransfer(value: unknown): unknown {
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
	if (Array.isArray(value)) return value.map(__prepareForTransfer);

	// Only walk plain objects — structured-cloneable types like Date, Map, Set,
	// RegExp, Error, typed arrays survive copy:true with prototypes intact.
	if (!isPlainObject(value)) return value;

	// Plain object — walk values
	const result: Record<string, unknown> = {};
	for (const key of Object.keys(value)) {
		result[key] = __prepareForTransfer(value[key]);
	}
	return result;
}
