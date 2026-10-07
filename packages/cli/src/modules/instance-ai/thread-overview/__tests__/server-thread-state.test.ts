import type { AgentExecutionStatus } from '@n8n/api-types';

import type { ThreadRunSummary } from '../../../agents/repositories/agent-execution.repository';
import {
	toServerThreadFacts,
	toServerThreadState,
	toThreadOverview,
	type ServerThreadFacts,
} from '../server-thread-state';

const CREATED = new Date('2026-10-01T09:00:00.000Z');
const STARTED = new Date('2026-10-01T09:00:01.000Z');
const STOPPED = new Date('2026-10-01T09:05:00.000Z');
const SESSION_UPDATED = new Date('2026-10-02T12:00:00.000Z');
const INVALID = new Date('not a date');

function facts(overrides: Partial<ServerThreadFacts> = {}): ServerThreadFacts {
	return {
		needsInput: false,
		running: false,
		lastRunFailed: false,
		lastActivityAt: STOPPED,
		...overrides,
	};
}

function run(latest: Partial<ThreadRunSummary['latest']> = {}, running = false): ThreadRunSummary {
	return {
		latest: {
			status: 'success',
			createdAt: CREATED,
			startedAt: STARTED,
			stoppedAt: STOPPED,
			...latest,
		},
		running,
	};
}

describe('toServerThreadState', () => {
	it('returns needs-you when an approval or a question waits for the owner', () => {
		expect(toServerThreadState(facts({ needsInput: true }))).toBe('needs-you');
	});

	it('returns working when a turn is running', () => {
		expect(toServerThreadState(facts({ running: true }))).toBe('working');
	});

	it('returns failed when the newest turn failed', () => {
		expect(toServerThreadState(facts({ lastRunFailed: true }))).toBe('failed');
	});

	it('returns idle when nothing waits, runs or failed', () => {
		expect(toServerThreadState(facts())).toBe('idle');
	});

	it('gives needs-you priority over a running or failed turn', () => {
		expect(
			toServerThreadState(facts({ needsInput: true, running: true, lastRunFailed: true })),
		).toBe('needs-you');
		expect(toServerThreadState(facts({ needsInput: true, lastRunFailed: true }))).toBe('needs-you');
	});

	it('gives working priority over a failed turn', () => {
		expect(toServerThreadState(facts({ running: true, lastRunFailed: true }))).toBe('working');
	});

	// The editor decides between "Ready to review" and "Done" from the viewer's last visit.
	it.each([
		['a valid activity time', STOPPED],
		['an invalid activity time', INVALID],
		['the epoch', new Date(0)],
	])('returns idle, never ready or done, for %s', (_name, lastActivityAt) => {
		expect(toServerThreadState(facts({ lastActivityAt }))).toBe('idle');
	});
});

describe('toServerThreadFacts', () => {
	it('uses the session update time and reports nothing when the thread has no turn', () => {
		expect(
			toServerThreadFacts({ needsInput: false, run: undefined, sessionUpdatedAt: SESSION_UPDATED }),
		).toEqual({
			needsInput: false,
			running: false,
			lastRunFailed: false,
			lastActivityAt: SESSION_UPDATED,
		});
	});

	it('keeps needsInput for a thread without a turn', () => {
		expect(
			toServerThreadFacts({ needsInput: true, run: undefined, sessionUpdatedAt: SESSION_UPDATED })
				.needsInput,
		).toBe(true);
	});

	it.each<[AgentExecutionStatus, boolean]>([
		['error', true],
		['interrupted', true],
		['cancelled', false],
		['success', false],
		['running', false],
	])('sets lastRunFailed for a newest turn with status %s to %s', (status, failed) => {
		const result = toServerThreadFacts({
			needsInput: false,
			run: run({ status }),
			sessionUpdatedAt: SESSION_UPDATED,
		});
		expect(result.lastRunFailed).toBe(failed);
	});

	it('takes running from the run summary, also when the newest turn failed', () => {
		const result = toServerThreadFacts({
			needsInput: false,
			run: run({ status: 'error' }, true),
			sessionUpdatedAt: SESSION_UPDATED,
		});
		expect(result).toMatchObject({ running: true, lastRunFailed: true });
		expect(toServerThreadState(result)).toBe('working');
	});

	it('keeps needsInput when the thread has a turn', () => {
		const result = toServerThreadFacts({
			needsInput: true,
			run: run(),
			sessionUpdatedAt: SESSION_UPDATED,
		});
		expect(result).toEqual({
			needsInput: true,
			running: false,
			lastRunFailed: false,
			lastActivityAt: STOPPED,
		});
	});

	it('uses the stop time of the newest turn, not the newer session update time', () => {
		const result = toServerThreadFacts({
			needsInput: false,
			run: run(),
			sessionUpdatedAt: SESSION_UPDATED,
		});
		expect(result.lastActivityAt).toBe(STOPPED);
	});

	it('uses the start time of a turn that has not stopped', () => {
		const result = toServerThreadFacts({
			needsInput: false,
			run: run({ status: 'running', stoppedAt: null }, true),
			sessionUpdatedAt: SESSION_UPDATED,
		});
		expect(result.lastActivityAt).toBe(STARTED);
	});

	it('uses the creation time of a turn without start and stop times', () => {
		const result = toServerThreadFacts({
			needsInput: false,
			run: run({ startedAt: null, stoppedAt: null }),
			sessionUpdatedAt: SESSION_UPDATED,
		});
		expect(result.lastActivityAt).toBe(CREATED);
	});
});

describe('toThreadOverview', () => {
	it('returns the state, needsInput and the activity time as an ISO string', () => {
		expect(toThreadOverview(facts({ needsInput: true }))).toEqual({
			state: 'needs-you',
			needsInput: true,
			lastActivityAt: '2026-10-01T09:05:00.000Z',
		});
	});

	it('returns needsInput false for a thread that waits for nothing', () => {
		expect(toThreadOverview(facts({ running: true }))).toEqual({
			state: 'working',
			needsInput: false,
			lastActivityAt: '2026-10-01T09:05:00.000Z',
		});
	});

	it('leaves out an invalid activity time but keeps the state', () => {
		const overview = toThreadOverview(facts({ lastRunFailed: true, lastActivityAt: INVALID }));

		expect(overview).toEqual({ state: 'failed', needsInput: false });
		expect('lastActivityAt' in overview).toBe(false);
	});

	it('leaves out an activity time that is not a Date', () => {
		const overview = toThreadOverview(
			facts({ lastActivityAt: '2026-10-01T09:05:00.000Z' as unknown as Date }),
		);

		expect(overview).toEqual({ state: 'idle', needsInput: false });
	});
});
