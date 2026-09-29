import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import type { AgentExecution } from '@/modules/agents/entities/agent-execution.entity';
import type { TimelineEvent } from '@/modules/agents/execution-recorder';

/**
 * Default character cap per timeline event value returned over MCP. Timeline
 * text, reasoning, and tool payloads are unbounded, and one session can hold
 * many events, so the cap keeps a default read inside client token limits.
 * Matches the spirit of the 4,000-char child-trace persistence budget.
 */
export const DEFAULT_TIMELINE_EVENT_CHAR_BUDGET = 2_000;

/**
 * A timeline event shaped for the MCP response. Values over the character
 * budget are replaced by a truncated string preview, so the shape is looser
 * than {@link TimelineEvent}.
 */
export type ShapedTimelineEvent = Record<string, unknown>;

const truncationMarker = (omitted: number) => `… [truncated ${omitted} chars]`;

/**
 * Applies the per-event character budget to every payload-bearing field of a
 * timeline. Returns the shaped events and whether anything was cut, so the
 * tool can tell the client to raise `truncate` when it needs full payloads.
 */
export function truncateTimeline(
	events: TimelineEvent[],
	budget: number,
): { timeline: ShapedTimelineEvent[]; truncated: boolean } {
	let truncated = false;

	const capText = (value: string): string => {
		if (value.length <= budget) return value;
		truncated = true;
		return value.slice(0, budget) + truncationMarker(value.length - budget);
	};

	// Caps a value of unknown shape at `budget` characters of its JSON form. A
	// value over budget becomes its truncated JSON string, so the client always
	// sees a preview instead of an oversized payload.
	const capValue = (value: unknown): unknown => {
		if (value === undefined || value === null) return value;
		if (typeof value === 'string') return capText(value);
		let serialized: string;
		try {
			serialized = JSON.stringify(value) ?? String(value);
		} catch {
			serialized = String(value);
		}
		if (serialized.length <= budget) return value;
		truncated = true;
		return serialized.slice(0, budget) + truncationMarker(serialized.length - budget);
	};

	const timeline = events.map((event): ShapedTimelineEvent => {
		switch (event.type) {
			case 'text':
			case 'reasoning':
				return { ...event, content: capText(event.content) };
			case 'tool-call':
				return {
					...event,
					input: capValue(event.input),
					output: capValue(event.output),
					...(event.nodeParameters !== undefined && {
						nodeParameters: capValue(event.nodeParameters),
					}),
					...(event.childTrace !== undefined && { childTrace: capValue(event.childTrace) }),
				};
			case 'suspension':
				return {
					...event,
					...(event.input !== undefined && { input: capValue(event.input) }),
					...(event.suspendPayload !== undefined && {
						suspendPayload: capValue(event.suspendPayload),
					}),
				};
			case 'hitl-response':
				return { ...event, response: capValue(event.response) };
			case 'background-task-signal':
				return { ...event };
		}
	});

	return { timeline, truncated };
}

/** Compact per-execution summary shared by get_agent_session and get_agent_execution. */
export function toExecutionSummary(execution: AgentExecution) {
	return {
		executionId: execution.id,
		status: execution.status,
		startedAt: execution.startedAt?.toISOString() ?? null,
		stoppedAt: execution.stoppedAt?.toISOString() ?? null,
		duration: execution.duration,
		model: execution.model,
		promptTokens: execution.promptTokens,
		completionTokens: execution.completionTokens,
		totalTokens: execution.totalTokens,
		cost: execution.cost,
		error: execution.error,
		failureSummary: execution.failureSummary,
		hitlStatus: execution.hitlStatus,
		source: execution.source,
		userMessage: execution.userMessage,
	};
}

/** Session metadata without access-control internals (ownerId, accessScope). */
export function toSessionSummary(thread: AgentExecutionThread) {
	return {
		sessionId: thread.id,
		title: thread.title,
		taskId: thread.taskId,
		createdAt: thread.createdAt.toISOString(),
		updatedAt: thread.updatedAt.toISOString(),
		totals: {
			promptTokens: thread.totalPromptTokens,
			completionTokens: thread.totalCompletionTokens,
			cost: thread.totalCost,
			duration: thread.totalDuration,
		},
	};
}
