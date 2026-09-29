import { isRecord } from '@n8n/utils/is-record';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

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

/** Character cap for free-text fields on execution summaries (userMessage, error). */
export const SUMMARY_FIELD_CHAR_BUDGET = 1_000;

/**
 * A timeline event shaped for the MCP response. Values over the character
 * budget are replaced by a truncated string preview, so the shape is looser
 * than {@link TimelineEvent}.
 */
export type ShapedTimelineEvent = Record<string, unknown>;

type ToolCallEvent = Extract<TimelineEvent, { type: 'tool-call' }>;

function isDeclinedToolOutput(output: unknown): boolean {
	return isRecord(output) && output.declined === true;
}

function isSoftFailure(event: ToolCallEvent): boolean {
	if (!isRecord(event.output)) return false;
	return (
		(event.kind === 'workflow' && event.output.status === 'error') ||
		(event.name === 'delegate_subagent' && event.output.status === 'failed')
	);
}

/**
 * True when a closed tool-call event counts as a failure. Covers hard
 * failures (`success: false`) and soft failures (a workflow tool or sub-agent
 * delegation that reported an error in its output). Declined approvals are
 * not failures.
 *
 * Mirrors the failure rule in `computeExecutionFailureSummary`
 * (`@/modules/agents/utils/execution-failure-summary`). A drift-pinning test
 * in `agent-session-log.utils.test.ts` compares this filter's count against
 * that summary, so the two rules cannot diverge silently.
 */
export function isFailedToolCallEvent(event: TimelineEvent): event is ToolCallEvent {
	return (
		event.type === 'tool-call' &&
		event.endTime !== 0 &&
		!isDeclinedToolOutput(event.output) &&
		(!event.success || isSoftFailure(event))
	);
}

const truncationMarker = (omitted: number) => `… [truncated ${omitted} chars]`;

function capAndScrubText(value: string, budget: number): string {
	const scrubbed = scrubSecretsInText(value);
	if (scrubbed.length <= budget) return scrubbed;
	return scrubbed.slice(0, budget) + truncationMarker(scrubbed.length - budget);
}

/**
 * Applies the per-event character budget to every payload-bearing field of a
 * timeline. Returns the shaped events and whether anything was cut, so the
 * tool can tell the client to raise `truncate` when it needs full payloads.
 *
 * Tool payloads, suspensions, and HITL responses are secret-scrubbed at
 * record time; model-generated `text` and `reasoning` content is not, so this
 * boundary scrubs it before it leaves over MCP.
 */
export function truncateTimeline(
	events: TimelineEvent[],
	budget: number,
): { timeline: ShapedTimelineEvent[]; truncated: boolean } {
	let truncated = false;

	const capText = (value: string): string => {
		const scrubbed = scrubSecretsInText(value);
		if (scrubbed.length <= budget) return scrubbed;
		truncated = true;
		return scrubbed.slice(0, budget) + truncationMarker(scrubbed.length - budget);
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
		return (
			scrubSecretsInText(serialized.slice(0, budget)) + truncationMarker(serialized.length - budget)
		);
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
				return { ...event, signal: capValue(event.signal) };
		}
	});

	return { timeline, truncated };
}

/**
 * Compact per-execution summary shared by get_agent_session and
 * get_agent_execution. Free-text fields are scrubbed and capped so a long
 * prompt or provider error cannot blow the response budget. The `timeline`
 * column is deliberately never copied here.
 */
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
		error:
			execution.error === null ? null : capAndScrubText(execution.error, SUMMARY_FIELD_CHAR_BUDGET),
		failureSummary: execution.failureSummary,
		hitlStatus: execution.hitlStatus,
		source: execution.source,
		userMessage:
			execution.userMessage === null || execution.userMessage === undefined
				? null
				: capAndScrubText(execution.userMessage, SUMMARY_FIELD_CHAR_BUDGET),
	};
}

/**
 * True when an execution's timeline lives in a blob store but could not be
 * read (missing, corrupted, or an unconfigured storage location). The detail
 * read degrades to a null timeline in that case, and the tool must report it
 * instead of presenting a clean empty run.
 */
export function isTimelineUnavailable(execution: AgentExecution): boolean {
	return execution.storedAt !== 'db' && execution.timeline === null;
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
