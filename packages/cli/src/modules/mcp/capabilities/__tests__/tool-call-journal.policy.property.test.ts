import fc from 'fast-check';

import {
	decideJournalAction,
	type JournalAction,
	type JournalRecord,
	type ReplayPolicy,
} from '../tool-call-journal.policy';

const policyArb = fc.constantFrom<ReplayPolicy>('safe', 'unsafe');
const recordArb: fc.Arbitrary<JournalRecord> = fc.record({
	status: fc.constantFrom('intent', 'completed', 'failed'),
	replay: policyArb,
});
const settledRecordArb: fc.Arbitrary<JournalRecord> = fc.record({
	status: fc.constantFrom('completed', 'failed'),
	replay: policyArb,
});
const ALL_ACTIONS: JournalAction[] = ['run', 'return-result', 'return-error', 'return-interrupted'];

describe('decideJournalAction properties', () => {
	it('never runs an intent record when the stored or the current policy is unsafe', () => {
		fc.assert(
			fc.property(policyArb, policyArb, (replay, current) => {
				fc.pre(replay === 'unsafe' || current === 'unsafe');

				expect(decideJournalAction({ status: 'intent', replay }, current)).toBe(
					'return-interrupted',
				);
			}),
		);
	});

	it('gives the same action for a settled record whatever the policies are', () => {
		fc.assert(
			fc.property(settledRecordArb, policyArb, policyArb, (record, otherReplay, current) => {
				const baseline = decideJournalAction(record, 'safe');

				expect(decideJournalAction({ ...record, replay: otherReplay }, current)).toBe(baseline);
				expect(baseline).toBe(record.status === 'completed' ? 'return-result' : 'return-error');
			}),
		);
	});

	it('returns a known action and never throws for every typed input', () => {
		fc.assert(
			fc.property(fc.option(recordArb, { nil: undefined }), policyArb, (record, current) => {
				expect(ALL_ACTIONS).toContain(decideJournalAction(record, current));
			}),
		);
	});

	it('returns a known action and never throws for malformed input', () => {
		fc.assert(
			fc.property(fc.anything(), fc.anything(), (record, current) => {
				const action = decideJournalAction(
					record as JournalRecord | undefined,
					current as ReplayPolicy,
				);

				expect(ALL_ACTIONS).toContain(action);
			}),
		);
	});

	it('changes only "run" into "return-interrupted" when the current policy goes from safe to unsafe', () => {
		fc.assert(
			fc.property(fc.option(recordArb, { nil: undefined }), (record) => {
				const whenSafe = decideJournalAction(record, 'safe');
				const whenUnsafe = decideJournalAction(record, 'unsafe');

				if (whenSafe !== whenUnsafe) {
					expect(whenSafe).toBe('run');
					expect(whenUnsafe).toBe('return-interrupted');
				}
				// The reverse change would mean a stricter policy can start a re-run.
				expect(whenSafe === 'return-interrupted' && whenUnsafe === 'run').toBe(false);
			}),
		);
	});
});
