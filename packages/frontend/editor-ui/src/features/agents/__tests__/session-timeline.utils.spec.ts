import { describe, it, expect } from 'vitest';
import {
	computeIdleRanges,
	itemFilterKey,
	sessionBounds,
	kindColorToken,
	formatDuration,
	IDLE_THRESHOLD_MS,
} from '../session-timeline.utils';
import type { TimelineItem } from '../session-timeline.types';

function item(partial: Partial<TimelineItem>): TimelineItem {
	return {
		kind: 'agent',
		executionId: 'e1',
		timestamp: 0,
		...partial,
	};
}

describe('computeIdleRanges', () => {
	it('returns [] when no gaps exceed threshold', () => {
		const items = [item({ timestamp: 0 }), item({ timestamp: 1000 })];
		expect(computeIdleRanges(items)).toEqual([]);
	});

	it('detects a gap greater than 10 minutes between events', () => {
		const items = [item({ timestamp: 0 }), item({ timestamp: IDLE_THRESHOLD_MS + 1 })];
		expect(computeIdleRanges(items)).toEqual([{ start: 0, end: IDLE_THRESHOLD_MS + 1 }]);
	});

	it('excludes gaps adjacent to a suspension (before the gap)', () => {
		const items = [
			item({ kind: 'suspension', timestamp: 0 }),
			item({ timestamp: IDLE_THRESHOLD_MS + 1 }),
		];
		expect(computeIdleRanges(items)).toEqual([]);
	});

	it('excludes gaps adjacent to a suspension (after the gap)', () => {
		const items = [
			item({ timestamp: 0 }),
			item({ kind: 'suspension', timestamp: IDLE_THRESHOLD_MS + 1 }),
		];
		expect(computeIdleRanges(items)).toEqual([]);
	});

	it('never produces a trailing idle gap after the last event', () => {
		const items = [item({ timestamp: 0 })];
		expect(computeIdleRanges(items)).toEqual([]);
	});

	it('uses endTimestamp when set for the previous item', () => {
		const items = [
			item({ timestamp: 0, endTimestamp: 100 }),
			item({ timestamp: 100 + IDLE_THRESHOLD_MS + 1 }),
		];
		expect(computeIdleRanges(items)).toEqual([{ start: 100, end: 100 + IDLE_THRESHOLD_MS + 1 }]);
	});
});

describe('itemFilterKey', () => {
	it('returns the literal kind for every event', () => {
		expect(itemFilterKey(item({ kind: 'user' }))).toBe('user');
		expect(itemFilterKey(item({ kind: 'agent' }))).toBe('agent');
		expect(itemFilterKey(item({ kind: 'working-memory' }))).toBe('working-memory');
		expect(itemFilterKey(item({ kind: 'suspension' }))).toBe('suspension');
	});

	it('returns "workflow" for workflow events', () => {
		expect(itemFilterKey(item({ kind: 'workflow', toolName: 'run-wf' }))).toBe('workflow');
	});

	it('groups all generic tool events under a single "tool" key', () => {
		expect(itemFilterKey(item({ kind: 'tool', toolName: 'http' }))).toBe('tool');
		expect(itemFilterKey(item({ kind: 'tool', toolName: 'search' }))).toBe('tool');
		expect(itemFilterKey(item({ kind: 'tool' }))).toBe('tool');
	});
});

describe('sessionBounds', () => {
	it('returns min timestamp and max endTimestamp (or timestamp) across items', () => {
		const items = [
			item({ timestamp: 100 }),
			item({ timestamp: 500, endTimestamp: 800 }),
			item({ timestamp: 300 }),
		];
		expect(sessionBounds(items)).toEqual({ start: 100, end: 800 });
	});

	it('returns { start: 0, end: 1 } for empty input', () => {
		expect(sessionBounds([])).toEqual({ start: 0, end: 1 });
	});

	it('enforces a minimum span of 1ms for single-item sessions', () => {
		expect(sessionBounds([item({ timestamp: 500 })])).toEqual({ start: 500, end: 501 });
	});
});

describe('kindColorToken', () => {
	it('maps each kind to a CSS token', () => {
		expect(kindColorToken('user')).toBe('var(--color--blue-400)');
		expect(kindColorToken('agent')).toBe('var(--color--secondary)');
		expect(kindColorToken('tool')).toBe('var(--color--success)');
		expect(kindColorToken('workflow')).toBe('var(--color--primary)');
		expect(kindColorToken('working-memory')).toBe('var(--color--foreground--shade-1)');
		expect(kindColorToken('suspension')).toBe('var(--color--warning)');
	});
});

describe('formatDuration', () => {
	it('returns empty string for zero or negative input', () => {
		expect(formatDuration(0)).toBe('');
		expect(formatDuration(-100)).toBe('');
	});
	it('formats sub-second durations as ms', () => {
		expect(formatDuration(450)).toBe('450ms');
	});
	it('formats sub-minute durations with one decimal of seconds', () => {
		expect(formatDuration(1500)).toBe('1.5s');
		expect(formatDuration(3400)).toBe('3.4s');
	});
	it('formats sub-hour durations as minutes and seconds', () => {
		expect(formatDuration(60_000)).toBe('1m');
		expect(formatDuration(90_000)).toBe('1m 30s');
		expect(formatDuration(15 * 60_000 + 5_000)).toBe('15m 5s');
	});
	it('formats multi-hour durations as hours and minutes', () => {
		expect(formatDuration(60 * 60_000)).toBe('1h');
		expect(formatDuration(2 * 60 * 60_000 + 30 * 60_000)).toBe('2h 30m');
	});
});

