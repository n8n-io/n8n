import type { IRunData } from 'n8n-workflow';

import { sumNodeTimeSavedMinutes } from '../time-saved';

describe('sumNodeTimeSavedMinutes', () => {
	test('sums the minutes of several nodes', () => {
		const runData = {
			'Track Time Saved': [{ metadata: { timeSaved: { minutes: 10 } } }],
			'Track Time Saved 2': [{ metadata: { timeSaved: { minutes: 30 } } }],
		} as unknown as IRunData;

		expect(sumNodeTimeSavedMinutes(runData)).toBe(40);
	});

	test('sums the minutes of several runs of one node', () => {
		const runData = {
			'Track Time Saved': [
				{ metadata: { timeSaved: { minutes: 10 } } },
				{ metadata: { timeSaved: { minutes: 20 } } },
			],
		} as unknown as IRunData;

		expect(sumNodeTimeSavedMinutes(runData)).toBe(30);
	});

	test('counts 0 for a node without metadata', () => {
		const runData = {
			'Track Time Saved': [{ metadata: { timeSaved: { minutes: 10 } } }],
			'Set Fields': [{}],
		} as unknown as IRunData;

		expect(sumNodeTimeSavedMinutes(runData)).toBe(10);
	});

	test('counts 0 for time saved without minutes', () => {
		const runData = {
			'Track Time Saved': [{ metadata: { timeSaved: {} } }],
		} as unknown as IRunData;

		expect(sumNodeTimeSavedMinutes(runData)).toBe(0);
	});

	test('returns 0 for undefined run data', () => {
		expect(sumNodeTimeSavedMinutes(undefined)).toBe(0);
	});
});
