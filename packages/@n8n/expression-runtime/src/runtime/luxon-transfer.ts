import { DateTime, Duration, IANAZone, Interval } from 'luxon';
import type { DurationLikeObject } from 'luxon';

export interface InvalidLuxonSentinel {
	__invalidReason?: string;
	__invalidExplanation?: string | null;
}

export interface DateTimeSentinel extends InvalidLuxonSentinel {
	__isDateTime: true;
	__isoString?: string;
	__zone?: string;
}

export interface DurationSentinel extends InvalidLuxonSentinel {
	__isDuration: true;
	__values?: DurationLikeObject;
}

export interface IntervalSentinel extends InvalidLuxonSentinel {
	__isInterval: true;
	__start?: DateTimeSentinel;
	__end?: DateTimeSentinel;
}

export interface LuxonEscapedObject {
	__isLuxonEscaped: true;
	__value: Record<string, unknown>;
}

export const LUXON_SENTINEL_KEYS = [
	'__isDateTime',
	'__isDuration',
	'__isInterval',
	'__isLuxonEscaped',
];

function marker(value: unknown, key: string): unknown {
	if (typeof value !== 'object' || value === null) return undefined;
	return Reflect.get(value, key);
}

export function isDateTimeSentinel(value: unknown): value is DateTimeSentinel {
	return marker(value, '__isDateTime') === true;
}

export function isDurationSentinel(value: unknown): value is DurationSentinel {
	return marker(value, '__isDuration') === true;
}

export function isIntervalSentinel(value: unknown): value is IntervalSentinel {
	return marker(value, '__isInterval') === true;
}

export function isLuxonEscapedObject(value: unknown): value is LuxonEscapedObject {
	return marker(value, '__isLuxonEscaped') === true;
}

export function isLuxonSentinel(
	value: unknown,
): value is DateTimeSentinel | DurationSentinel | IntervalSentinel {
	return isDateTimeSentinel(value) || isDurationSentinel(value) || isIntervalSentinel(value);
}

export function dateTimeToSentinel(value: DateTime): DateTimeSentinel {
	if (!value.isValid) {
		return {
			__isDateTime: true,
			__invalidReason: value.invalidReason ?? 'unknown',
			__invalidExplanation: value.invalidExplanation,
		};
	}
	const sentinel: DateTimeSentinel = {
		__isDateTime: true,
		__isoString: value.toISO() ?? '',
	};
	if (value.zone.type !== 'system') sentinel.__zone = value.zone.name;
	return sentinel;
}

export function durationToSentinel(value: Duration): DurationSentinel {
	if (!value.isValid) {
		return {
			__isDuration: true,
			__invalidReason: value.invalidReason ?? 'unknown',
			__invalidExplanation: value.invalidExplanation,
		};
	}
	return { __isDuration: true, __values: value.toObject() };
}

export function intervalToSentinel(value: Interval): IntervalSentinel {
	if (!value.isValid || value.start === null || value.end === null) {
		return {
			__isInterval: true,
			__invalidReason: value.invalidReason ?? 'unknown',
			__invalidExplanation: value.invalidExplanation,
		};
	}
	return {
		__isInterval: true,
		__start: dateTimeToSentinel(value.start),
		__end: dateTimeToSentinel(value.end),
	};
}

const DURATION_UNIT_KEYS = new Set([
	'year',
	'years',
	'quarter',
	'quarters',
	'month',
	'months',
	'week',
	'weeks',
	'day',
	'days',
	'hour',
	'hours',
	'minute',
	'minutes',
	'second',
	'seconds',
	'millisecond',
	'milliseconds',
]);

const FIXED_OFFSET_ZONE_NAME = /^(?:utc|gmt)(?:[+-]\d{1,2}(?::\d{2})?)?$/i;

function invalidArguments(sentinel: InvalidLuxonSentinel): [string, string | undefined] {
	const reason =
		typeof sentinel.__invalidReason === 'string' && sentinel.__invalidReason.length > 0
			? sentinel.__invalidReason
			: 'unknown';
	const explanation =
		typeof sentinel.__invalidExplanation === 'string' ? sentinel.__invalidExplanation : undefined;
	return [reason, explanation];
}

function acceptedZoneName(zone: unknown): string | undefined {
	if (typeof zone !== 'string' || zone.length === 0) return undefined;
	const lowered = zone.toLowerCase();
	if (lowered === 'local' || lowered === 'system' || lowered === 'default') return undefined;
	if (FIXED_OFFSET_ZONE_NAME.test(zone)) return zone;
	return IANAZone.isValidZone(zone) ? zone : undefined;
}

function isDurationValues(value: unknown): value is DurationLikeObject {
	if (typeof value !== 'object' || value === null || !isPlainObject(value)) return false;
	return Object.entries(value).every(
		([key, amount]) =>
			DURATION_UNIT_KEYS.has(key) && typeof amount === 'number' && Number.isFinite(amount),
	);
}

export function rebuildDateTime(sentinel: DateTimeSentinel): DateTime {
	const isoString: unknown = sentinel.__isoString;
	if (typeof isoString !== 'string') {
		return DateTime.invalid(...invalidArguments(sentinel));
	}
	const zone = acceptedZoneName(sentinel.__zone);
	return zone === undefined ? DateTime.fromISO(isoString) : DateTime.fromISO(isoString, { zone });
}

export function rebuildDuration(sentinel: DurationSentinel): Duration {
	const values: unknown = sentinel.__values;
	if (!isDurationValues(values)) {
		return Duration.invalid(...invalidArguments(sentinel));
	}
	return Duration.fromObject(values);
}

export function rebuildInterval(sentinel: IntervalSentinel): Interval {
	const start: unknown = sentinel.__start;
	const end: unknown = sentinel.__end;
	if (!isDateTimeSentinel(start) || !isDateTimeSentinel(end)) {
		return Interval.invalid(...invalidArguments(sentinel));
	}
	return Interval.fromDateTimes(rebuildDateTime(start), rebuildDateTime(end));
}

export function rebuildLuxonValue(
	sentinel: DateTimeSentinel | DurationSentinel | IntervalSentinel,
): DateTime | Duration | Interval {
	if (isDateTimeSentinel(sentinel)) return rebuildDateTime(sentinel);
	if (isDurationSentinel(sentinel)) return rebuildDuration(sentinel);
	return rebuildInterval(sentinel);
}

/** Type guard: plain object with Object.prototype or null prototype. */
export function isPlainObject(value: object): value is Record<string, unknown> {
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

function unwrapPlainObject(value: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const key of Object.keys(value)) {
		result[key] = unwrapLuxonSentinels(value[key]);
	}
	return result;
}

/**
 * Rebuild luxon instances from the sentinels `__prepareForTransfer` emits.
 *
 * Walks the same shapes that function walks: a top-level value, arrays, and
 * plain objects. Other structured-cloneable types are returned untouched.
 */
export function unwrapLuxonSentinels(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.map(unwrapLuxonSentinels);
	if (!isPlainObject(value)) return value;
	if (isLuxonSentinel(value)) return rebuildLuxonValue(value);
	if (isLuxonEscapedObject(value)) {
		const inner: unknown = value.__value;
		if (typeof inner !== 'object' || inner === null || !isPlainObject(inner)) return inner;
		return unwrapPlainObject(inner);
	}
	return unwrapPlainObject(value);
}
