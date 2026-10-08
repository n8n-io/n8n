import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { threadDisplayState, toTime, type ThreadDisplayState } from './threadDisplayState';

/** The Power mode groups, in the order that the sidebar shows them. */
export const THREAD_GROUPS = ['needs-you', 'working', 'ready', 'done'] as const;

export type ThreadGroup = (typeof THREAD_GROUPS)[number];

export interface ThreadGroupEntry {
	group: ThreadGroup;
	/** The chats to show, newest activity first. */
	threads: InstanceAiThreadSummary[];
	/** The number of chats in the group, shown or not. */
	total: number;
}

export interface GroupThreadsOptions {
	lastViewedAt: (threadId: string) => string | undefined;
	/** The chat that the user has open. It always shows in its group. */
	openThreadId?: string;
	/** The number of chats that a group shows when it is not expanded. */
	perGroup?: number;
	/** The groups that show all of their chats. */
	expanded?: ReadonlySet<ThreadGroup>;
}

// A failed chat needs the user too. The row keeps the failed icon.
const GROUP_OF_STATE = {
	'needs-you': 'needs-you',
	failed: 'needs-you',
	working: 'working',
	ready: 'ready',
	done: 'done',
} as const satisfies Record<ThreadDisplayState, ThreadGroup>;

/** A chat without a state (the server sends states for the first 50 chats only) is done. */
export function threadGroup(state: ThreadDisplayState | undefined): ThreadGroup {
	return state === undefined ? 'done' : GROUP_OF_STATE[state];
}

/** Chats after the first 50 have no activity time, so their last update counts. */
function activityTime(thread: InstanceAiThreadSummary): number {
	return toTime(thread.lastActivityAt) ?? toTime(thread.updatedAt) ?? Number.NEGATIVE_INFINITY;
}

/** Newest activity first. The sort is stable, so equal times keep the order of the list. */
function byNewestActivity(a: InstanceAiThreadSummary, b: InstanceAiThreadSummary): number {
	const timeA = activityTime(a);
	const timeB = activityTime(b);
	if (timeA === timeB) return 0;
	return timeA > timeB ? -1 : 1;
}

/**
 * The first `limit` chats. When the open chat is not one of them, it takes the last place,
 * as in the flat list. It is older than the chats before it, so the order stays correct.
 */
function visibleThreads(
	sorted: InstanceAiThreadSummary[],
	limit: number,
	openThreadId: string | undefined,
): InstanceAiThreadSummary[] {
	const shown = sorted.slice(0, limit);
	if (shown.some((thread) => thread.id === openThreadId)) return shown;
	const openThread = sorted.find((thread) => thread.id === openThreadId);
	if (!openThread) return shown;
	return [...shown.slice(0, Math.max(limit - 1, 0)), openThread];
}

/**
 * Puts each chat in the group of what it needs from the viewer. Returns only the groups
 * that have chats, in the fixed order of `THREAD_GROUPS`.
 */
export function groupThreads(
	threads: readonly InstanceAiThreadSummary[],
	{ lastViewedAt, openThreadId, perGroup = 5, expanded }: GroupThreadsOptions,
): ThreadGroupEntry[] {
	const members: Record<ThreadGroup, InstanceAiThreadSummary[]> = {
		'needs-you': [],
		working: [],
		ready: [],
		done: [],
	};
	for (const thread of threads) {
		members[threadGroup(threadDisplayState(thread, lastViewedAt(thread.id)))].push(thread);
	}

	return THREAD_GROUPS.filter((group) => members[group].length > 0).map((group) => {
		const sorted = members[group].toSorted(byNewestActivity);
		const limit = expanded?.has(group) ? sorted.length : Math.max(perGroup, 0);
		return { group, threads: visibleThreads(sorted, limit, openThreadId), total: sorted.length };
	});
}
