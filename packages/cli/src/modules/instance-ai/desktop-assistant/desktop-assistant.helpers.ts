/**
 * Pure helpers extracted from `desktop-assistant.service.ts`. Nothing here
 * touches DI or the database — these are deterministic functions over
 * request payloads, workflow JSON, and stored event-bus state.
 */
import type { DesktopAssistantTaskRequest } from '@n8n/api-types';
import type { StoredEvent } from '@n8n/instance-ai';

import type { PROMOTED_FROM_THREAD_ID_KEY } from './constants';

// ── Message composition ─────────────────────────────────────────────────────

/** Compose the one-shot task message that gets handed to Instance AI. */
export function composeOneShotMessage(body: DesktopAssistantTaskRequest): string {
	const lines: string[] = [body.prompt.trim()];
	if (body.context?.appHint) {
		lines.push('', `Currently looking at: ${body.context.appHint}`);
	}
	if (body.context?.selectedText) {
		lines.push('', 'Selected text:', '```', body.context.selectedText, '```');
	}
	return lines.join('\n');
}

/** Compose the promote-thread message: grounds the build on the original
 *  prompt and nudges the model to pick a short, emoji-led workflow name. */
export function composePromoteMessage(originalPrompt: string, name: string | undefined): string {
	const trimmedName = name?.trim();
	const intro = trimmedName
		? `Promote this idea into a real workflow. Use the name "${trimmedName}" (prepend a fitting emoji if it does not already start with one):`
		: 'Promote this idea into a real workflow. Pick a short descriptive name for it as part of the build, and start that name with a single emoji that captures what the workflow does:';
	return `${intro}\n\n${originalPrompt}`;
}

// ── Display helpers ─────────────────────────────────────────────────────────

/**
 * Extract a leading emoji cluster from a string. Returns `{ emoji, rest }` where
 * `rest` has the emoji and any following whitespace stripped. If the string does
 * not start with an emoji, `emoji` is `undefined` and `rest` is the original
 * input.
 *
 * Supports common cases including zero-width-joiner sequences (e.g. 👨‍💻)
 * and emoji-variation selectors. We intentionally keep the regex narrow to
 * `Extended_Pictographic` so plain text starting with a number or symbol is not
 * mistaken for an emoji.
 */
export function splitLeadingEmoji(input: string): { emoji?: string; rest: string } {
	const match = input.match(
		/^(\p{Extended_Pictographic}(?:\u200d\p{Extended_Pictographic})*\uFE0F?)\s*/u,
	);
	if (!match) return { rest: input };
	return { emoji: match[1], rest: input.slice(match[0].length) };
}

/** Clamp a user-supplied history `limit` into a sane bounded range. */
export function clampLimit(limit: number | undefined): number {
	if (!limit || limit < 1) return 20;
	if (limit > 100) return 100;
	return limit;
}

// ── workflow_entity.meta.desktopAssistant ────────────────────────────────────

export interface StoredDesktopAssistantMeta {
	icon?: string;
	[PROMOTED_FROM_THREAD_ID_KEY]?: string;
}

/** Read the optional `meta.desktopAssistant` blob written to `workflow_entity.meta`
 *  by the promote post-build hook. Returns `undefined` for any missing or
 *  malformed shape so callers don't need their own type guards. */
export function readDesktopAssistantMeta(meta: unknown): StoredDesktopAssistantMeta | undefined {
	if (!meta || typeof meta !== 'object') return undefined;
	const candidate = (meta as { desktopAssistant?: unknown }).desktopAssistant;
	if (!candidate || typeof candidate !== 'object') return undefined;
	return candidate as StoredDesktopAssistantMeta;
}

// ── Build-outcome extraction (two orchestrator paths) ────────────────────────

/**
 * Inspect a stored SSE event and return the workflow id of a completed
 * build-workflow planned task, or undefined otherwise.
 *
 * The `build-workflow` tool runs in a sub-agent / planned-task context, so
 * its `tool-result` event is published on the sub-agent's thread, NOT on the
 * parent promote thread. The signal that DOES reach the parent thread is
 * `tasks-update`: each carries `planItems[]` where the build-workflow planned
 * task has its `workflowId` populated, and the matching entry in `tasks[]`
 * moves to status `'done'`. We require BOTH — a populated `workflowId` AND
 * a `done` status — to avoid acting on an in-flight task that already has its
 * id slot allocated.
 */
export function extractBuiltWorkflowId(storedEvent: StoredEvent): string | undefined {
	const ev = storedEvent.event;
	if (ev.type !== 'tasks-update') return undefined;
	const payload = ev.payload as {
		tasks?: { tasks?: Array<{ id?: unknown; status?: unknown }> };
		planItems?: Array<{ id?: unknown; kind?: unknown; workflowId?: unknown }>;
	};
	const planItems = payload.planItems;
	const taskList = payload.tasks?.tasks;
	if (!Array.isArray(planItems) || !Array.isArray(taskList)) return undefined;

	const doneTaskIds = new Set<string>();
	for (const task of taskList) {
		if (typeof task.id === 'string' && task.status === 'done') doneTaskIds.add(task.id);
	}

	for (const item of planItems) {
		if (item.kind !== 'build-workflow') continue;
		if (typeof item.workflowId !== 'string') continue;
		if (typeof item.id !== 'string') continue;
		if (!doneTaskIds.has(item.id)) continue;
		return item.workflowId;
	}
	return undefined;
}

/**
 * Read the workflow id produced by a workflow-loop build for the given run
 * from `thread.metadata.instanceAiWorkflowLoop`. The workflow loop persists
 * a `lastBuildOutcome` per work item; we pick the one whose `runId` matches
 * the promote run we kicked off and that was successfully submitted.
 *
 * Returns `undefined` when no such outcome exists (e.g. the run finished
 * without ever invoking the workflow builder, the build failed, or the
 * metadata structure changed under us).
 */
export function extractWorkflowLoopBuildOutcome(
	metadata: unknown,
	runId: string,
): string | undefined {
	if (!metadata || typeof metadata !== 'object') return undefined;
	const loop = (metadata as { instanceAiWorkflowLoop?: unknown }).instanceAiWorkflowLoop;
	if (!loop || typeof loop !== 'object') return undefined;
	for (const workItem of Object.values(loop as Record<string, unknown>)) {
		if (!workItem || typeof workItem !== 'object') continue;
		const outcome = (workItem as { lastBuildOutcome?: unknown }).lastBuildOutcome;
		if (!outcome || typeof outcome !== 'object') continue;
		const o = outcome as { runId?: unknown; submitted?: unknown; workflowId?: unknown };
		if (o.runId !== runId) continue;
		if (o.submitted !== true) continue;
		if (typeof o.workflowId === 'string' && o.workflowId.length > 0) {
			return o.workflowId;
		}
	}
	return undefined;
}
