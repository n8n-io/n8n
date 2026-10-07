import {
	decideJournalAction,
	INTERRUPTED_TOOL_MESSAGE,
	replayPolicyFromAnnotations,
	type JournalAction,
	type JournalStatus,
	type ReplayPolicy,
	type ToolReplayAnnotations,
} from '../tool-call-journal.policy';

describe('decideJournalAction', () => {
	it('runs the call when no journal record exists', () => {
		expect(decideJournalAction(undefined, 'safe')).toBe('run');
		expect(decideJournalAction(undefined, 'unsafe')).toBe('run');
	});

	type DecisionRow = [JournalStatus, ReplayPolicy, ReplayPolicy, JournalAction];
	const table: DecisionRow[] = [
		['completed', 'safe', 'safe', 'return-result'],
		['completed', 'safe', 'unsafe', 'return-result'],
		['completed', 'unsafe', 'safe', 'return-result'],
		['completed', 'unsafe', 'unsafe', 'return-result'],
		['failed', 'safe', 'safe', 'return-error'],
		['failed', 'safe', 'unsafe', 'return-error'],
		['failed', 'unsafe', 'safe', 'return-error'],
		['failed', 'unsafe', 'unsafe', 'return-error'],
		['intent', 'safe', 'safe', 'run'],
		['intent', 'safe', 'unsafe', 'return-interrupted'],
		['intent', 'unsafe', 'safe', 'return-interrupted'],
		['intent', 'unsafe', 'unsafe', 'return-interrupted'],
	];

	it.each(table)(
		'status %s with stored policy %s and current policy %s gives %s',
		(status, replay, current, expected) => {
			expect(decideJournalAction({ status, replay }, current)).toBe(expected);
		},
	);

	it('does not re-run a record with an unknown status', () => {
		const record = { status: 'started', replay: 'safe' } as unknown as Parameters<
			typeof decideJournalAction
		>[0];

		expect(decideJournalAction(record, 'safe')).toBe('return-interrupted');
	});

	it('does not re-run an intent record with an unknown stored policy', () => {
		const record = { status: 'intent', replay: 'maybe' } as unknown as Parameters<
			typeof decideJournalAction
		>[0];

		expect(decideJournalAction(record, 'safe')).toBe('return-interrupted');
	});
});

describe('replayPolicyFromAnnotations', () => {
	type AnnotationRow = [string, ToolReplayAnnotations | undefined, ReplayPolicy];
	const cases: AnnotationRow[] = [
		['no annotations', undefined, 'unsafe'],
		['empty annotations', {}, 'unsafe'],
		['read-only tool', { readOnlyHint: true }, 'safe'],
		['idempotent tool', { idempotentHint: true }, 'safe'],
		['read-only and idempotent tool', { readOnlyHint: true, idempotentHint: true }, 'safe'],
		['read-only hint set to false', { readOnlyHint: false }, 'unsafe'],
		['idempotent hint set to false', { idempotentHint: false }, 'unsafe'],
		['destructive tool without other hints', { destructiveHint: true }, 'unsafe'],
		['destructive read-only tool', { readOnlyHint: true, destructiveHint: true }, 'unsafe'],
		['destructive idempotent tool', { idempotentHint: true, destructiveHint: true }, 'unsafe'],
		[
			'all hints set, destructive included',
			{ readOnlyHint: true, idempotentHint: true, destructiveHint: true },
			'unsafe',
		],
		['non-destructive read-only tool', { readOnlyHint: true, destructiveHint: false }, 'safe'],
		['non-destructive tool without other hints', { destructiveHint: false }, 'unsafe'],
	];

	it.each(cases)('gives the right policy for a %s', (_label, annotations, expected) => {
		expect(replayPolicyFromAnnotations(annotations)).toBe(expected);
	});

	it('treats hints that are not the boolean true as not set', () => {
		const annotations = {
			readOnlyHint: 'true',
			idempotentHint: 1,
		} as unknown as ToolReplayAnnotations;

		expect(replayPolicyFromAnnotations(annotations)).toBe('unsafe');
	});

	it('treats a non-boolean destructive hint as not set', () => {
		const annotations = {
			readOnlyHint: true,
			destructiveHint: 'yes',
		} as unknown as ToolReplayAnnotations;

		expect(replayPolicyFromAnnotations(annotations)).toBe('safe');
	});
});

describe('INTERRUPTED_TOOL_MESSAGE', () => {
	it('tells the model to check the current state and does not expose internals', () => {
		expect(INTERRUPTED_TOOL_MESSAGE).toBe(
			'This action was interrupted. It may or may not have happened. Check its current state before you try it again.',
		);
		expect(INTERRUPTED_TOOL_MESSAGE).not.toMatch(/journal|intent|replay|policy/i);
	});
});
