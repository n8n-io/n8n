/**
 * Pure helpers extracted from `desktop-assistant.service.ts`. Nothing here
 * touches DI or the database — these are deterministic functions over
 * request payloads, workflow JSON, and stored event-bus state.
 */
import type {
	DesktopAssistantApplyEditsRequest,
	DesktopAssistantDescriptionPart,
	DesktopAssistantRecommendationsRequest,
	DesktopAssistantTaskRequest,
} from '@n8n/api-types';
import type { StoredEvent } from '@n8n/instance-ai';
import type { ExecutionError, IConnections, INode, IRunExecutionData } from 'n8n-workflow';

import type { PROMOTED_FROM_THREAD_ID_KEY } from './constants';

// ── Message composition ─────────────────────────────────────────────────────

/** Compose the one-shot task message that gets handed to Instance AI.
 *
 *  The structured context the desktop app detects locally is rendered into the
 *  prompt as plain text so the orchestrator can act on it. `path` is surfaced
 *  as an explicit absolute path so the filesystem tools can target it (e.g.
 *  "clean up the current folder" resolves to the detected directory); for the
 *  PoC the gateway's base directory is the user home, broad enough to contain
 *  the detected folder. Attachments (e.g. a screenshot) are NOT rendered here —
 *  they ride the `attachments` channel into the run (see the service). */
export function composeOneShotMessage(body: DesktopAssistantTaskRequest): string {
	const context = body.context;
	const lines: string[] = [body.prompt.trim()];

	const looking = describeActiveContext(context);
	if (looking) {
		lines.push('', `Currently looking at: ${looking}`);
	}
	if (context?.url) {
		lines.push(`URL: ${context.url}`);
	}
	if (context?.path) {
		lines.push(`Path: ${context.path}`);
	}
	if (context?.selectedText) {
		lines.push('', 'Selected text:', '```', context.selectedText, '```');
	}
	return lines.join('\n');
}

/** Build the single "Currently looking at" phrase from the structured context,
 *  preferring the explicit `appHint` when the app supplied one, otherwise
 *  composing it from `app` and `windowTitle`. Returns `undefined` when there is
 *  nothing meaningful to say. */
