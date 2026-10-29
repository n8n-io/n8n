import type { IRunData } from 'n8n-workflow';

import type { LedgerFact, LedgerOutcome } from '../counting-rules';
import { computeTimeSavedMinutes, sumNodeTimeSavedMinutes } from '../time-saved';

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

describe('computeTimeSavedMinutes', () => {
	const runData = {
		'Track Time Saved': [{ metadata: { timeSaved: { minutes: 10 } } }],
		'Track Time Saved 2': [{ metadata: { timeSaved: { minutes: 30 } } }],
	} as unknown as IRunData;

	const fact = (overrides: Partial<LedgerFact> = {}): LedgerFact => ({
		entityType: 'workflow',
		mode: 'webhook',
		source: 'none',
		event: 'ended',
		outcome: 'success',
		...overrides,
	});
	const base = { fact: fact() };

	test('uses timeSavedPerExecution in fixed mode', () => {
		const settings = { timeSavedMode: 'fixed', timeSavedPerExecution: 15 } as const;
		expect(computeTimeSavedMinutes({ ...base, settings })).toBe(15);
	});

	test('returns 0 when the workflow has no settings', () => {
		expect(computeTimeSavedMinutes({ ...base })).toBe(0);
	});

	test('returns 0 in fixed mode without a value', () => {
		expect(computeTimeSavedMinutes({ ...base, settings: { timeSavedMode: 'fixed' } })).toBe(0);
	});

	test('uses the fixed value for a legacy workflow without a mode', () => {
		const settings = { timeSavedPerExecution: 7 };
		expect(computeTimeSavedMinutes({ ...base, settings, runData })).toBe(7);
	});

	test('uses nodeTimeSavedMinutes in dynamic mode when both are set', () => {
		const settings = { timeSavedMode: 'dynamic' } as const;
		expect(computeTimeSavedMinutes({ ...base, settings, nodeTimeSavedMinutes: 5, runData })).toBe(
			5,
		);
	});

	test('sums the run data in dynamic mode without nodeTimeSavedMinutes', () => {
		const settings = { timeSavedMode: 'dynamic' } as const;
		expect(computeTimeSavedMinutes({ ...base, settings, runData })).toBe(40);
	});

	test('returns 0 in dynamic mode without any time saved data', () => {
		const settings = { timeSavedMode: 'dynamic' } as const;
		expect(computeTimeSavedMinutes({ ...base, settings })).toBe(0);
	});

	test.each<LedgerOutcome>(['error', 'crashed', 'blocked', 'canceled', 'none'])(
		'returns undefined for outcome %s',
		(outcome) => {
			const settings = { timeSavedMode: 'fixed', timeSavedPerExecution: 15 } as const;
			expect(computeTimeSavedMinutes({ fact: fact({ outcome }), settings })).toBeUndefined();
		},
	);

	test('returns undefined for an error workflow even on success', () => {
		const settings = { timeSavedMode: 'fixed', timeSavedPerExecution: 15 } as const;
		expect(computeTimeSavedMinutes({ fact: fact({ mode: 'error' }), settings })).toBeUndefined();
	});
});
