import { toUtcDate } from '@/utils';

describe('utils', () => {
	describe('toUtcDate()', () => {
		test('should convert to UTC date by adding', () => {
			const originalDate = new Date('2020-01-01T00:00:00.000Z');
			const timezone = 'America/New_York'; // +5 to reach Z

			const utcDate = toUtcDate(originalDate, timezone);

			expect(utcDate).toBeInstanceOf(Date);
			expect(utcDate.toISOString()).toBe('2020-01-01T05:00:00.000Z');
		});

		test('should convert to UTC date by subtracting', () => {
			const originalDate = new Date('2020-01-01T00:00:00.000Z');
			const timezone = 'Europe/Paris'; // -1 to reach Z

			const utcDate = toUtcDate(originalDate, timezone);

			expect(utcDate).toBeInstanceOf(Date);
			expect(utcDate.toISOString()).toBe('2019-12-31T23:00:00.000Z');
		});

		test('should convert to UTC date when already UTC', () => {
			const originalDate = new Date('2020-01-01T00:00:00.000Z');
			const timezone = 'UTC'; // already at Z

			const utcDate = toUtcDate(originalDate, timezone);

			expect(utcDate).toBeInstanceOf(Date);
			expect(utcDate.toISOString()).toBe('2020-01-01T00:00:00.000Z');
		});
	});
});
