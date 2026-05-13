import { generateText } from 'ai';
import type { z } from 'zod';

import type { AgentEventBus } from './event-bus';
import { createModel } from './model-factory';
import { advanceCursor, getDeltaSinceCursor } from './observation-cursor';
import { withObservationLock } from './observation-lock';
import { isLlmMessage } from '../sdk/message';
import { AgentEvent } from '../types/runtime/event';
import type { ModelConfig } from '../types/sdk/agent';
import type { BuiltMemory } from '../types/sdk/memory';
import type { AgentDbMessage } from '../types/sdk/message';
import {
	DEFAULT_OBSERVATION_GAP_THRESHOLD_MS,
	OBSERVATION_CATEGORIES,
	OBSERVATION_SCHEMA_VERSION,
	type BuiltObservationStore,
	type CompactFn,
	type NewObservation,
	type Observation,
	type ObservationCategory,
	type ObservationGapContext,
	type ObservationalMemoryTrigger,
	type ObserveFn,
} from '../types/sdk/observation';
import type { BuiltTelemetry } from '../types/telemetry';
import { parseWithSchema } from '../utils/parse';

const DEFAULT_LOCK_TTL_MS = 30_000;
const DEFAULT_COMPACTION_THRESHOLD = 5;

export const DEFAULT_OBSERVER_PROMPT = `You maintain thread working memory for an agent.

You receive the current working memory document and the new transcript delta since
the last observation. Extract durable thread state that should help later turns in
this same conversation: explicitly stated facts, preferences, identifiers, goals,
decisions, constraints, open follow-ups, corrections, and concrete progress.

Output JSON Lines only, one object per line:
{"kind":"observation","category":"<category>","text":"<short durable note>"}

Allowed categories: facts, preferences, goal, state, active_items, decisions,
follow_ups, continuity, superseded, other.

Rules:
- Prefer over-recording explicit user statements over missing useful state.
- Preserve user-stated facts and preferences verbatim when short enough.
- Record changes and corrections as latest state, not as debate history.
- Record decisions, open follow-ups, and concrete assistant-reported progress when
  they affect what should happen next in this thread.
- Use continuity only for useful re-entry context, repeated corrections, notable
  friction, or resume cues.
- Do not emit temporal-gap rows. Gaps are computed by the runtime.
- Do not record secrets, one-off small talk, or the assistant's own claims.
- Output an empty response when nothing durable changed.
- No markdown fences, preamble, or commentary.`;

export const DEFAULT_COMPACTOR_PROMPT = `You update the complete thread working memory document.

You receive:
- The working-memory template.
- The current working memory document.
- Queued observations from recent turns.

Return the full replacement working memory document, not a diff.

Rules:
- Preserve useful existing state.
- Add durable new facts, preferences, goals, decisions, constraints, and open follow-ups.
- Replace stale or contradicted items with the latest state.
- Move or remove stale items only when observations show they were corrected,
  resolved, abandoned, or superseded.
- Do not delete useful thread context merely because it is old.
- Keep continuity notes short and only when useful for re-entry, notable pauses,
  repeated corrections, or resume cues.
- Keep the document concise and current, not an append-only transcript.
- Do not include secrets or one-off details.
- If nothing changed, return the current working memory document unchanged.
- Output only the working memory document. No markdown fences or preamble.`;

export interface RunObservationalCycleOpts {
	memory: BuiltMemory & BuiltObservationStore;
	threadId: string;
	resourceId: string;
	model: ModelConfig;
	workingMemory: {
		template: string;
		structured: boolean;
		schema?: z.ZodObject<z.ZodRawShape>;
	};
	observe?: ObserveFn;
	compact?: CompactFn;
	trigger?: ObservationalMemoryTrigger;
	compactionThreshold?: number;
	gapThresholdMs?: number;
	observerPrompt?: string;
	compactorPrompt?: string;
	lockTtlMs?: number;
	telemetry?: BuiltTelemetry;
	eventBus?: AgentEventBus;
}

export type RunObservationalCycleResult =
	| { status: 'skipped'; reason: 'lock-held' | 'no-delta' }
	| { status: 'ran'; observationsWritten: number; compacted: boolean };