export function describeActiveContext(
	context: DesktopAssistantTaskRequest['context'],
): string | undefined {
	if (!context) return undefined;
	if (context.appHint) return context.appHint;
	const app = context.app?.trim();
	const title = context.windowTitle?.trim();
	if (app && title) return `${app} — ${title}`;
	return app ?? title ?? undefined;
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

// ── Recommendations ──────────────────────────────────────────────────────────

/** System instructions for the recommendations generation. Static — the
 *  per-request grounding (context + connected integrations) rides in the input. */
export const RECOMMENDATIONS_INSTRUCTIONS = [
	'You suggest short, immediately-actionable automation tasks for a desktop AI',
	"assistant that can act on the user's computer and connected apps.",
	'',
	'Given what the user is currently looking at and the integrations they have',
	'already connected, propose distinct task ideas the assistant could run in one',
	'shot. Return the number of suggestions requested below (fewer only if you',
	'genuinely cannot suggest that many relevant ones).',
	'',
	'Rules:',
	'- Each task must be something the assistant can start right away from a single instruction.',
	'- Ground tasks in the provided context and connected integrations when present;',
	'  otherwise suggest broadly useful starter tasks.',
	'- Favour variety; avoid near-duplicate suggestions.',
	'- "title" is a short label (max ~6 words).',
	'- "prompt" is the first-person instruction the assistant will execute.',
	'- "icon" is a single emoji that fits the task.',
].join('\n');

/** Render the per-request grounding for the recommendations call: what the user
 *  is looking at plus the integrations they already have connected (types only —
 *  never secret values). Falls back to a generic instruction when nothing is known. */
export function composeRecommendationsInput(
	context: DesktopAssistantRecommendationsRequest['context'],
	connectedIntegrations: string[],
	limit: number,
): string {
	const lines: string[] = [`Suggest ${limit} distinct recommendations.`, ''];

	const looking = describeActiveContext(context);
	if (looking) lines.push(`Currently looking at: ${looking}`);
	if (context?.kind) lines.push(`Context type: ${context.kind}`);
	if (context?.url) lines.push(`URL: ${context.url}`);
	if (context?.path) lines.push(`Path: ${context.path}`);

	if (connectedIntegrations.length > 0) {
		lines.push(`Connected integrations: ${connectedIntegrations.join(', ')}`);
	}

	if (lines.length === 2) {
		lines.push('No specific context. Suggest generally useful starter automations.');
	}
	return lines.join('\n');
}

// ── Task detail description ─────────────────────────────────────────────────

/** System instructions for generating the task detail view's segmented
 *  description. Static — the workflow JSON and connected integrations ride in
 *  the input. The output schema (text/param parts) is enforced separately via
 *  structured output. */
export const TASK_DESCRIPTION_INSTRUCTIONS = [
	'You describe an n8n workflow as one short natural-language sentence (two at',
	"most) for a desktop assistant's task detail view, segmented into parts:",
	'- "text" parts: static prose.',
	'- "param" parts: a concrete value the user may want to tweak.',
	'',
	'Rules:',
	'- The concatenated parts must read as one fluent sentence. Put all spacing',
	'  and punctuation in the text parts; param values carry no surrounding spaces.',
	'- Address the user\'s intent, not the mechanics ("Send me a short news brief',
	'  every weekday morning.", "When a file is added to Google Drive, copy it to',
	'  Dropbox."). Never mention nodes, triggers, or n8n internals.',
	'- Mark as params ONLY clearly tweakable concrete values: a schedule',
	'  ("weekday at 6am"), a service (Gmail, Slack), a folder, a grouping',
	'  criterion. At most 4 params; prefer fewer.',
	'- For each param, provide 2-3 realistic alternatives in "options" (do not',
	'  repeat the current value). For service params, prefer alternatives from the',
	'  connected integrations listed in the input when they make sense, but you',
	'  may include one popular not-yet-connected service as well.',
	'- Each alternative must be something the workflow could plausibly be changed',
	'  to with a small edit. Keep param values short (1-4 words).',
	'- If the workflow is too complex to render faithfully as one short sentence,',
	'  return text-only parts summarizing what it does and no params at all.',
].join('\n');

/** Cap on the serialized workflow JSON fed to the description generation, so a
 *  giant workflow doesn't blow up the prompt. Truncation is acceptable: the
 *  instructions tell the model to fall back to a coarse text-only summary. */
const MAX_DESCRIPTION_WORKFLOW_JSON = 20_000;

/** Render the grounding input for the task-description call: workflow name,
 *  pruned workflow JSON (node names/types/parameters + connections — no ids,
 *  positions, or credentials), and the user's connected integration types. */
export function composeTaskDescriptionInput(
	workflowName: string,
	nodes: INode[],
	connections: IConnections,
	connectedIntegrations: string[],
): string {
	const prunedNodes = nodes.map((node) => ({
		name: node.name,
		type: node.type,
		disabled: node.disabled || undefined,
		parameters: node.parameters,
	}));
	let workflowJson = JSON.stringify({ nodes: prunedNodes, connections });
	if (workflowJson.length > MAX_DESCRIPTION_WORKFLOW_JSON) {
		workflowJson = `${workflowJson.slice(0, MAX_DESCRIPTION_WORKFLOW_JSON)}… (truncated)`;
	}

	const lines = [`Workflow name: ${workflowName}`, '', 'Workflow JSON:', workflowJson];
	if (connectedIntegrations.length > 0) {
		lines.push('', `Connected integrations: ${connectedIntegrations.join(', ')}`);
	}
	return lines.join('\n');
}

/** Loosely-shaped part as the model returns it; normalization tightens it into
 *  the API shape. */
export interface RawDescriptionPart {
	kind: 'text' | 'param';
	text?: string;
	value?: string;
	options?: string[];
}

/** Caps mirroring the description instructions; enforced again here so a
 *  misbehaving generation can't bloat the stored cache. */
const MAX_DESCRIPTION_PARAMS = 4;
const MAX_PARAM_OPTIONS = 4;

/**
 * Tighten the model's parts into the API shape: drop empty/malformed parts,
 * merge adjacent text parts, de-duplicate options (and the current value out
 * of them), cap param/option counts, and assign stable per-description param
 * ids (`p1`, `p2`, …) used by the apply-edits request to reference a chip.
 */
export function normalizeDescriptionParts(
	rawParts: RawDescriptionPart[],
): DesktopAssistantDescriptionPart[] {
	const parts: DesktopAssistantDescriptionPart[] = [];
	let paramCount = 0;
	for (const raw of rawParts) {
		if (raw.kind === 'param' && raw.value?.trim() && paramCount < MAX_DESCRIPTION_PARAMS) {
			const value = raw.value.trim();
			const options = [...new Set((raw.options ?? []).map((o) => o.trim()))]
				.filter((o) => o.length > 0 && o !== value)
				.slice(0, MAX_PARAM_OPTIONS);
			paramCount += 1;
			parts.push({ kind: 'param', id: `p${paramCount}`, value, options });
			continue;
		}
		// Anything else degrades to text (a param without a value, params past the
		// cap) so the sentence still reads fully.
		const text = raw.kind === 'text' ? raw.text : (raw.value ?? raw.text);
		if (!text) continue;
		const previous = parts.at(-1);
		if (previous?.kind === 'text') previous.text += text;
		else parts.push({ kind: 'text', text });
	}
	return parts;
}

/** Render the description parts back into the plain sentence, used to ground
 *  the apply-edits instruction. */
export function renderDescriptionSentence(parts: DesktopAssistantDescriptionPart[]): string {
	return parts.map((part) => (part.kind === 'text' ? part.text : part.value)).join('');
}

/** Compose the apply-edits message handed to Instance AI: the workflow to
 *  modify, the sentence the user was looking at, and the exact value changes
 *  they picked. The `desktop-assistant-edit` prompt mode supplies the strict
 *  behavioural rules (change only what's listed, no text output). */
export function composeApplyEditsMessage(
	workflowId: string,
	workflowName: string,
	parts: DesktopAssistantDescriptionPart[],
	changes: DesktopAssistantApplyEditsRequest['changes'],
): string {
	const lines = [
		`Apply the following changes to the existing workflow "${workflowName}" (id: ${workflowId}).`,
		'',
		'The workflow is currently described to the user as:',
		`"${renderDescriptionSentence(parts)}"`,
		'',
		'Changes:',
	];
	for (const change of changes) {
		lines.push(`- Change "${change.from}" to "${change.to}".`);
	}
	return lines.join('\n');
}

// ── Display helpers ─────────────────────────────────────────────────────────

/**
 * Extract a leading emoji cluster from a string. Returns `{ emoji, rest }` where
 * `rest` has the emoji and any following whitespace stripped. If the string does
 * not start with an emoji, `emoji` is `undefined` and `rest` is the original
 * input.
 *
 * Handles:
 *  - Plain pictographics (🍌)
 *  - Variation-selector-16 presentation (⚠️)
 *  - Skin-tone modifiers attached without ZWJ (👍🏽)
 *  - ZWJ sequences with optional modifiers (👨‍💻, 👨🏽‍💻)
 *  - Flag sequences as pairs of Regional_Indicator codepoints (🇩🇪)
 *
 * Intentionally narrow to emoji classes so plain text starting with a number
 * or punctuation is not mistaken for an emoji.
 */
const LEADING_EMOJI_REGEX =
	/^(?:\p{Regional_Indicator}\p{Regional_Indicator}|\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F)?(?:\u200d\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\uFE0F)?)*)\s*/u;

