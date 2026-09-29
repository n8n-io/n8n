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

/** Looser than {@link TimelineEvent}: over-budget values become string previews. */
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
 * True for hard failures (`success: false`) and soft failures (a workflow
 * tool or sub-agent delegation that reported an error in its output);
 * declined approvals are not failures. Mirrors the rule in the agents
 * module's `computeExecutionFailureSummary`; a drift-pinning test compares
 * the two so they cannot diverge silently.
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
 * Caps every payload-bearing field of a timeline at `budget` chars and says
 * whether anything was cut. Also scrubs secrets: tool payloads are scrubbed
 * at record time, but model-generated text and reasoning content is not, so
 * it must not leave over MCP unscrubbed.
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

	// An over-budget value becomes a truncated preview of its JSON form.
	const capValue = (value: unknown): unknown => {
		if (value === undefined || value === null) return value;
		if (typeof value === 'string') return capText(value);
		let serialized: string;
		try {
			serialized = JSON.stringify(value) ?? String(value);
		} catch {
			serialized = String(value);
		}
		// Scrub before slicing: a secret that straddles the cut would otherwise
		// leave an unrecognized — and unscrubbed — prefix behind.
		const scrubbed = scrubSecretsInText(serialized);
		if (scrubbed.length <= budget) return scrubbed === serialized ? value : scrubbed;
		truncated = true;
		return scrubbed.slice(0, budget) + truncationMarker(scrubbed.length - budget);
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
			// Carries only a message reference — nothing to cap. No default case:
			// a new event variant must fail the build until it gets a decision here.
			case 'input':
				return { ...event };
		}
	});

	return { timeline, truncated };
}

/**
 * Free-text fields are scrubbed and capped so a long prompt or provider
 * error cannot blow the response budget; `timeline` is deliberately never
 * copied here.
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
 * True when a blob-stored timeline could not be read (missing, corrupted, or
 * an unconfigured location) — the read degrades to null, which must not be
 * presented as a clean empty run.
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
