import { readSavedTestRerun, rerunAvatarKind } from '../agent-eval-saved-test';

describe('readSavedTestRerun', () => {
	it('reads the re-run of a saved test from the result output', () => {
		expect(
			readSavedTestRerun({
				finalText: 'It was delivered.',
				rerun: {
					kind: 'answer',
					outcome: 'fail',
					runs: 3,
					failedRuns: 3,
					toolChanges: [{ tool: 'send_email', saved: 1, now: 2 }],
					reasoning: 'The date is different.',
					replayed: [],
				},
			}),
		).toEqual({
			kind: 'answer',
			outcome: 'fail',
			runs: 3,
			failedRuns: 3,
			toolChanges: [{ tool: 'send_email', saved: 1, now: 2 }],
			reasoning: 'The date is different.',
			offScriptTools: [],
		});
	});

	it('is null for a case that was not a saved test', () => {
		expect(readSavedTestRerun({ finalText: 'x' })).toBeNull();
		expect(readSavedTestRerun(null)).toBeNull();
	});

	it('is null for an outcome it does not know', () => {
		expect(
			readSavedTestRerun({ rerun: { kind: 'answer', outcome: 'maybe', runs: 1, failedRuns: 0 } }),
		).toBeNull();
	});

	it('drops malformed tool changes and keeps the rest', () => {
		expect(
			readSavedTestRerun({
				rerun: {
					kind: 'note',
					outcome: 'couldnt_check',
					runs: 1,
					failedRuns: 0,
					toolChanges: [{ tool: 7 }, { tool: 'a', saved: 0, now: 1 }],
					offScriptTools: ['search_faq', 3],
				},
			}),
		).toMatchObject({
			kind: 'note',
			toolChanges: [{ tool: 'a', saved: 0, now: 1 }],
			offScriptTools: ['search_faq'],
		});
	});
});

describe('rerunAvatarKind', () => {
	it('shows a pass and a fail as such, and the rest as not counted', () => {
		const base = { kind: 'answer', runs: 1, failedRuns: 0, toolChanges: [], reasoning: null };
		expect(rerunAvatarKind({ ...base, outcome: 'pass', offScriptTools: [] } as never)).toBe('pass');
		expect(rerunAvatarKind({ ...base, outcome: 'fail', offScriptTools: [] } as never)).toBe('work');
		expect(rerunAvatarKind({ ...base, outcome: 'flaky', offScriptTools: [] } as never)).toBe(
			'idle',
		);
		expect(
			rerunAvatarKind({ ...base, outcome: 'couldnt_check', offScriptTools: [] } as never),
		).toBe('idle');
	});
});