export function splitLeadingEmoji(input: string): { emoji?: string; rest: string } {
	const match = input.match(LEADING_EMOJI_REGEX);
	if (!match) return { rest: input };
	const emoji = match[0].replace(/\s+$/, '');
	return { emoji, rest: input.slice(match[0].length) };
}

/** Clamp a user-supplied history `limit` into a sane bounded range. */
export function clampLimit(limit: number | undefined): number {
	if (!limit || limit < 1) return 20;
	if (limit > 100) return 100;
	return limit;
}

// ── execution error summary ──────────────────────────────────────────────────

/** Cap the derived error one-liner so a verbose message stays a single line. */
const MAX_ERROR_MESSAGE_LENGTH = 140;

/**
 * Derive a short, human-readable one-liner describing what failed, from a run's
 * execution data. Mirrors the editor's `getExecutionErrorMessage`: prefer the
 * error message (then its description), prefix the failing node name when known,
 * and fall back to a node-only phrasing. Returns `message: undefined` when there
 * is nothing meaningful to show (the client then renders a generic label).
 */
export function summarizeExecutionError(data: IRunExecutionData | undefined): {
	message?: string;
	node?: string;
} {
	const resultData = data?.resultData;
	const error = resultData?.error;

	const node = extractErrorNode(error) ?? nonEmpty(resultData?.lastNodeExecuted);
	const raw = nonEmpty(error?.message) ?? nonEmpty(error?.description);

	let message: string | undefined;
	if (node && raw) message = `${node}: ${raw}`;
	else if (raw) message = raw;
	else if (node) message = `Problem in node ‘${node}’`;

	return { message: message ? toOneLine(message) : undefined, node };
}