import { flattenExecutionsToTimelineItems } from '../session-timeline.utils';
import type {
	AgentExecution,
	AgentExecutionTimelineEvent,
} from '../composables/useAgentThreadsApi';

function exec(overrides: Partial<AgentExecution> = {}): AgentExecution {
	return {
		id: 'e-1',
		threadId: 't-1',
		agentId: 'a-1',
		status: 'success',
		createdAt: '2026-04-24T10:00:00Z',
		startedAt: '2026-04-24T10:00:00Z',
		stoppedAt: null,
		duration: 0,
		userMessage: '',
		assistantResponse: '',
		model: null,
		promptTokens: null,
		completionTokens: null,
		totalTokens: null,
		cost: null,
		toolCalls: null,
		timeline: null,
		error: null,
		hitlStatus: null,
		workingMemory: null,
		source: null,
		...overrides,
	};
}

function withTimeline(
	events: AgentExecutionTimelineEvent[],
	overrides: Partial<AgentExecution> = {},
): AgentExecution {
	return exec({ timeline: events, ...overrides });
}

describe('flattenExecutionsToTimelineItems', () => {
	it('emits a user item from userMessage using execution startedAt', () => {
		const items = flattenExecutionsToTimelineItems([exec({ userMessage: 'hello' })]);
		expect(items[0]).toMatchObject({
			kind: 'user',
			content: 'hello',
			timestamp: new Date('2026-04-24T10:00:00Z').getTime(),
		});
	});

	it('maps a text timeline event to an agent item', () => {
		const items = flattenExecutionsToTimelineItems([
			withTimeline([{ type: 'text', content: 'hi there', timestamp: 1234 }]),
		]);
		expect(items[0]).toMatchObject({ kind: 'agent', content: 'hi there', timestamp: 1234 });
	});

	it('maps a workflow tool-call timeline event to kind:workflow with metadata', () => {
		const items = flattenExecutionsToTimelineItems([
			withTimeline([
				{
					type: 'tool-call',
					kind: 'workflow',
					name: 'run-wf',
					toolCallId: 'tc-1',
					input: {},
					output: { executionId: 'exec-42', status: 'success' },
					startTime: 1000,
					endTime: 1500,
					success: true,
					workflowId: 'wf-1',
					workflowName: 'Run WF',
					workflowExecutionId: 'exec-42',
					triggerType: 'manual',
				},
			]),
		]);
		const wf = items.find((i) => i.kind === 'workflow');
		expect(wf).toMatchObject({
			workflowId: 'wf-1',
			workflowName: 'Run WF',
			workflowExecutionId: 'exec-42',
			workflowTriggerType: 'manual',
			timestamp: 1000,
			endTimestamp: 1500,
			toolSuccess: true,
		});
	});

	it('maps a regular tool-call timeline event to kind:tool', () => {
		const items = flattenExecutionsToTimelineItems([
			withTimeline([
				{
					type: 'tool-call',
					kind: 'tool',
					name: 'http',
					toolCallId: 'tc-1',
					input: { method: 'GET' },
					output: { ok: true },
					startTime: 1000,
					endTime: 1200,
					success: true,
				},
			]),
		]);
		const tool = items.find((i) => i.kind === 'tool');
		expect(tool).toMatchObject({
			toolName: 'http',
			timestamp: 1000,
			endTimestamp: 1200,
			toolInput: { method: 'GET' },
			toolOutput: { ok: true },
		});
		expect(tool?.workflowId).toBeUndefined();
	});

	it('treats tool-call events without a kind field as kind:tool (defensive)', () => {
		const items = flattenExecutionsToTimelineItems([
			withTimeline([
				{
					type: 'tool-call',
					name: 'http',
					toolCallId: 'tc-1',
					input: {},
					output: { ok: true },
					startTime: 0,
					endTime: 100,
					success: true,
				},
			]),
		]);
		expect(items[0]?.kind).toBe('tool');
	});

	it('maps a working-memory timeline event', () => {
		const items = flattenExecutionsToTimelineItems([
			withTimeline([{ type: 'working-memory', content: 'note', timestamp: 2000 }]),
		]);
		expect(items[0]).toMatchObject({ kind: 'working-memory', content: 'note', timestamp: 2000 });
	});

	it('maps a suspension timeline event', () => {
		const items = flattenExecutionsToTimelineItems([
			withTimeline([
				{ type: 'suspension', toolName: 'approval-tool', toolCallId: 'tc-1', timestamp: 3000 },
			]),
		]);
		expect(items[0]).toMatchObject({
			kind: 'suspension',
			toolName: 'approval-tool',
			timestamp: 3000,
		});
	});

	it('tags resumed:true on the first text event of a resumed execution only', () => {
		const items = flattenExecutionsToTimelineItems([
			withTimeline(
				[
					{ type: 'text', content: 'first', timestamp: 100 },
					{ type: 'text', content: 'second', timestamp: 200 },
				],
				{ hitlStatus: 'resumed' },
			),
		]);
		expect(items[0]?.resumed).toBe(true);
		expect(items[1]?.resumed).toBeFalsy();
	});

	it('returns [] when execution has no timeline events', () => {
		const items = flattenExecutionsToTimelineItems([exec({ timeline: null })]);
		expect(items).toEqual([]);
	});

	it('preserves chronological order across multiple executions', () => {
		const items = flattenExecutionsToTimelineItems([
			withTimeline([{ type: 'text', content: 'a', timestamp: 100 }], { id: 'e-a' }),
			withTimeline([{ type: 'text', content: 'b', timestamp: 200 }], { id: 'e-b' }),
		]);
		expect(items.map((i) => i.content)).toEqual(['a', 'b']);
	});
});