export async function runObservationalCycle(
	opts: RunObservationalCycleOpts,
): Promise<RunObservationalCycleResult> {
	const ttlMs = opts.lockTtlMs ?? DEFAULT_LOCK_TTL_MS;

	const lockResult = await withObservationLock(
		opts.memory,
		'thread',
		opts.threadId,
		{ ttlMs },
		async () => await runInsideLock(opts),
	);

	if (lockResult.status === 'skipped') return { status: 'skipped', reason: 'lock-held' };
	return lockResult.value;
}

async function runInsideLock(
	opts: RunObservationalCycleOpts,
): Promise<RunObservationalCycleResult> {
	const { memory, threadId, resourceId, eventBus, telemetry } = opts;
	const trigger = opts.trigger ?? { type: 'per-turn' };
	const { messages: deltaMessages, cursor } = await getDeltaSinceCursor(memory, 'thread', threadId);
	if (deltaMessages.length === 0) return { status: 'skipped', reason: 'no-delta' };

	const currentWorkingMemory =
		(await memory.getWorkingMemory?.({ threadId, resourceId, scope: 'thread' })) ?? null;
	const gap = buildGapContext(cursor, deltaMessages, getGapThresholdMs(opts));

	let observerRows: NewObservation[];
	try {
		const observe = opts.observe ?? buildDefaultObserveFn(opts.model, opts.observerPrompt);
		const now = new Date();
		observerRows = await observe({
			deltaMessages,
			currentWorkingMemory,
			cursor,
			threadId,
			resourceId,
			now,
			trigger,
			gap,
			telemetry,
		});
	} catch (error) {
		emitError(eventBus, 'observer', error);
		return { status: 'skipped', reason: 'no-delta' };
	}

	const gapRow = gap ? buildGapRow(gap, threadId) : null;
	const rowsToAppend = [
		...(gapRow ? [gapRow] : []),
		...observerRows.map((row) => ({ ...row, scopeKind: 'thread' as const, scopeId: threadId })),
	];

	if (rowsToAppend.length > 0) {
		await memory.appendObservations(rowsToAppend);
	}

	const lastMessage = deltaMessages[deltaMessages.length - 1];
	await advanceCursor(memory, 'thread', threadId, lastMessage);

	let compacted = false;
	try {
		compacted = await maybeCompact(opts, currentWorkingMemory);
	} catch (error) {
		emitError(eventBus, 'compactor', error);
	}

	return { status: 'ran', observationsWritten: rowsToAppend.length, compacted };
}

async function maybeCompact(
	opts: RunObservationalCycleOpts,
	currentWorkingMemory: string | null,
): Promise<boolean> {
	const threshold = opts.compactionThreshold ?? DEFAULT_COMPACTION_THRESHOLD;
	const observations = await opts.memory.getObservations({
		scopeKind: 'thread',
		scopeId: opts.threadId,
		schemaVersionAtMost: OBSERVATION_SCHEMA_VERSION,
	});
	const contentObservationCount = observations.filter((row) => row.kind === 'observation').length;
	if (contentObservationCount < threshold) return false;
	if (!opts.memory.saveWorkingMemory) {
		throw new Error('Observational memory compaction requires saveWorkingMemory()');
	}

	const compact = opts.compact ?? defaultCompact;
	const result = await compact({
		observations,
		currentWorkingMemory,
		workingMemoryTemplate: opts.workingMemory.template,
		structured: opts.workingMemory.structured,
		...(opts.workingMemory.schema !== undefined && { schema: opts.workingMemory.schema }),
		threadId: opts.threadId,
		resourceId: opts.resourceId,
		model: opts.model,
		compactorPrompt: opts.compactorPrompt ?? DEFAULT_COMPACTOR_PROMPT,
		telemetry: opts.telemetry,
	});

	const content = await validateWorkingMemoryOutput(result.content, opts.workingMemory);
	await opts.memory.saveWorkingMemory(
		{ threadId: opts.threadId, resourceId: opts.resourceId, scope: 'thread' },
		content,
	);
	await opts.memory.deleteObservations(observations.map((row) => row.id));
	return true;
}

async function defaultCompact(ctx: Parameters<CompactFn>[0]): Promise<{ content: string }> {
	const prompt = [
		`Working memory template:\n${ctx.workingMemoryTemplate}`,
		`Current working memory:\n${ctx.currentWorkingMemory ?? ctx.workingMemoryTemplate}`,
		`Queued observations:\n${renderObservationsByCategory(ctx.observations)}`,
	]
		.filter(Boolean)
		.join('\n\n');

	const { text } = await generateText({
		model: createModel(ctx.model),
		system: ctx.compactorPrompt,
		prompt,
		...telemetryOptions(ctx.telemetry),
	});

	return { content: stripMarkdownFence(text.trim()) };
}

