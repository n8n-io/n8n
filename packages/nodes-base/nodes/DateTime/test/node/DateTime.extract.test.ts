import { parseDate } from '../../V2/GenericFunctions';
import type { IExecuteFunctions } from 'n8n-workflow';

const mockExecuteFunctions = {
	getNode: jest.fn(),
} as unknown as IExecuteFunctions;

describe('parseDate AM/PM handling', () => {
	it('should be deterministic across timezones', () => {
		const utc = parseDate.call(mockExecuteFunctions, '2026-02-09 3:00 PM', {
			fromFormat: 'yyyy-MM-dd h:mm a',
			timezone: 'UTC',
		});

		const ny = parseDate.call(mockExecuteFunctions, '2026-02-09 3:00 PM', {
			fromFormat: 'yyyy-MM-dd h:mm a',
			timezone: 'America/New_York',
		});

		expect(utc.hour).toBe(15);
		expect(ny.hour).toBe(15);
	});
});
