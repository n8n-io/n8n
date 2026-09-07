import { DateTime, Duration, Interval } from 'luxon';

import {
	dateTimeToSentinel,
	durationToSentinel,
	intervalToSentinel,
	isPlainObject,
	LUXON_SENTINEL_KEYS,
} from './luxon-transfer';

function isStructuredCloneBuiltin(value: object): boolean {
	return (
		value instanceof Date ||
		value instanceof RegExp ||
		value instanceof Map ||
		value instanceof Set ||
		value instanceof Error ||
		value instanceof Promise ||
		value instanceof ArrayBuffer ||
		value instanceof String ||
		value instanceof Number ||
		value instanceof Boolean ||
		ArrayBuffer.isView(value)
	);
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
 * A value that contains itself, directly or through its own descendants,
 * has that repeat occurrence replaced with null.
 */
export function __prepareForTransfer(value: unknown): unknown {
	return prepareValueForTransfer(value, new WeakSet<object>());
}

function prepareValueForTransfer(value: unknown, ancestors: WeakSet<object>): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value !== 'object') return value;

	if (value instanceof DateTime && DateTime.isDateTime(value)) return dateTimeToSentinel(value);
	if (value instanceof Duration && Duration.isDuration(value)) return durationToSentinel(value);
	if (value instanceof Interval && Interval.isInterval(value)) return intervalToSentinel(value);

	if (!isPlainObject(value) && isStructuredCloneBuiltin(value)) return value;

	if (ancestors.has(value)) return null;
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			return value.map((item) => prepareValueForTransfer(item, ancestors));
		}

		const result: Record<string, unknown> = {};
		let collides = false;
		for (const key of Object.keys(value)) {
			if (LUXON_SENTINEL_KEYS.includes(key)) collides = true;
			result[key] = prepareValueForTransfer(Reflect.get(value, key), ancestors);
		}
		return collides ? { __isLuxonEscaped: true, __value: result } : result;
	} finally {
		ancestors.delete(value);
	}
}
