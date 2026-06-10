/*
 * Watches a one-shot assistant run over the thread event stream and interprets
 * the raw `InstanceAiEvent`s into a final `AssistantRunResult`. The
 * ThreadService stream is the app's only realtime channel; run interpretation
 * lives here in the renderer, on top of the thread client.
 */
import type { DesktopAssistantTaskOutcome, InstanceAiEvent } from '../../shared/types';
import { getThreadClient } from '../services/thread-client';

/** The one-shot agent's final self-report tool; its args are the structured outcome. */
const OUTCOME_TOOL_NAME = 'report-desktop-task-outcome';

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
 */
export interface AssistantRunResult {
	ok: boolean;
	status: 'success' | 'error' | 'canceled' | 'timeout';
	tookAction: boolean;
	outcome?: DesktopAssistantTaskOutcome;
	error?: string;
}

/** Defensively narrow the outcome tool's args; the agent fills them, so trust nothing. */
function parseOutcome(args: Record<string, unknown>): DesktopAssistantTaskOutcome | undefined {
	const { success, title, summary, failureReason } = args;
	if (typeof success !== 'boolean' || typeof title !== 'string' || typeof summary !== 'string') {
		return undefined;
	}
	if (failureReason !== undefined && typeof failureReason !== 'string') return undefined;
	return { success, title, summary, failureReason };
}

/** "mcp__playwright__browser_click" → "browser click" — a rough progress label, not a translation. */
function humanizeToolLabel(toolName: string): string {
	const name = toolName.split('__').pop() ?? toolName;
	return name
		.replace(/^mcp[-_]/i, '')
		.replace(/[-_]+/g, ' ')
		.trim();
}

/**
 * Follow a single assistant run on the thread's event stream until it finishes,
 * and report how it ended. Subscribes without a `lastEventId` so the server
 * replays the whole thread — that closes the race between the run starting and
 * us subscribing. `onProgress` fires with a humanized tool label on every tool
 * call the agent makes (except its final outcome report).
 */
export async function watchAssistantRun(
	threadId: string,
	runId: string,
	options?: { onProgress?: (label: string) => void },
): Promise<AssistantRunResult> {
	const client = getThreadClient();

	return await new Promise<AssistantRunResult>((resolve) => {
		let tookAction = false;
		let outcome: DesktopAssistantTaskOutcome | undefined;

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
				} else {
					tookAction = true;
					options?.onProgress?.(humanizeToolLabel(event.payload.toolName));
				}
				return;
			}

			if (event.type === 'run-finish') {
				const { status, reason } = event.payload;
				finish({
					ok: status === 'completed',
					status: status === 'completed' ? 'success' : status === 'cancelled' ? 'canceled' : 'error',
					tookAction,
					outcome,
					error: reason,
				});
			}
		};

		const deadline = setTimeout(() => {
			finish({ ok: false, status: 'timeout', tookAction, outcome });
		}, RUN_DEADLINE_MS);

		client.listen(threadId, listener);
	});
}
