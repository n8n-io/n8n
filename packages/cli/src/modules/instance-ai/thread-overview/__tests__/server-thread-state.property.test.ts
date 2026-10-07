import { INSTANCE_AI_THREAD_SERVER_STATES, type AgentExecutionStatus } from '@n8n/api-types';
import fc from 'fast-check';

import type { ThreadRunSummary } from '../../../agents/repositories/agent-execution.repository';
import {
	toServerThreadFacts,
	toServerThreadState,
	toThreadOverview,
	type ServerThreadFacts,
} from '../server-thread-state';

const STATUSES: AgentExecutionStatus[] = [
	'running',
	'success',
	'error',
	'cancelled',
	'interrupted',
];

// Invalid dates are included because a bad row must not break the thread list.
// Each value is a new Date object, so identity checks can tell the session time from turn times.
const dateArb = fc.oneof(
	fc.date({ noInvalidDate: false }),
	fc.integer({ min: 0, max: 5 }).map((ms) => new Date(ms)),
	fc.boolean().map(() => new Date(Number.NaN)),
);

const factsArb: fc.Arbitrary<ServerThreadFacts> = fc.record({
	needsInput: fc.boolean(),
	running: fc.boolean(),
	lastRunFailed: fc.boolean(),
	lastActivityAt: dateArb,
});

const runArb: fc.Arbitrary<ThreadRunSummary> = fc.record({
	latest: fc.record({
		status: fc.constantFrom(...STATUSES),
		createdAt: dateArb,
		startedAt: fc.option(dateArb, { nil: null }),
		stoppedAt: fc.option(dateArb, { nil: null }),
	}),
	running: fc.boolean(),
});

describe('toServerThreadState properties', () => {
	it('always returns one of the four server states, never ready or done', () => {
		fc.assert(
			fc.property(factsArb, (facts) => {
				const state = toServerThreadState(facts);
				expect(INSTANCE_AI_THREAD_SERVER_STATES).toContain(state);
				expect(['ready', 'done']).not.toContain(state);
			}),
		);
	});

	it('returns needs-you whenever input is needed, whatever else is true', () => {
		fc.assert(
			fc.property(factsArb, (facts) => {
				expect(toServerThreadState({ ...facts, needsInput: true })).toBe('needs-you');
			}),
		);
	});

	it('returns working for a running thread that needs no input', () => {
		fc.assert(
			fc.property(factsArb, (facts) => {
				expect(toServerThreadState({ ...facts, needsInput: false, running: true })).toBe('working');
			}),
		);
	});

	it('returns failed or idle only from lastRunFailed when nothing waits or runs', () => {
		fc.assert(
			fc.property(factsArb, (facts) => {
				const settled = { ...facts, needsInput: false, running: false };
				expect(toServerThreadState(settled)).toBe(settled.lastRunFailed ? 'failed' : 'idle');
			}),
		);
	});
});

describe('toThreadOverview properties', () => {
	it('never throws, and an ISO activity time names the same instant as the facts', () => {
		fc.assert(
			fc.property(factsArb, (facts) => {
				const overview = toThreadOverview(facts);
				expect(overview.state).toBe(toServerThreadState(facts));
				expect(overview.needsInput).toBe(facts.needsInput);
				if (Number.isNaN(facts.lastActivityAt.getTime())) {
					expect(overview.lastActivityAt).toBeUndefined();
				} else {
					expect(new Date(overview.lastActivityAt!).getTime()).toBe(facts.lastActivityAt.getTime());
				}
			}),
		);
	});
});

describe('toServerThreadFacts properties', () => {
	it('uses a time of the newest turn, never the session time, when the thread has a turn', () => {
		fc.assert(
			fc.property(fc.boolean(), runArb, dateArb, (needsInput, run, sessionUpdatedAt) => {
				const result = toServerThreadFacts({ needsInput, run, sessionUpdatedAt });
				const { createdAt, startedAt, stoppedAt } = run.latest;
				expect([createdAt, startedAt, stoppedAt]).toContain(result.lastActivityAt);
				expect(result.lastActivityAt).not.toBe(sessionUpdatedAt);
			}),
		);
	});

	it('passes needsInput and running through unchanged', () => {
		fc.assert(
			fc.property(
				fc.boolean(),
				fc.option(runArb, { nil: undefined }),
				dateArb,
				(needsInput, run, at) => {
					const result = toServerThreadFacts({ needsInput, run, sessionUpdatedAt: at });
					expect(result.needsInput).toBe(needsInput);
					expect(result.running).toBe(run?.running ?? false);
				},
			),
		);
	});
});
