import { DateTime, Duration, Interval } from 'luxon';
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
	return {
		__isDateTime: true,
		__isoString: value.toISO() ?? '',
		__zone: value.zone.name,
	};
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

export function rebuildDateTime(sentinel: DateTimeSentinel): DateTime {
	if (sentinel.__isoString === undefined) {
		return DateTime.invalid(
			sentinel.__invalidReason ?? 'unknown',
			sentinel.__invalidExplanation ?? undefined,
		);
	}
	return DateTime.fromISO(sentinel.__isoString, { zone: sentinel.__zone, setZone: true });
}

export function rebuildDuration(sentinel: DurationSentinel): Duration {
	if (sentinel.__values === undefined) {
		return Duration.invalid(
			sentinel.__invalidReason ?? 'unknown',
			sentinel.__invalidExplanation ?? undefined,
		);
	}
	return Duration.fromObject(sentinel.__values);
}

export function rebuildInterval(sentinel: IntervalSentinel): Interval {
	if (sentinel.__start === undefined || sentinel.__end === undefined) {
		return Interval.invalid(
			sentinel.__invalidReason ?? 'unknown',
			sentinel.__invalidExplanation ?? undefined,
		);
	}
	return Interval.fromDateTimes(rebuildDateTime(sentinel.__start), rebuildDateTime(sentinel.__end));
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
	if (isLuxonSentinel(value)) return rebuildLuxonValue(value);
	if (isLuxonEscapedObject(value)) return unwrapPlainObject(value.__value);
	if (Array.isArray(value)) return value.map(unwrapLuxonSentinels);
	if (!isPlainObject(value)) return value;
	return unwrapPlainObject(value);
}
