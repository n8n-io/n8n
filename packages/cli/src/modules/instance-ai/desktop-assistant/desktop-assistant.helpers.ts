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
import {
	CHANNEL_PARAM_GUIDANCE,
	PARAM_OPTIONS_COUNT_GUIDANCE,
	PROMOTED_BUILD_METADATA_KEY,
	renderDescriptionSentence,
	type StoredEvent,
} from '@n8n/instance-ai';
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

/**
 * Flatten stored message content into plain text. String content passes
 * through; multi-part content keeps only `{ type: 'text' }` parts (an
 * attachment part would otherwise leak megabytes of base64 into a prompt).
 */
export function extractTextContent(content: unknown): string {
	if (typeof content === 'string') return content;
	if (!Array.isArray(content)) return '';
	return content
		.filter(isTextPart)
		.map((part) => part.text)
		.join('\n')
		.trim();
}

function isTextPart(part: unknown): part is { type: 'text'; text: string } {
	if (typeof part !== 'object' || part === null) return false;
	const candidate = part as { type?: unknown; text?: unknown };
	return candidate.type === 'text' && typeof candidate.text === 'string';
}

/** Leads with the replay-vs-fresh decision so the recorded tool calls don't
 *  anchor the model toward literal replay. Naming rules (plain text, no emoji)
 *  live in the promote system prompt.
 *
 *  With a `configuredSentence` (a promote of a proposed task plan rather than
 *  an executed run), the message grounds the build on the user-configured
 *  description instead — there is nothing recorded to replay. */
export function composePromoteMessage(
	originalPrompt: string,
	name: string | undefined,
	configuredSentence?: string,
): string {
	const trimmedName = name?.trim();
	const naming = trimmedName ? ` Name it "${trimmedName}".` : '';
	if (configuredSentence) {
		return `Turn the task from this thread into a repeatable workflow. This thread contains no executed run to replay — the user reviewed and configured a task plan instead. Build the workflow from the configured description below, using its values verbatim (the schedule, services, and folders are the user's final choices), with the non-manual trigger it implies.${naming}\n\nConfigured description:\n"${configuredSentence}"\n\nThe original request, as context only:\n\n${originalPrompt}`;
	}
	return `Turn the task from this thread into a repeatable workflow. Decide first, from the original request below: must a future run reproduce the recorded results exactly, or generate content fresh? The recorded tool calls show what was done, not necessarily what should be replayed literally.${naming} The original request:\n\n${originalPrompt}`;
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
	`- ${CHANNEL_PARAM_GUIDANCE}`,
	'- For each param, provide realistic alternatives in "options" (do not repeat',
	`  the current value) — ${PARAM_OPTIONS_COUNT_GUIDANCE}.`,
	'  For service params, prefer alternatives from the connected integrations',
	'  listed in the input when they make sense, but you may include one popular',
	'  not-yet-connected service as well.',
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

// Moved to @n8n/instance-ai (shared with the propose-task-plan tool);
// re-exported so existing imports stay stable.
export { normalizeDescriptionParts, renderDescriptionSentence } from '@n8n/instance-ai';
export type { RawDescriptionPart } from '@n8n/instance-ai';

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
	/** The task's durable detail-view description, written at promote time and
	 *  kept in sync deterministically by apply-edits. */
	detail?: {
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

/** Return the stored detail-view description parts when present and
 *  well-formed, `undefined` otherwise. Defensive about shape: the meta blob is
 *  plain JSON anyone could write. Only `parts` is picked, so legacy rows that
 *  carry an extra `versionId` key still read fine. */
export function readCachedTaskDetail(meta: unknown): DesktopAssistantDescriptionPart[] | undefined {
	const detail = readDesktopAssistantMeta(meta)?.detail;
	if (!detail || typeof detail !== 'object') return undefined;
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

/** Apply chip edits to the stored description parts: each referenced param's
 *  value becomes its `to`, and its `from` takes the picked value's slot in
 *  `options` — the full choice set is conserved, so an edit never removes an
 *  alternative from the dropdown. */
export function applyChangesToDescriptionParts(
	parts: DesktopAssistantDescriptionPart[],
	changes: DesktopAssistantApplyEditsRequest['changes'],
): DesktopAssistantDescriptionPart[] {
	const changeByParamId = new Map(changes.map((change) => [change.paramId, change]));
	return parts.map((part) => {
		if (part.kind !== 'param') return part;
		const change = changeByParamId.get(part.id);
		if (!change) return part;
		return {
			...part,
			value: change.to,
			options: [change.from, ...part.options.filter((o) => o !== change.to && o !== change.from)],
		};
	});
}

// ── Run-outcome extraction ───────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export type PromoteOutcomeReport =
	| { success: true; workflowId: string }
	| { success: false; failureReason?: string };

/**
 * Read the completion report a promote run filed via `report-promote-outcome`
 * from thread metadata. `undefined` means the given run filed no (valid)
 * report — the run died or the model skipped the call — which callers treat
 * as a failure without a reason.
 */
export function extractPromoteOutcomeReport(
	metadata: unknown,
	runId: string,
): PromoteOutcomeReport | undefined {
	if (!isRecord(metadata)) return undefined;
	const report = metadata[PROMOTED_BUILD_METADATA_KEY];
	if (!isRecord(report) || report.runId !== runId) return undefined;
	if (report.success === true) {
		const { workflowId } = report;
		if (typeof workflowId !== 'string' || workflowId.length === 0) return undefined;
		return { success: true, workflowId };
	}
	if (report.success === false) {
		const { failureReason } = report;
		return {
			success: false,
			...(typeof failureReason === 'string' && failureReason.length > 0 ? { failureReason } : {}),
		};
	}
	return undefined;
}

/**
 * Read the workflow id off a `report-desktop-task-outcome` tool-call event from
 * the given run. The one-shot prompt instructs the agent to include
 * `workflowId` when the task built a workflow; only a successful outcome
 * counts — a failed run's leftover workflow must not be published.
 */
export function extractReportedWorkflowId(
	storedEvent: StoredEvent,
	runId: string,
): string | undefined {
	const ev = storedEvent.event;
	if (ev.type !== 'tool-call' || ev.runId !== runId) return undefined;
	if (ev.payload.toolName !== 'report-desktop-task-outcome') return undefined;
	const { success, workflowId } = ev.payload.args;
	if (success !== true) return undefined;
	return typeof workflowId === 'string' && workflowId.length > 0 ? workflowId : undefined;
}
