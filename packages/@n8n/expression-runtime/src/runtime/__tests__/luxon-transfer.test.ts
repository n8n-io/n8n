import { DateTime, Duration, Interval, Settings } from 'luxon';
import { describe, it, expect } from 'vitest';

import {
	dateTimeToSentinel,
	durationToSentinel,
	intervalToSentinel,
	unwrapLuxonValues,
} from '../luxon-transfer';

describe('luxon transfer', () => {
	describe('round trip', () => {
		it('should keep the name of a named zone', () => {
			const value = DateTime.fromISO('2024-01-15T12:00:00', { zone: 'Europe/Paris' });

			const result = unwrapLuxonValues(dateTimeToSentinel(value)) as DateTime;

			expect(result.isValid).toBe(true);
			expect(result.zoneName).toBe('Europe/Paris');
			expect(result.plus({ months: 6 }).toISO()).toBe('2024-07-15T12:00:00.000+02:00');
		});

		it('should keep the system zone as the system zone', () => {
			const result = unwrapLuxonValues(dateTimeToSentinel(DateTime.now())) as DateTime;

			expect(result.isValid).toBe(true);
			expect(result.zone.type).toBe('system');
		});

		it('should keep the system zone when the default zone is a named zone', () => {
			const previous = Settings.defaultZone;
			Settings.defaultZone = 'Asia/Tokyo';
			try {
				const result = unwrapLuxonValues(
					dateTimeToSentinel(DateTime.now().setZone('system')),
				) as DateTime;

				expect(result.isValid).toBe(true);
				expect(result.zone.type).toBe('system');
			} finally {
				Settings.defaultZone = previous;
			}
		});

		it('should keep the units of a duration', () => {
			const value = Duration.fromObject({ days: 2, hours: 3 });

			const result = unwrapLuxonValues(durationToSentinel(value)) as Duration;

			expect(result.isValid).toBe(true);
			expect(result.toObject()).toEqual({ days: 2, hours: 3 });
		});

		it('should keep the ends of an interval', () => {
			const value = Interval.fromDateTimes(
				DateTime.fromISO('2024-01-01T00:00:00.000Z', { zone: 'utc' }),
				DateTime.fromISO('2024-01-02T00:00:00.000Z', { zone: 'utc' }),
			);

			const result = unwrapLuxonValues(intervalToSentinel(value)) as Interval;

			expect(result.isValid).toBe(true);
			expect(result.length('hours')).toBe(24);
		});

		it('should keep the reason of an invalid value', () => {
			const dateTime = unwrapLuxonValues(dateTimeToSentinel(DateTime.invalid('test')));
			const duration = unwrapLuxonValues(durationToSentinel(Duration.invalid('test')));
			const interval = unwrapLuxonValues(intervalToSentinel(Interval.invalid('test')));

			expect((dateTime as DateTime).invalidReason).toBe('test');
			expect((duration as Duration).invalidReason).toBe('test');
			expect((interval as Interval).invalidReason).toBe('test');
		});
	});

	describe('markers the host does not accept', () => {
		it('should ignore a zone name that no zone database holds', () => {
			const result = unwrapLuxonValues({
				__n8nType: 'DateTime',
				__isoString: '2024-01-01T00:00:00.000Z',
				__zone: 'Fantasia/Castle',
			}) as DateTime;

			expect(result.isValid).toBe(true);
			expect(result.zoneName).not.toBe('Fantasia/Castle');
			expect(result.toMillis()).toBe(Date.UTC(2024, 0, 1));
		});

		it('should ignore a zone name that is not a string', () => {
			const result = unwrapLuxonValues({
				__n8nType: 'DateTime',
				__isoString: '2024-01-01T00:00:00.000Z',
				__zone: { name: 'Europe/Paris' },
			}) as DateTime;

			expect(result.isValid).toBe(true);
			expect(result.toMillis()).toBe(Date.UTC(2024, 0, 1));
		});

		it('should accept a fixed offset zone name', () => {
			const result = unwrapLuxonValues({
				__n8nType: 'DateTime',
				__isoString: '2024-01-15T12:00:00.000+01:00',
				__zone: 'UTC+1',
			}) as DateTime;

			expect(result.isValid).toBe(true);
			expect(result.toISO()).toBe('2024-01-15T12:00:00.000+01:00');
		});

		it('should ignore an offset zone name that luxon cannot resolve', () => {
			const result = unwrapLuxonValues({
				__n8nType: 'DateTime',
				__isoString: '2024-01-15T12:00:00.000+01:00',
				__zone: 'GMT+2',
			}) as DateTime;

			expect(result.isValid).toBe(true);
			expect(result.toMillis()).toBe(DateTime.fromISO('2024-01-15T12:00:00.000+01:00').toMillis());
		});

		it('should build an invalid DateTime when the ISO string is not a string', () => {
			const result = unwrapLuxonValues({ __n8nType: 'DateTime', __isoString: 123 }) as DateTime;

			expect(result.isValid).toBe(false);
			expect(result.invalidReason).toBe('unknown');
		});

		it('should build an invalid DateTime when the reason is empty or not a string', () => {
			const empty = unwrapLuxonValues({ __n8nType: 'DateTime', __invalidReason: '' });
			const notAString = unwrapLuxonValues({ __n8nType: 'DateTime', __invalidReason: 42 });

			expect((empty as DateTime).invalidReason).toBe('unknown');
			expect((notAString as DateTime).invalidReason).toBe('unknown');
		});

		it('should build an invalid Duration when a unit name is unknown', () => {
			const result = unwrapLuxonValues({
				__n8nType: 'Duration',
				__values: { fortnights: 1 },
			}) as Duration;

			expect(result.isValid).toBe(false);
			expect(result.invalidReason).toBe('unknown');
		});

		it('should build an invalid Duration when an amount is not a finite number', () => {
			const text = unwrapLuxonValues({ __n8nType: 'Duration', __values: { days: 'x' } });
			const infinite = unwrapLuxonValues({
				__n8nType: 'Duration',
				__values: { days: Number.POSITIVE_INFINITY },
			});

			expect((text as Duration).isValid).toBe(false);
			expect((infinite as Duration).isValid).toBe(false);
		});

		it('should build an invalid Interval when an end is not a DateTime marker', () => {
			const result = unwrapLuxonValues({
				__n8nType: 'Interval',
				__start: 'x',
				__end: 'y',
			}) as Interval;

			expect(result.isValid).toBe(false);
			expect(result.invalidReason).toBe('unknown');
		});
	});

	describe('escaped and opaque payloads', () => {
		it('should return the escaped payload untouched when it is not a plain object', () => {
			expect(unwrapLuxonValues({ __n8nEscaped: true, __value: null })).toBeNull();
			expect(unwrapLuxonValues({ __n8nEscaped: true, __value: 'text' })).toBe('text');
		});

		it('should return an opaque payload as data and leave a marker inside it alone', () => {
			const payload = { inner: { __n8nType: 'DateTime', __isoString: '2024-01-15T00:00:00.000Z' } };

			const result = unwrapLuxonValues({
				__n8nEscaped: true,
				__n8nOpaque: true,
				__value: payload,
			});

			expect(result).toEqual(payload);
			expect(DateTime.isDateTime((result as Record<string, unknown>).inner)).toBe(false);
		});

		it('should keep rebuilding a luxon value inside a payload that is not opaque', () => {
			const result = unwrapLuxonValues({
				__n8nEscaped: true,
				__value: {
					__n8nType: 'x',
					real: { __n8nType: 'DateTime', __isoString: '2024-01-15T00:00:00.000Z' },
				},
			}) as Record<string, unknown>;

			expect(result.__n8nType).toBe('x');
			expect(DateTime.isDateTime(result.real)).toBe(true);
		});
	});

	describe('the walk over a value', () => {
		it('should walk a value that refers to itself once', () => {
			const value: Record<string, unknown> = { n: 1 };
			value.self = value;

			const result = unwrapLuxonValues(value) as Record<string, unknown>;

			expect(result.n).toBe(1);
			expect(result.self).toBe(result);
		});

		it('should keep the holes of a sparse array', () => {
			const value = new Array<unknown>(3);
			value[0] = 1;
			value[2] = 3;

			const result = unwrapLuxonValues(value) as unknown[];

			expect(result).toHaveLength(3);
			expect(1 in result).toBe(false);
			expect(result[0]).toBe(1);
			expect(result[2]).toBe(3);
		});
	});
});
