import type { TimelineItem } from './session-timeline.types';
import { isErroredTimelineItem } from './session-timeline.utils';

/**
 * Where an item sits in a turn. `message`: what the person sent. `reply`: the
 * agent's last message of the run, the one the person reads as the answer.
 * `event`: something the person must see between the two, such as an approval
 * or a failed run. `step`: the agent's own work, shown in a group under the
 * message.
 */
export type TimelineItemRole = 'message' | 'reply' | 'event' | 'step';

export interface TimelineStepGroup {
	/** Stable while the run grows: the run id and the index of its first step. */
	id: string;
	executionId: string;
	indexes: number[];
	hasError: boolean;
	start: number;
	end: number;
}

export type TimelineEntry =
	| { type: 'item'; index: number; role: Exclude<TimelineItemRole, 'step'> }
	| { type: 'steps'; group: TimelineStepGroup };

const EVENT_KINDS = new Set<TimelineItem['kind']>([
	'execution-error',
	'suspension',
	'hitl-response',
	'background-task-signal',
]);

/** The last agent message of each run. A run that ended without one has no reply. */
export function finalReplyIndexes(items: TimelineItem[]): Set<number> {
	const lastByExecution = new Map<string, number>();
	items.forEach((item, index) => {
		if (item.kind === 'agent') lastByExecution.set(item.executionId, index);
	});
	return new Set(lastByExecution.values());
}

function roleOf(item: TimelineItem, index: number, replies: Set<number>): TimelineItemRole {
	if (item.kind === 'user') return 'message';
	if (replies.has(index)) return 'reply';
	if (EVENT_KINDS.has(item.kind)) return 'event';
	return 'step';
}

/**
 * The rows of a session as turns: each message, its reply and the events
 * between them stay at the top level, and each unbroken run of steps becomes
 * one group. `indexes` are the items to show, in order, after any filter; the
 * reply is still named from the whole run, so a filter cannot turn a step into
 * a reply.
 */
export function groupTimelineEntries(items: TimelineItem[], indexes: number[]): TimelineEntry[] {
	const replies = finalReplyIndexes(items);
	const entries: TimelineEntry[] = [];
	let open: TimelineStepGroup | null = null;

	for (const index of indexes) {
		const item = items[index];
		const role = roleOf(item, index, replies);
		if (role !== 'step') {
			open = null;
			entries.push({ type: 'item', index, role });
			continue;
		}
		if (!open || open.executionId !== item.executionId) {
			open = {
				id: `${item.executionId}:${index}`,
				executionId: item.executionId,
				indexes: [],
				hasError: false,
				start: item.timestamp,
				end: item.timestamp,
			};
			entries.push({ type: 'steps', group: open });
		}
		open.indexes.push(index);
		open.hasError ||= isErroredTimelineItem(item);
		open.end = Math.max(open.end, item.endTimestamp ?? item.timestamp);
	}
	return entries;
}

/** The step indexes inside groups that are not in `openGroupIds`. */
export function stepIndexesHiddenBy(
	entries: TimelineEntry[],
	openGroupIds: ReadonlySet<string>,
): Set<number> {
	const hidden = new Set<number>();
	for (const entry of entries) {
		if (entry.type !== 'steps' || openGroupIds.has(entry.group.id)) continue;
		for (const index of entry.group.indexes) hidden.add(index);
	}
	return hidden;
}
