import { describe, it, expect } from 'vitest';
import {
	finalReplyIndexes,
	groupTimelineEntries,
	stepIndexesHiddenBy,
} from '../session-timeline-turns';
import type { TimelineItem } from '../session-timeline.types';

function item(partial: Partial<TimelineItem>): TimelineItem {
	return { kind: 'agent', executionId: 'e1', timestamp: 0, ...partial };
}

// One run as the Sessions view records it: the question, a line of narration,
// two tool calls, and the reply.
const run: TimelineItem[] = [
	item({ kind: 'user', timestamp: 0, content: 'When will order 9999 arrive?' }),
	item({ kind: 'agent', timestamp: 1, content: "I'll look it up." }),
	item({ kind: 'tool', timestamp: 2, toolName: 'tool_search', toolOutcome: 'success' }),
	item({ kind: 'tool', timestamp: 4, toolName: 'lookup_order', toolOutcome: 'error' }),
	item({ kind: 'agent', timestamp: 6, content: "I couldn't find that order." }),
];

describe('finalReplyIndexes', () => {
	it('takes the last agent message of each run as its reply', () => {
		const items = [
			...run,
			item({ kind: 'user', executionId: 'e2', timestamp: 10 }),
			item({ kind: 'agent', executionId: 'e2', timestamp: 11 }),
		];

		expect(finalReplyIndexes(items)).toEqual(new Set([4, 6]));
	});

	it('gives a run that ended without a message no reply', () => {
		expect(finalReplyIndexes(run.slice(0, 4))).toEqual(new Set([1]));
		expect(
			finalReplyIndexes([item({ kind: 'user' }), item({ kind: 'tool', timestamp: 1 })]),
		).toEqual(new Set());
	});
});

describe('groupTimelineEntries', () => {
	it('puts the work between the message and the reply into one group of steps', () => {
		const entries = groupTimelineEntries(run, [0, 1, 2, 3, 4]);

		expect(entries).toEqual([
			{ type: 'item', index: 0, role: 'message' },
			{
				type: 'steps',
				group: {
					id: 'e1:1',
					executionId: 'e1',
					indexes: [1, 2, 3],
					hasError: true,
					start: 1,
					end: 4,
				},
			},
			{ type: 'item', index: 4, role: 'reply' },
		]);
	});

	it('keeps errors, approvals and their answers at the turn level', () => {
		const items = [
			item({ kind: 'user', timestamp: 0 }),
			item({ kind: 'tool', timestamp: 1, endTimestamp: 2 }),
			item({ kind: 'suspension', timestamp: 3, hitlRequestType: 'approval' }),
			item({ kind: 'hitl-response', timestamp: 4, hitlResponseStatus: 'approved' }),
			item({ kind: 'tool', timestamp: 5 }),
			item({ kind: 'execution-error', timestamp: 6 }),
		];

		expect(groupTimelineEntries(items, [0, 1, 2, 3, 4, 5]).map(describeEntry)).toEqual([
			'message 0',
			'steps 1',
			'event 2',
			'event 3',
			'steps 4',
			'event 5',
		]);
	});

	it('starts a new group for each run', () => {
		const items = [
			item({ kind: 'tool', executionId: 'e1', timestamp: 0 }),
			item({ kind: 'tool', executionId: 'e2', timestamp: 1 }),
		];

		expect(groupTimelineEntries(items, [0, 1]).map(describeEntry)).toEqual(['steps 0', 'steps 1']);
	});

	it('groups only the indexes it is given, so a filter can leave a step out', () => {
		expect(groupTimelineEntries(run, [0, 3, 4]).map(describeEntry)).toEqual([
			'message 0',
			'steps 3',
			'reply 4',
		]);
	});

	it('names the reply from the whole run, not from the filtered indexes', () => {
		expect(groupTimelineEntries(run, [1])).toEqual([expect.objectContaining({ type: 'steps' })]);
	});
});

describe('stepIndexesHiddenBy', () => {
	it('lists the steps of every group that is not open', () => {
		const entries = groupTimelineEntries(run, [0, 1, 2, 3, 4]);

		expect(stepIndexesHiddenBy(entries, new Set())).toEqual(new Set([1, 2, 3]));
		expect(stepIndexesHiddenBy(entries, new Set(['e1:1']))).toEqual(new Set());
	});
});

function describeEntry(entry: ReturnType<typeof groupTimelineEntries>[number]): string {
	return entry.type === 'steps'
		? `steps ${entry.group.indexes.join(',')}`
		: `${entry.role} ${entry.index}`;
}
