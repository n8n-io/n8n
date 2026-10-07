/**
 * Decides what an Assistant thread needs from its owner, from facts the backend already has.
 * Simple mode uses it for the "Needs you" stack. Power mode uses it to group the thread list.
 */

export type ThreadState = 'needs-you' | 'working' | 'ready' | 'failed' | 'done';

export type ThreadFacts = {
	/** Open approvals or questions (suspended tool calls) in the thread. */
	pendingCount: number;
	/** A turn is running or queued. */
	running: boolean;
	/** The last finished turn ended with an error. */
	lastRunFailed: boolean;
	/** Time of the last message or turn. */
	lastActivityAt: Date;
	/** When the owner last opened the thread. `undefined` means never. */
	lastViewedAt?: Date;
};

export type ThreadListEntry = {
	state: ThreadState;
	lastActivityAt: Date;
};

/** Sort order of the thread list. Failed threads sit next to "Needs you" because the owner must act. */
export const THREAD_STATE_ORDER: readonly ThreadState[] = Object.freeze<ThreadState[]>([
	'needs-you',
	'failed',
	'working',
	'ready',
	'done',
]);

/** Returns the time in milliseconds, or `undefined` for a missing or invalid date. */
function toTime(value: Date | undefined): number | undefined {
	if (!(value instanceof Date)) return undefined;
	const time = value.getTime();
	return Number.isNaN(time) ? undefined : time;
}

/** Without two valid times we cannot prove that the owner saw the last activity, so we treat it as unseen. */
function hasUnseenActivity(facts: ThreadFacts): boolean {
	const activityTime = toTime(facts.lastActivityAt);
	const viewedTime = toTime(facts.lastViewedAt);
	if (activityTime === undefined || viewedTime === undefined) return true;
	return activityTime > viewedTime;
}

export function classifyThreadState(facts: ThreadFacts): ThreadState {
	// `> 0` also treats a negative or NaN count as "nothing pending".
	if (facts.pendingCount > 0) return 'needs-you';
	if (facts.running) return 'working';
	if (facts.lastRunFailed) return 'failed';
	return hasUnseenActivity(facts) ? 'ready' : 'done';
}

/** An unknown state sorts after all known states, so bad data cannot push a thread to the top. */
function stateRank(state: ThreadState): number {
	const index = THREAD_STATE_ORDER.indexOf(state);
	return index === -1 ? THREAD_STATE_ORDER.length : index;
}

/** Sorts by `THREAD_STATE_ORDER`, then newest activity first. An invalid activity date sorts last in its group. */
export function compareThreadsForList(a: ThreadListEntry, b: ThreadListEntry): number {
	const byState = stateRank(a.state) - stateRank(b.state);
	if (byState !== 0) return byState;

	const timeA = toTime(a.lastActivityAt) ?? Number.NEGATIVE_INFINITY;
	const timeB = toTime(b.lastActivityAt) ?? Number.NEGATIVE_INFINITY;
	if (timeA === timeB) return 0;
	return timeA > timeB ? -1 : 1;
}
