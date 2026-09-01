import { validateSchedule } from '@n8n/scheduler';

import { intervalSchedule } from '../insights-task-schedule';

describe('intervalSchedule', () => {
	it('keeps a whole-second cadence', () => {
		expect(intervalSchedule(3600)).toEqual({ kind: 'interval', intervalSeconds: 3600 });
	});

	it.each([
		[0.1 * 3600, 360],
		[90.4, 90],
		[0.2, 1],
	])('plans a cadence of %s seconds as %s', (seconds, expected) => {
		const schedule = intervalSchedule(seconds);

		expect(schedule).toEqual({ kind: 'interval', intervalSeconds: expected });
		expect(() => validateSchedule(schedule)).not.toThrow();
	});
});
