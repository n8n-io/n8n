import type { IRunData } from 'n8n-workflow';

import { sumNodeTimeSavedMinutes } from '../time-saved';

describe('sumNodeTimeSavedMinutes', () => {
	test.each([
		{
			case: 'several nodes',
			runData: {
				'Track Time Saved': [{ metadata: { timeSaved: { minutes: 10 } } }],
				'Track Time Saved 2': [{ metadata: { timeSaved: { minutes: 30 } } }],
			},
			expected: 40,
		},
		{
			case: 'several runs of one node',
			runData: {
				'Track Time Saved': [
					{ metadata: { timeSaved: { minutes: 10 } } },
					{ metadata: { timeSaved: { minutes: 20 } } },
				],
			},
			expected: 30,
		},
		{
			case: 'a node without metadata',
			runData: {
				'Track Time Saved': [{ metadata: { timeSaved: { minutes: 10 } } }],
				'Set Fields': [{}],
			},
			expected: 10,
		},
		{
			case: 'time saved without minutes',
			runData: { 'Track Time Saved': [{ metadata: { timeSaved: {} } }] },
			expected: 0,
		},
		{ case: 'undefined run data', runData: undefined, expected: 0 },
	])('sums the minutes for $case', ({ runData, expected }) => {
		expect(sumNodeTimeSavedMinutes(runData as unknown as IRunData | undefined)).toBe(expected);
	});
});
