import { DateTime, Duration, Interval } from 'luxon';
import { describe, it, expect } from 'vitest';

import {
	dateTimeToSentinel,
	durationToSentinel,
	intervalToSentinel,
	unwrapLuxonSentinels,
} from '../luxon-transfer';

function unwrap(marker: unknown): unknown {
	return unwrapLuxonSentinels(marker);
}

describe('luxon transfer', () => {
	describe('round trip', () => {
		it('should keep the name of a named zone', () => {
			const value = DateTime.fromISO('2024-01-15T12:00:00', { zone: 'Europe/Paris' });

			const result = unwrap(dateTimeToSentinel(value)) as DateTime;

			expect(result.isValid).toBe(true);
			expect(result.zoneName).toBe('Europe/Paris');
			expect(result.plus({ months: 6 }).toISO()).toBe('2024-07-15T12:00:00.000+02:00');
		});

		it('should keep the system zone as the system zone', () => {
			const result = unwrap(dateTimeToSentinel(DateTime.now())) as DateTime;

			expect(result.isValid).toBe(true);
			expect(result.zone.type).toBe('system');
		});

		it('should keep the units of a duration', () => {
			const value = Duration.fromObject({ days: 2, hours: 3 });

			const result = unwrap(durationToSentinel(value)) as Duration;

			expect(result.isValid).toBe(true);
			expect(result.toObject()).toEqual({ days: 2, hours: 3 });
		});

		it('should keep the ends of an interval', () => {
			const value = Interval.fromDateTimes(
				DateTime.fromISO('2024-01-01T00:00:00.000Z', { zone: 'utc' }),
				DateTime.fromISO('2024-01-02T00:00:00.000Z', { zone: 'utc' }),
			);

			const result = unwrap(intervalToSentinel(value)) as Interval;

			expect(result.isValid).toBe(true);
			expect(result.length('hours')).toBe(24);
		});

		it('should keep the reason of an invalid value', () => {
			expect((unwrap(dateTimeToSentinel(DateTime.invalid('test'))) as DateTime).invalidReason).toBe(
				'test',
			);
			expect((unwrap(durationToSentinel(Duration.invalid('test'))) as Duration).invalidReason).toBe(
				'test',
			);
			expect((unwrap(intervalToSentinel(Interval.invalid('test'))) as Interval).invalidReason).toBe(
				'test',
			);
		});
	});

	describe('markers the host does not accept', () => {
		it('should ignore a zone name that no zone database holds', () => {
			const result = unwrap({
				__isDateTime: true,
				__isoString: '2024-01-01T00:00:00.000Z',
				__zone: 'Fantasia/Castle',
			}) as DateTime;

			expect(result.isValid).toBe(true);
			expect(result.zoneName).not.toBe('Fantasia/Castle');
			expect(result.toMillis()).toBe(Date.UTC(2024, 0, 1));
		});

		it('should ignore a zone name that is not a string', () => {
			const result = unwrap({
				__isDateTime: true,
				__isoString: '2024-01-01T00:00:00.000Z',
				__zone: { name: 'Europe/Paris' },
			}) as DateTime;

			expect(result.isValid).toBe(true);
			expect(result.toMillis()).toBe(Date.UTC(2024, 0, 1));
		});

		it('should accept a fixed offset zone name', () => {
			const result = unwrap({
				__isDateTime: true,
				__isoString: '2024-01-15T12:00:00.000+01:00',
				__zone: 'UTC+1',
			}) as DateTime;

			expect(result.isValid).toBe(true);
			expect(result.toISO()).toBe('2024-01-15T12:00:00.000+01:00');
		});

		it('should build an invalid DateTime when the ISO string is not a string', () => {
			const result = unwrap({ __isDateTime: true, __isoString: 123 }) as DateTime;

			expect(result.isValid).toBe(false);
			expect(result.invalidReason).toBe('unknown');
		});

		it('should build an invalid DateTime when the reason is empty or not a string', () => {
			expect((unwrap({ __isDateTime: true, __invalidReason: '' }) as DateTime).invalidReason).toBe(
				'unknown',
			);
			expect((unwrap({ __isDateTime: true, __invalidReason: 42 }) as DateTime).invalidReason).toBe(
				'unknown',
			);
		});

		it('should build an invalid Duration when a unit name is unknown', () => {
			const result = unwrap({ __isDuration: true, __values: { evil: 1 } }) as Duration;

			expect(result.isValid).toBe(false);
			expect(result.invalidReason).toBe('unknown');
		});

		it('should build an invalid Duration when an amount is not a finite number', () => {
			expect((unwrap({ __isDuration: true, __values: { days: 'x' } }) as Duration).isValid).toBe(
				false,
			);
			expect(
				(unwrap({ __isDuration: true, __values: { days: Number.POSITIVE_INFINITY } }) as Duration)
					.isValid,
			).toBe(false);
		});

		it('should build an invalid Interval when an end is not a DateTime marker', () => {
			const result = unwrap({ __isInterval: true, __start: 'x', __end: 'y' }) as Interval;

			expect(result.isValid).toBe(false);
			expect(result.invalidReason).toBe('unknown');
		});

		it('should return the escaped payload untouched when it is not a plain object', () => {
			expect(unwrap({ __isLuxonEscaped: true, __value: null })).toBeNull();
			expect(unwrap({ __isLuxonEscaped: true, __value: 'text' })).toBe('text');
		});
	});
});
