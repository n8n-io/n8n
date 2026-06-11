/*
 * Interprets a one-shot assistant run's raw `InstanceAiEvent`s into a final
 * `AssistantRunResult`. The ThreadService event stream is the app's only
 * realtime channel.
 */
import type {
	DesktopAssistantDescriptionPart,
	DesktopAssistantTaskOutcome,
	DesktopAssistantTaskPlan,
	InstanceAiEvent,
} from '../../shared/types';
import { getThreadClient } from '../services/thread-client';

/** The one-shot agent's final self-report tool; its args are the structured outcome. */
const OUTCOME_TOOL_NAME = 'report-desktop-task-outcome';

/**
 * The tool the agent calls — instead of executing — when the request implies a
 * non-manual trigger. The normalized plan (param ids assigned server-side) is
 * carried on the tool-result event, not the tool-call args.
 */
const PLAN_TOOL_NAME = 'propose-task-plan';

/** Stop watching after 10 minutes; the run may still finish on the instance. */
const RUN_DEADLINE_MS = 10 * 60 * 1000;

/**
 * Final outcome of a one-shot assistant run. `timeout` means the app stopped
 * waiting; the run may still finish on the instance. `tookAction` is false when
 * the run ended without making any tool calls — the assistant declined the ask
 * (ambiguous, recurring, or out of scope) and the client should hand off to the
 * instance UI instead of claiming success. `outcome` is the agent's structured
 * self-report (task success, title, summary) when it filed one; prefer it over
 * the `tookAction` heuristic, and use `outcome.title` as the task label.
 * `plan` is set when the agent proposed a task plan instead of executing —
 * the client should open the draft view for the user to review and promote.
 */
export interface AssistantRunResult {
	ok: boolean;
	status: 'success' | 'error' | 'canceled' | 'timeout';
	tookAction: boolean;
	outcome?: DesktopAssistantTaskOutcome;
	plan?: DesktopAssistantTaskPlan;
	error?: string;
}

/** Defensively narrow the outcome tool's args; the agent fills them, so trust nothing. */
function parseOutcome(args: Record<string, unknown>): DesktopAssistantTaskOutcome | undefined {
	const { success, title, summary, failureReason } = args;
	if (typeof success !== 'boolean' || typeof title !== 'string' || typeof summary !== 'string') {
		return undefined;
	}
	if (failureReason !== undefined && typeof failureReason !== 'string') return undefined;
	// A malformed icon doesn't invalidate the report — it just gets dropped.
	const icon = typeof args.icon === 'string' && args.icon.trim() ? args.icon.trim() : undefined;
	return { success, title, summary, icon, failureReason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isDescriptionPart(value: unknown): value is DesktopAssistantDescriptionPart {
	if (!isRecord(value)) return false;
	if (value.kind === 'text') return typeof value.text === 'string';
	return (
		value.kind === 'param' &&
		typeof value.id === 'string' &&
		typeof value.value === 'string' &&
		Array.isArray(value.options) &&
		value.options.every((option) => typeof option === 'string')
	);
}

function isTriggerKind(value: unknown): value is DesktopAssistantTaskPlan['trigger'] {
	return value === 'schedule' || value === 'webhook' || value === 'poll';
}

/**
 * Defensively narrow the plan tool's result payload (`{ result, plan }`); the
 * plan is server-normalized but still crosses an untyped event stream.
 */
function parsePlan(result: unknown): DesktopAssistantTaskPlan | undefined {
	if (!isRecord(result) || !isRecord(result.plan)) return undefined;
	const { title, icon, parts, trigger, connectionsNeeded, estimatedMinutesSaved } = result.plan;
	if (typeof title !== 'string' || !isTriggerKind(trigger)) return undefined;
	if (!Array.isArray(parts) || parts.length === 0) return undefined;
	const narrowedParts = parts.filter(isDescriptionPart);
	if (narrowedParts.length !== parts.length) return undefined;
	if (!Array.isArray(connectionsNeeded)) return undefined;
	const connections = connectionsNeeded.filter(
		(connection): connection is string => typeof connection === 'string',
	);
	if (connections.length !== connectionsNeeded.length) return undefined;
	return {
		title,
		icon: typeof icon === 'string' && icon.trim() ? icon.trim() : undefined,
		parts: narrowedParts,
		trigger,
		connectionsNeeded: connections,
		estimatedMinutesSaved:
			typeof estimatedMinutesSaved === 'number' ? estimatedMinutesSaved : undefined,
	};
}

/**
 * Follow a single assistant run on the thread's event stream until it finishes,
 * and report how it ended. Subscribes without a `lastEventId` so the server
 * replays the whole thread — that closes the race between the run starting and
 * us subscribing.
 */
export async function watchAssistantRun(
	threadId: string,
	runId: string,
): Promise<AssistantRunResult> {
	const client = getThreadClient();

	return await new Promise<AssistantRunResult>((resolve) => {
		let tookAction = false;
		let outcome: DesktopAssistantTaskOutcome | undefined;
		let plan: DesktopAssistantTaskPlan | undefined;
		const planToolCallIds = new Set<string>();

		const finish = (result: AssistantRunResult) => {
			clearTimeout(deadline);
			client.unlisten(threadId, listener);
			resolve(result);
		};

		const listener = (event: InstanceAiEvent) => {
			if (event.runId !== runId) return;

			if (event.type === 'tool-call') {
				if (event.payload.toolName === OUTCOME_TOOL_NAME) {
					// The outcome report is bookkeeping, not action — don't count it.
					outcome = parseOutcome(event.payload.args) ?? outcome;
				} else if (event.payload.toolName === PLAN_TOOL_NAME) {
					// Proposing a plan isn't action either; remember the call id so the
					// normalized plan can be read off the matching tool-result.
					planToolCallIds.add(event.payload.toolCallId);
				} else {
					tookAction = true;
				}
				return;
			}

			if (event.type === 'tool-result' && planToolCallIds.has(event.payload.toolCallId)) {
				plan = parsePlan(event.payload.result) ?? plan;
				return;
			}

			if (event.type === 'run-finish') {
				const { status, reason } = event.payload;
				finish({
					ok: status === 'completed',
					status:
						status === 'completed' ? 'success' : status === 'cancelled' ? 'canceled' : 'error',
					tookAction,
					outcome,
					plan,
					error: reason,
				});
			}
		};

		const deadline = setTimeout(() => {
			finish({ ok: false, status: 'timeout', tookAction, outcome, plan });
		}, RUN_DEADLINE_MS);

		client.listen(threadId, listener);
	});
}