/** The failing node's name, when the error carries one (NodeApiError/NodeOperationError). */
function extractErrorNode(error: ExecutionError | undefined): string | undefined {
	if (!error || !('node' in error) || !error.node) return undefined;
	return nonEmpty(typeof error.node === 'string' ? error.node : error.node.name);
}

/** Trimmed string, or `undefined` when empty/whitespace/missing. */
function nonEmpty(value: string | null | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

/** Collapse whitespace/newlines into a single line and truncate with an ellipsis. */
function toOneLine(text: string): string {
	const collapsed = text.replace(/\s+/g, ' ').trim();
	return collapsed.length > MAX_ERROR_MESSAGE_LENGTH
		? `${collapsed.slice(0, MAX_ERROR_MESSAGE_LENGTH - 1).trimEnd()}…`
		: collapsed;
}

// ── workflow_entity.meta.desktopAssistant ────────────────────────────────────

export interface StoredDesktopAssistantMeta {
	icon?: string;
	[PROMOTED_FROM_THREAD_ID_KEY]?: string;
	/** Cached detail-view description, valid while `versionId` matches the workflow. */
	detail?: {
		versionId: string;
		parts: DesktopAssistantDescriptionPart[];
	};
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

/** Return the cached detail-view description parts when they were generated
 *  from the workflow version given, `undefined` otherwise (stale or absent).
 *  Defensive about shape: the meta blob is plain JSON anyone could write. */
export function readCachedTaskDetail(
	meta: unknown,
	versionId: string,
): DesktopAssistantDescriptionPart[] | undefined {
	const detail = readDesktopAssistantMeta(meta)?.detail;
	if (!detail || typeof detail !== 'object') return undefined;
	if (detail.versionId !== versionId) return undefined;
	if (!Array.isArray(detail.parts) || detail.parts.length === 0) return undefined;
	const valid = detail.parts.every(
		(part) =>
			(part?.kind === 'text' && typeof part.text === 'string') ||
			(part?.kind === 'param' &&
				typeof part.id === 'string' &&
				typeof part.value === 'string' &&
				Array.isArray(part.options)),
	);
	return valid ? detail.parts : undefined;
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