export function buildDefaultObserveFn(model: ModelConfig, observerPrompt?: string): ObserveFn {
	return async (ctx) => {
		const prompt = [
			ctx.currentWorkingMemory
				? `Current working memory:\n${ctx.currentWorkingMemory}`
				: 'Current working memory: (empty)',
			`Time now: ${ctx.now.toISOString()}`,
			ctx.cursor ? `Last observed message time: ${ctx.cursor.lastObservedAt.toISOString()}` : '',
			`Trigger: ${ctx.trigger.type}`,
			ctx.gap ? `Computed temporal gap:\n${renderGapContext(ctx.gap)}` : '',
			`Recent transcript:\n${renderTranscript(ctx.deltaMessages)}`,
		]
			.filter(Boolean)
			.join('\n\n');

		const { text } = await generateText({
			model: createModel(model),
			system: observerPrompt ?? DEFAULT_OBSERVER_PROMPT,
			prompt,
			...telemetryOptions(ctx.telemetry),
		});

		return parseObservationJsonLines(text, ctx.threadId);
	};
}

function getGapThresholdMs(opts: RunObservationalCycleOpts): number {
	if (opts.gapThresholdMs !== undefined) return opts.gapThresholdMs;
	const trigger = opts.trigger;
	if (trigger?.type === 'idle-timer' && trigger.gapThresholdMs !== undefined) {
		return trigger.gapThresholdMs;
	}
	return DEFAULT_OBSERVATION_GAP_THRESHOLD_MS;
}

function buildGapContext(
	cursor: { lastObservedAt: Date } | null,
	deltaMessages: AgentDbMessage[],
	gapThresholdMs: number,
): ObservationGapContext | null {
	if (!cursor) return null;
	const firstMessage = firstUserMessage(deltaMessages) ?? deltaMessages[0];
	if (!firstMessage) return null;
	const durationMs = firstMessage.createdAt.getTime() - cursor.lastObservedAt.getTime();
	if (durationMs < gapThresholdMs) return null;
	const text = `User returned after ${humanizeMs(durationMs)} of inactivity.`;
	return {
		durationMs,
		text,
		previousObservedAt: cursor.lastObservedAt,
		nextMessageAt: firstMessage.createdAt,
	};
}

function buildGapRow(gap: ObservationGapContext, threadId: string): NewObservation {
	return {
		scopeKind: 'thread',
		scopeId: threadId,
		kind: 'gap',
		payload: { category: 'continuity', text: gap.text },
		durationMs: gap.durationMs,
		schemaVersion: OBSERVATION_SCHEMA_VERSION,
		createdAt: gap.nextMessageAt,
	};
}

function parseObservationJsonLines(text: string, threadId: string): NewObservation[] {
	const now = new Date();
	const rows: NewObservation[] = [];
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			const parsed = JSON.parse(trimmed) as {
				kind?: unknown;
				category?: unknown;
				text?: unknown;
				durationMs?: unknown;
			};
			if (typeof parsed.text !== 'string' || parsed.text.trim() === '') continue;
			const category = observationCategory(parsed.category);
			rows.push({
				scopeKind: 'thread',
				scopeId: threadId,
				kind: 'observation',
				payload: { category, text: parsed.text.trim() },
				durationMs: null,
				schemaVersion: OBSERVATION_SCHEMA_VERSION,
				createdAt: now,
			});
		} catch {
			continue;
		}
	}
	return rows;
}

