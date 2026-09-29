import type { TimelineEvent } from '@/modules/agents/execution-recorder';
import { computeExecutionFailureSummary } from '@/modules/agents/utils/execution-failure-summary';

import {
	DEFAULT_TIMELINE_EVENT_CHAR_BUDGET,
	isFailedToolCallEvent,
	truncateTimeline,
} from '../tools/agents/agent-session-log.utils';

const toolCall = (overrides: Record<string, unknown> = {}): TimelineEvent =>
	({
		type: 'tool-call',
		kind: 'tool',
		name: 'fetch',
		toolCallId: 'call-1',
		input: { url: 'https://x.test' },
		output: { ok: true },
		startTime: 1,
		endTime: 2,
		success: true,
		...overrides,
	}) as TimelineEvent;

describe('isFailedToolCallEvent', () => {
	// A mixed timeline covering every branch of the failure rule.
	const timeline: TimelineEvent[] = [
		{ type: 'text', content: 'Working', timestamp: 1 },
		toolCall(),
		toolCall({ toolCallId: 'hard', success: false, output: { error: 'boom' } }),
		toolCall({
			toolCallId: 'soft-workflow',
			kind: 'workflow',
			success: true,
			output: { status: 'error' },
		}),
		toolCall({
			toolCallId: 'soft-subagent',
			name: 'delegate_subagent',
			success: true,
			output: { status: 'failed' },
		}),
		toolCall({ toolCallId: 'declined', success: false, output: { declined: true } }),
		toolCall({ toolCallId: 'open', success: false, endTime: 0 }),
	];

	it('keeps hard and soft failures, and drops declined and open calls', () => {
		const failed = timeline.filter(isFailedToolCallEvent);
		expect(failed.map((event) => event.toolCallId)).toEqual([
			'hard',
			'soft-workflow',
			'soft-subagent',
		]);
	});

	/**
	 * Drift guard: the local predicate mirrors the failure rule inside
	 * `computeExecutionFailureSummary`. When the rule changes in the agents
	 * module, this pin fails and the predicate must follow.
	 */
	it('agrees with computeExecutionFailureSummary on the failure count', () => {
		const summary = computeExecutionFailureSummary({
			timeline,
			status: 'success',
			error: null,
			stoppedAt: 100,
		});
		expect(timeline.filter(isFailedToolCallEvent)).toHaveLength(summary?.count ?? 0);
	});
});

describe('truncateTimeline', () => {
	it('scrubs secrets from model-generated text content', () => {
		const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123signature';
		const { timeline } = truncateTimeline(
			[{ type: 'text', content: `Your token is ${jwt}`, timestamp: 1 }],
			DEFAULT_TIMELINE_EVENT_CHAR_BUDGET,
		);
		expect(timeline[0].content).toBe('Your token is [REDACTED]');
	});

	it('caps background-task-signal payloads against the budget', () => {
		const tasks = Array.from({ length: 100 }, (_, i) => ({
			id: `task-${i}`,
			title: 't'.repeat(100),
			kind: 'background',
			status: 'completed',
		}));
		const { timeline, truncated } = truncateTimeline(
			[{ type: 'background-task-signal', signal: { tasks }, timestamp: 1 } as TimelineEvent],
			200,
		);
		expect(truncated).toBe(true);
		expect(typeof timeline[0].signal).toBe('string');
		expect(String(timeline[0].signal)).toContain('… [truncated');
	});
});
