/**
 * Carry luxon values across the runtime boundary.
 *
 * A luxon DateTime, Duration or Interval is a class instance, and structured
 * clone does not carry the prototype of one. Each goes across as a marker
 * object in the framing `transfer.ts` defines, and the host rebuilds a real
 * instance from it.
 */

import { DateTime, Duration, IANAZone, Interval } from 'luxon';
import type { DurationLikeObject } from 'luxon';

import type { SentinelDecoder, SentinelEncoder, TransferSentinel } from './transfer';
import {
	isPlainObject,
	transferTypeOf,
	TRANSFER_TYPE_KEY,
	unwrapTransferSentinels,
} from './transfer';

export const DATE_TIME_TYPE = 'DateTime';
export const DURATION_TYPE = 'Duration';
export const INTERVAL_TYPE = 'Interval';

export interface InvalidLuxonSentinel {
	__invalidReason?: string;
	__invalidExplanation?: string | null;
}

export interface DateTimeSentinel extends TransferSentinel, InvalidLuxonSentinel {
	[TRANSFER_TYPE_KEY]: typeof DATE_TIME_TYPE;
	__isoString?: string;
	__zone?: string;
}

export interface DurationSentinel extends TransferSentinel, InvalidLuxonSentinel {
	[TRANSFER_TYPE_KEY]: typeof DURATION_TYPE;
	__values?: DurationLikeObject;
}

export interface IntervalSentinel extends TransferSentinel, InvalidLuxonSentinel {
	[TRANSFER_TYPE_KEY]: typeof INTERVAL_TYPE;
	__start?: DateTimeSentinel;
	__end?: DateTimeSentinel;
}

export type LuxonSentinel = DateTimeSentinel | DurationSentinel | IntervalSentinel;

export function isDateTimeSentinel(value: unknown): value is DateTimeSentinel {
	return transferTypeOf(value) === DATE_TIME_TYPE;
}

export function isDurationSentinel(value: unknown): value is DurationSentinel {
	return transferTypeOf(value) === DURATION_TYPE;
}

export function isIntervalSentinel(value: unknown): value is IntervalSentinel {
	return transferTypeOf(value) === INTERVAL_TYPE;
}

export function isLuxonSentinel(value: unknown): value is LuxonSentinel {
	return isDateTimeSentinel(value) || isDurationSentinel(value) || isIntervalSentinel(value);
}

export function dateTimeToSentinel(value: DateTime): DateTimeSentinel {
	if (!value.isValid) {
		return {
			[TRANSFER_TYPE_KEY]: DATE_TIME_TYPE,
			__invalidReason: value.invalidReason ?? 'unknown',
			__invalidExplanation: value.invalidExplanation,
		};
	}
	const sentinel: DateTimeSentinel = {
		[TRANSFER_TYPE_KEY]: DATE_TIME_TYPE,
		__isoString: value.toISO() ?? '',
	};
	// Carry a zone name only when the value does not use the system zone. The
	// host then keeps its own system zone for such a value.
	if (value.zone.type !== 'system') sentinel.__zone = value.zone.name;
	return sentinel;
}

export function durationToSentinel(value: Duration): DurationSentinel {
	if (!value.isValid) {
		return {
			[TRANSFER_TYPE_KEY]: DURATION_TYPE,
			__invalidReason: value.invalidReason ?? 'unknown',
			__invalidExplanation: value.invalidExplanation,
		};
	}
	return { [TRANSFER_TYPE_KEY]: DURATION_TYPE, __values: value.toObject() };
}

export function intervalToSentinel(value: Interval): IntervalSentinel {
	if (!value.isValid || value.start === null || value.end === null) {
		return {
			[TRANSFER_TYPE_KEY]: INTERVAL_TYPE,
			__invalidReason: value.invalidReason ?? 'unknown',
			__invalidExplanation: value.invalidExplanation,
		};
	}
	return {
		[TRANSFER_TYPE_KEY]: INTERVAL_TYPE,
		__start: dateTimeToSentinel(value.start),
		__end: dateTimeToSentinel(value.end),
	};
}

// The host rebuilds from fields that came across the boundary, and user data
// can hold the same fields. The checks below run before any field reaches
// luxon. A field that does not pass gives an invalid instance.
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

// Luxon resolves a fixed offset only in the "UTC" spelling, such as "UTC+1".
// It does not resolve an offset written against GMT, such as "GMT+2", and no
// zone database holds that name either. Bare "GMT" is a zone database name, so
// it passes the IANA check below.
const FIXED_OFFSET_ZONE_NAME = /^utc(?:[+-]\d{1,2}(?::\d{2})?)?$/i;

function invalidArguments(sentinel: InvalidLuxonSentinel): [string, string | undefined] {
	const reason =
		typeof sentinel.__invalidReason === 'string' && sentinel.__invalidReason.length > 0
			? sentinel.__invalidReason
			: 'unknown';
	const explanation =
		typeof sentinel.__invalidExplanation === 'string' ? sentinel.__invalidExplanation : undefined;
	return [reason, explanation];
}

/** Give back a zone name luxon can resolve, or nothing to keep the system zone. */
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
	// A marker without a zone name came from a value in the system zone. Name the
	// system zone, because the default zone here is the timezone of the workflow.
	const zone = acceptedZoneName(sentinel.__zone) ?? 'local';
	// Do not pass `setZone`. With `setZone`, luxon takes the zone from the offset
	// in the ISO string and drops the zone name the marker carries.
	return DateTime.fromISO(isoString, { zone });
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

export function rebuildLuxonValue(sentinel: LuxonSentinel): DateTime | Duration | Interval {
	if (isDateTimeSentinel(sentinel)) return rebuildDateTime(sentinel);
	if (isDurationSentinel(sentinel)) return rebuildDuration(sentinel);
	return rebuildInterval(sentinel);
}

/**
 * Turn a luxon instance into a marker, or give back nothing for any other value.
 *
 * The luxon `is*` helpers only read a flag on the object, which user data can
 * also hold. The prototype check makes sure the value is a real instance.
 */
export const encodeLuxonValue: SentinelEncoder = (value) => {
	if (value instanceof DateTime && DateTime.isDateTime(value)) return dateTimeToSentinel(value);
	if (value instanceof Duration && Duration.isDuration(value)) return durationToSentinel(value);
	if (value instanceof Interval && Interval.isInterval(value)) return intervalToSentinel(value);
	return undefined;
};

/**
 * Rebuild a luxon instance from a marker.
 *
 * A marker that names a type no encoder here wrote is given back as the plain
 * object it is, which is what the host did before the type had a marker.
 */
export const decodeLuxonSentinel: SentinelDecoder = (sentinel) => {
	if (!isLuxonSentinel(sentinel)) return sentinel;
	return rebuildLuxonValue(sentinel);
};

/** Walk a transferred value and rebuild every luxon instance in it. */
export function unwrapLuxonValues(value: unknown): unknown {
	return unwrapTransferSentinels(value, decodeLuxonSentinel);
}