async function validateWorkingMemoryOutput(
	raw: string,
	workingMemory: RunObservationalCycleOpts['workingMemory'],
): Promise<string> {
	const content = stripMarkdownFence(raw.trim());
	if (content.length === 0) {
		throw new Error('Compactor returned empty working memory');
	}

	if (!workingMemory.structured) return content;

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch (error) {
		throw new Error(
			`Compactor returned invalid JSON working memory: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}

	if (!workingMemory.schema) return JSON.stringify(parsed, null, 2);

	const result = await parseWithSchema(workingMemory.schema, parsed);
	if (!result.success) {
		throw new Error(
			`Compactor returned working memory that does not match schema: ${result.error}`,
		);
	}
	return JSON.stringify(result.data, null, 2);
}

function renderTranscript(messages: AgentDbMessage[]): string {
	return messages
		.map((message) => {
			const role = isLlmMessage(message) ? message.role : 'custom';
			const text = isLlmMessage(message)
				? message.content
						.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
						.map((part) => part.text)
						.join(' ')
				: '';
			return `[${message.createdAt.toISOString()}] [${role}] ${text}`;
		})
		.join('\n');
}

function renderObservationsByCategory(observations: Observation[]): string {
	const groups = new Map<string, Observation[]>();
	for (const row of observations) {
		const key = `${payloadCategory(row.payload)}:${row.kind}`;
		groups.set(key, [...(groups.get(key) ?? []), row]);
	}

	return Array.from(groups.entries())
		.map(([key, rows]) => {
			const [category, kind] = key.split(':');
			const items = rows.map(renderObservationRow).join('\n');
			return `### ${category} / ${kind}\n${items}`;
		})
		.join('\n\n');
}

function renderObservationRow(row: Observation): string {
	const payload = payloadText(row.payload);
	const duration = row.durationMs !== null ? ` duration=${humanizeMs(row.durationMs)}` : '';
	return `- [${row.createdAt.toISOString()}]${duration} ${payload}`;
}

function renderGapContext(gap: ObservationGapContext): string {
	return [
		gap.text,
		`Previous observed message time: ${gap.previousObservedAt.toISOString()}`,
		`Next message time: ${gap.nextMessageAt.toISOString()}`,
		`Duration: ${humanizeMs(gap.durationMs)}`,
	].join('\n');
}

function firstUserMessage(messages: AgentDbMessage[]): AgentDbMessage | undefined {
	return messages.find((message) => isLlmMessage(message) && message.role === 'user');
}

function observationCategory(value: unknown): ObservationCategory {
	return isObservationCategory(value) ? value : 'other';
}

function payloadCategory(payload: unknown): ObservationCategory {
	if (typeof payload === 'object' && payload !== null) {
		const category = (payload as { category?: unknown }).category;
		return observationCategory(category);
	}
	return 'other';
}

function isObservationCategory(value: unknown): value is ObservationCategory {
	const categories: readonly string[] = OBSERVATION_CATEGORIES;
	return typeof value === 'string' && categories.includes(value);
}

function payloadText(payload: unknown): string {
	if (typeof payload === 'string') return payload;
	if (typeof payload === 'object' && payload !== null) {
		const text = (payload as { text?: unknown }).text;
		if (typeof text === 'string') return text;
	}
	try {
		return JSON.stringify(payload);
	} catch {
		return '';
	}
}

function stripMarkdownFence(value: string): string {
	const trimmed = value.trim();
	const match = trimmed.match(/^```(?:json|markdown|md)?\s*\n([\s\S]*?)\n```$/i);
	return match ? match[1].trim() : trimmed;
}

function humanizeMs(ms: number): string {
	const sec = Math.max(0, Math.floor(ms / 1000));
	const min = Math.floor(sec / 60);
	const hr = Math.floor(min / 60);
	const day = Math.floor(hr / 24);
	if (day > 0) return hr % 24 > 0 ? `${day}d ${hr % 24}h` : `${day}d`;
	if (hr > 0) return min % 60 > 0 ? `${hr}h ${min % 60}m` : `${hr}h`;
	if (min > 0) return `${min}m`;
	return `${sec}s`;
}

function telemetryOptions(telemetry: BuiltTelemetry | undefined): Record<string, unknown> {
	if (!telemetry?.enabled) return {};
	return {
		experimental_telemetry: {
			isEnabled: true,
			functionId: telemetry.functionId,
			metadata: telemetry.metadata,
			recordInputs: telemetry.recordInputs,
			recordOutputs: telemetry.recordOutputs,
			tracer: telemetry.tracer,
			integrations: telemetry.integrations.length > 0 ? telemetry.integrations : undefined,
		},
	};
}

function emitError(
	eventBus: AgentEventBus | undefined,
	source: 'observer' | 'compactor',
	error: unknown,
): void {
	if (!eventBus) return;
	const message = error instanceof Error ? error.message : String(error);
	eventBus.emit({ type: AgentEvent.Error, message, error, source });
}
