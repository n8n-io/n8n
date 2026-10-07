/**
 * Turns what the server knows about an Assistant thread into the thread list fields.
 * The server has no per-viewer "last viewed" time, so it reports 'ready' and 'done' as 'idle'.
 */

import type {
	AgentExecutionStatus,
	InstanceAiThreadOverview,
	InstanceAiThreadServerState,
} from '@n8n/api-types';

import type { ThreadRunSummary } from '../../agents/repositories/agent-execution.repository';
import { classifyThreadState, type ThreadState } from './thread-state';

export type ServerThreadFacts = {
	/** An approval or a question waits for the owner. */
	needsInput: boolean;
	/** A turn of the thread is running. */
	running: boolean;
	/** The newest turn ended with an error or was interrupted. */
	lastRunFailed: boolean;
	/** End or start of the newest turn, else the last session change. */
	lastActivityAt: Date;
};

export type ThreadOverviewFields = Required<
	Pick<InstanceAiThreadOverview, 'state' | 'needsInput'>
> &
	Pick<InstanceAiThreadOverview, 'lastActivityAt'>;

/** A stop by the user ('cancelled') is not a failure. */
const FAILED_RUN_STATUSES: ReadonlySet<AgentExecutionStatus> = new Set<AgentExecutionStatus>([
	'error',
	'interrupted',
]);

/** Only the editor knows what the viewer saw, so it decides between 'ready' and 'done'. */
const SERVER_STATE_BY_THREAD_STATE: Readonly<Record<ThreadState, InstanceAiThreadServerState>> = {
	'needs-you': 'needs-you',
	working: 'working',
	failed: 'failed',
	ready: 'idle',
	done: 'idle',
};

/**
 * Combines the batch reads for one thread. We use the session update time only when the
 * thread has no turn, because a rename also changes it.
 */
export function toServerThreadFacts(input: {
	needsInput: boolean;
	run: ThreadRunSummary | undefined;
	sessionUpdatedAt: Date;
}): ServerThreadFacts {
	const { needsInput, run, sessionUpdatedAt } = input;
	if (!run) {
		return { needsInput, running: false, lastRunFailed: false, lastActivityAt: sessionUpdatedAt };
	}
	const { latest } = run;
	return {
		needsInput,
		running: run.running,
		lastRunFailed: FAILED_RUN_STATUSES.has(latest.status),
		lastActivityAt: latest.stoppedAt ?? latest.startedAt ?? latest.createdAt,
	};
}

/** Reuses the precedence of `classifyThreadState` (needs input, then working, then failed), so the two rules stay the same. */
export function toServerThreadState(facts: ServerThreadFacts): InstanceAiThreadServerState {
	const state = classifyThreadState({
		pendingCount: facts.needsInput ? 1 : 0,
		running: facts.running,
		lastRunFailed: facts.lastRunFailed,
		lastActivityAt: facts.lastActivityAt,
	});
	return SERVER_STATE_BY_THREAD_STATE[state];
}

/** The wire fields leave out an invalid activity time, because `toISOString` throws on it. */
export function toThreadOverview(facts: ServerThreadFacts): ThreadOverviewFields {
	const overview = { state: toServerThreadState(facts), needsInput: facts.needsInput };
	const activity = facts.lastActivityAt;
	if (!(activity instanceof Date) || Number.isNaN(activity.getTime())) return overview;
	return { ...overview, lastActivityAt: activity.toISOString() };
}
