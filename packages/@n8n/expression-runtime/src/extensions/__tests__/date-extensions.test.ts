import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';

import { dateExtensions } from '../date-extensions';

const diffTo = dateExtensions.functions.diffTo as (
	date: DateTime,
	args: [string | Date | DateTime, string | string[]],
) => number | Record<string, number>;

describe('diffTo', () => {
	it('should return the difference in a supported unit', () => {
		expect(
			diffTo(DateTime.fromISO('2024-03-30T18:49:00Z'), [
				DateTime.fromISO('2024-03-25T18:49:00Z'),
				'days',
			]),
		).toEqual(5);
	});

	it('should return the difference in the singular form of a supported unit', () => {
		expect(
			diffTo(DateTime.fromISO('2024-03-30T18:49:00Z'), [
				DateTime.fromISO('2024-03-25T18:49:00Z'),
				'day',
			]),
		).toEqual(5);
	});

	it.each(['weekday', 'weekNumber', 'yearDayNumber'])(
		'should throw the friendly error for the get-only unit %s',
		(unit) => {
			expect(() =>
				diffTo(DateTime.fromISO('2024-03-30T18:49:00Z'), [
					DateTime.fromISO('2024-03-25T18:49:00Z'),
					unit,
				]),
			).toThrow('Unsupported unit');
		},
	);

	it('should throw the friendly error for an unknown unit', () => {
		expect(() =>
			diffTo(DateTime.fromISO('2024-03-30T18:49:00Z'), [
				DateTime.fromISO('2024-03-25T18:49:00Z'),
				'fortnight',
			]),
		).toThrow("Unsupported unit 'fortnight'.");
	});
});
