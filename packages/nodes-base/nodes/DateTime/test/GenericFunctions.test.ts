import { DateTime, Settings } from 'luxon';
import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { parseDate } from '../V2/GenericFunctions';

describe('parseDate', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	});

	afterEach(() => {
		// Reset Luxon's global default zone after each test so n8n's side-effect
		// (Settings.defaultZone = workflowTimezone in WorkflowDataProxy) does not
		// bleed between tests.
		Settings.defaultZone = 'local';
	});

	describe('when Settings.defaultZone is set to the workflow timezone (production behaviour)', () => {
		beforeEach(() => {
			Settings.defaultZone = 'America/New_York';
		});

		it('should extract the correct hour from a naive ISO string', () => {
			// Without the fix, zone.type would be 'iana' (not 'local') due to
			// Settings.defaultZone, causing the ISO path to run and setZone to
			// shift the hour relative to UTC rather than keeping the wall-clock time.
			const result = parseDate.call(mockExecuteFunctions, '2023-04-11T14:30:00', {
				timezone: 'America/New_York',
			});
			expect(result.hour).toBe(14);
		});

		it('should correctly convert an ISO string with an explicit offset', () => {
			// 14:30 +05:00 = 09:30 UTC = 05:30 EDT
			const result = parseDate.call(mockExecuteFunctions, '2023-04-11T14:30:00+05:00', {
				timezone: 'America/New_York',
			});
			expect(result.hour).toBe(5);
		});

		it('should correctly convert a UTC ISO string', () => {
			// 14:30 UTC = 10:30 EDT
			const result = parseDate.call(mockExecuteFunctions, '2023-04-11T14:30:00Z', {
				timezone: 'America/New_York',
			});
			expect(result.hour).toBe(10);
		});

		it('should correctly convert an ISO string with a compact offset (+HHmm)', () => {
			// 14:30 +0500 = 09:30 UTC = 05:30 EDT
			const result = parseDate.call(mockExecuteFunctions, '2023-04-11T14:30:00+0500', {
				timezone: 'America/New_York',
			});
			expect(result.hour).toBe(5);
		});

		it('should correctly convert an ISO string with an hour-only offset (+HH)', () => {
			// 14:30 +05 = 09:30 UTC = 05:30 EDT
			const result = parseDate.call(mockExecuteFunctions, '2023-04-11T14:30:00+05', {
				timezone: 'America/New_York',
			});
			expect(result.hour).toBe(5);
		});
	});

	describe('DateTime instance input', () => {
		it('should apply the workflow timezone when a DateTime instance is passed', () => {
			// 14:30 +05:00 = 09:30 UTC = 05:30 EDT
			const dt = DateTime.fromISO('2023-04-11T14:30:00+05:00');
			const result = parseDate.call(mockExecuteFunctions, dt, {
				timezone: 'America/New_York',
			});
			expect(result.hour).toBe(5);
		});

		it('should return the DateTime in the correct zone when no timezone option is provided', () => {
			const dt = DateTime.fromISO('2023-04-11T14:30:00+05:00');
			const result = parseDate.call(mockExecuteFunctions, dt, {});
			expect(result.zoneName).toBe('Etc/UTC');
			expect(result.hour).toBe(9);
		});
	});

	describe('naive string formats that must preserve wall-clock time regardless of Settings.defaultZone', () => {
		beforeEach(() => {
			// Use a UTC+3 defaultZone so any accidental conversion is detectable as a +3h shift.
			Settings.defaultZone = 'Europe/Athens';
		});

		it('should keep wall-clock day for a date-only string (must not misread trailing digits as an offset)', () => {
			// '2023-04-11' ends with '-11'; the regex must not treat that as a +/-HH offset.
			const result = parseDate.call(mockExecuteFunctions, '2023-04-11', {
				timezone: 'Europe/Athens',
			});
			expect(result.day).toBe(11);
			expect(result.hour).toBe(0);
		});

		it('should keep wall-clock hour for a space-separated naive date string', () => {
			const result = parseDate.call(mockExecuteFunctions, '2023-04-11 14:30:00', {
				timezone: 'Europe/Athens',
			});
			expect(result.hour).toBe(14);
		});

		it('should keep wall-clock hour for an AM/PM date string', () => {
			const result = parseDate.call(mockExecuteFunctions, '2014-08-06 10:00:00 AM', {
				timezone: 'Europe/Athens',
			});
			expect(result.hour).toBe(10);
		});

		it('should keep wall-clock hour when the target timezone differs from Settings.defaultZone', () => {
			// Covers the formatDate case where timezone option is off, so parseDate
			// receives Etc/UTC while Settings.defaultZone is the workflow timezone.
			const result = parseDate.call(mockExecuteFunctions, '2023-04-11 14:30:00', {
				timezone: 'Etc/UTC',
			});
			expect(result.hour).toBe(14);
		});
	});

	describe('invalid date string', () => {
		it('should throw a NodeOperationError instead of crashing with a TypeError', () => {
			mockExecuteFunctions.getNode.mockReturnValue({ name: 'DateTime' } as never);
			expect(() =>
				parseDate.call(mockExecuteFunctions, 'not-a-date', {
					timezone: 'America/New_York',
				}),
			).toThrow('Invalid date format');
		});
	});
});
