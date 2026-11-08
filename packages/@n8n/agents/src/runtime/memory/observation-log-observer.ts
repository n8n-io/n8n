import { isSensitiveKey } from '@n8n/utils/redaction/sensitive-key';

import { renderObservationLog } from './observation-log-renderer';
import { reportSideCallUsage } from './forward-usage';
import { redactText } from '../../sdk/guardrails';
import type { AgentExecutionCounter, TokenUsage } from '../../types/sdk/agent';
import type { BuiltMemory } from '../../types/sdk/memory';
import type { AgentDbMessage, ContentToolCall, Message } from '../../types/sdk/message';
import type { ObservationCursor } from '../../types/sdk/observation';
import type {
	BuiltObservationLogStore,
	ObservationLogBatchEntry,
	ObservationLogMarker,
	ObservationLogObserveFn,
	ObservationLogObserverInput,
} from '../../types/sdk/observation-log';
import type { BuiltTelemetry } from '../../types/telemetry';
import { estimateObservationTokens, type TokenCounter } from '../model/model-token-counter';
import { guardSerializedToolResultForModel } from '../tools/tool-result-guard';

export type { ObservationLogObserveFn, ObservationLogObserverInput };

const MARKER_BY_TOKEN: Record<string, ObservationLogMarker> = {
	CRITICAL: 'critical',
	IMPORTANT: 'important',
	INFO: 'info',
	COMPLETION: 'completion',
};

const BULLET_PATTERN =
	/^(\s*)[*-]\s+(CRITICAL|IMPORTANT|INFO|COMPLETION)(?:\s+\(\d{2}:\d{2}\))?\s+(.+)$/iu;
/**
 * Indented lines that are malformed structure, not detail: a fence, the sentinel, a timed
 * unknown marker, or a misspelled marker. Other uppercase words (API, GET) stay detail.
 */
const NON_DETAIL_PATTERN =
	/^(?:```|NO_OBSERVATIONS$|(?:[*-]\s+)?(?:[A-Z_]+\s+\(\d{2}:\d{2}\)|(?:COMPLET|CRITIC|IMPORTAN|INFO)[A-Z]*\b))/u;
const DEFAULT_MAX_SERIALIZED_CHARS = 2_000;
const DEFAULT_MAX_STRING_CHARS = 500;
const DEFAULT_MAX_ARRAY_ITEMS = 20;
const DEFAULT_MAX_OBJECT_KEYS = 40;
const REDACTED_VALUE = '[REDACTED]';

export interface ParsedObservationLogEntry {
	marker: ObservationLogMarker;
	text: string;
	parentIndex: number | null;
}

export interface ParseObservationLogMarkdownResult {
	entries: ParsedObservationLogEntry[];
	skippedLines: string[];
}

export interface RenderObserverTranscriptOptions {
	maxSerializedChars?: number;
	maxStringChars?: number;
	maxArrayItems?: number;
	maxObjectKeys?: number;
}

export interface ObservationLogObserverMemory extends BuiltMemory, BuiltObservationLogStore {
	getMessagesForObservationScope(
		observationScopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string } },
	): Promise<AgentDbMessage[]>;
	getCursor(observationScopeId: string): Promise<ObservationCursor | null>;
}

export async function readObservationState(
	memory: ObservationLogObserverMemory,
	observationScopeId: string,
): Promise<{
	cursor: ObservationCursor | null;
	storedCursor: ObservationCursor | null;
	hasActiveObservations: boolean;
}> {
	const storedCursor = await memory.getCursor(observationScopeId);
	const observations = await memory.getActiveObservationLog({
		observationScopeId,
		limit: 1,
		order: 'desc',
	});
	const hasActiveObservations = observations.length > 0;
	// Missing memory is not proof that the processed history was empty.
	return {
		cursor: hasActiveObservations ? storedCursor : null,
		storedCursor,
		hasActiveObservations,
	};
}

export interface RunObservationLogObserverOpts {
	memory: ObservationLogObserverMemory;
	observationScopeId: string;
	observationLogTailLimit: number;
	observe: ObservationLogObserveFn;
	tokenCounter?: TokenCounter;
	now?: Date;
	onMalformedLine?: (line: string) => void;
	executionCounter?: AgentExecutionCounter;
	telemetry?: BuiltTelemetry;
	modelFetch?: typeof globalThis.fetch;
	functionId?: string;
	/**
	 * Receives the observer model call's usage the moment it resolves, before
	 * any parsing or persistence. Forwarding it here (rather than only on the
	 * success return) keeps a billed observer call priced even when later
	 * post-processing throws. Fire-and-forget from the caller's perspective.
	 */
	onUsage?: (model: string | undefined, usage: TokenUsage | undefined) => void | Promise<void>;
}

export type RunObservationLogObserverResult =
	| { status: 'skipped'; reason: 'no-delta' | 'pending-tool-call' | 'run-disabled' }
	| {
			status: 'ran';
			observationsWritten: number;
			cursorAdvanced: boolean;
			tokenCount: number;
			skippedLines: string[];
			/** Normalized token usage from the observer LLM call, when the provider reports it. */
			usage?: TokenUsage;
			/** Stable model id string of the model that produced the observations. */
			model?: string;
	  };

export function parseObservationLogMarkdown(markdown: string): ParseObservationLogMarkdownResult {
	const entries: ParsedObservationLogEntry[] = [];
	const skippedLines: string[] = [];
	let currentParentIndex: number | null = null;

	for (const rawLine of markdown.split(/\r?\n/)) {
		const trimmed = rawLine.trim();
		if (!trimmed) continue;

		const match = BULLET_PATTERN.exec(rawLine);
		if (!match) {
			// Models often add an indented detail list under an observation. Keep
			// that detail on the entry above instead of rejecting the response.
			const previous = entries.at(-1);
			if (previous && /^\s/.test(rawLine) && !NON_DETAIL_PATTERN.test(trimmed)) {
				previous.text = appendObservationDetail(previous.text, trimmed);
				continue;
			}
			skippedLines.push(rawLine);
			continue;
		}

		const [, indentation, markerToken, text] = match;
		const marker = MARKER_BY_TOKEN[markerToken.toUpperCase()];
		const isChild = indentation.length > 0;
		if (isChild && currentParentIndex === null) {
			skippedLines.push(rawLine);
			continue;
		}

		const parentIndex = isChild ? currentParentIndex : null;
		entries.push({ marker, text: text.trim(), parentIndex });
		if (!isChild) {
			currentParentIndex = entries.length - 1;
		}
	}

	return { entries, skippedLines };
}

/** Joins a detail line onto one line, so the rendered log keeps one entry per line. */
function appendObservationDetail(text: string, detailLine: string): string {
	const detail = detailLine.replace(/^[*-]\s+/, '');
	return /[:;.!?]$/.test(text) ? `${text} ${detail}` : `${text}; ${detail}`;
}

export function renderObserverTranscript(
	messages: AgentDbMessage[],
	options: RenderObserverTranscriptOptions = {},
): string {
	const lines: string[] = [];
	for (const message of messages) {
		if (!isLlmMessage(message)) continue;
		// Store adapters are an open interface: a JSON-backed one hands back
		// createdAt as an ISO string, so coerce before rendering.
		const createdAt =
			message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt);
		const timestamp = createdAt.toISOString();
		const text = message.content
			.filter((content): content is { type: 'text'; text: string } => content.type === 'text')
			.map((content) => content.text)
			.join('\n');
		if (text) {
			// Messages synthesized from tool output (toMessage, e.g. MCP rich
			// results) carry tool provenance and must stay inside the
			// untrusted-data boundary like inline tool results.
			if (message.origin?.kind === 'tool') {
				lines.push(`[${timestamp}] tool_message ${message.origin.toolName}:`);
				lines.push(wrapUntrustedObserverData(redactText(text).text, message.origin.toolName));
			} else {
				lines.push(`[${timestamp}] ${message.role}:`);
				lines.push(redactText(text).text);
			}
		}

		for (const toolCall of message.content.filter(isToolCallContent)) {
			lines.push(
				`[${timestamp}] tool_call ${toolCall.toolName} input=${serializeForObserver(toolCall.input, options)}`,
			);
			if (toolCall.state === 'resolved') {
				lines.push(
					`[${timestamp}] tool_result ${toolCall.toolName} output=${wrapUntrustedObserverData(serializeForObserver(toolCall.output, options, true), toolCall.toolName)}`,
				);
			} else if (toolCall.state === 'rejected') {
				lines.push(
					`[${timestamp}] tool_result ${toolCall.toolName} error=${wrapUntrustedObserverData(serializeErrorForObserver(toolCall.error, options), toolCall.toolName)}`,
				);
			}
		}
	}

	return lines.join('\n');
}

export async function runObservationLogObserver(
	opts: RunObservationLogObserverOpts,
): Promise<RunObservationLogObserverResult> {
	const { memory, observationScopeId } = opts;
	const { cursor, storedCursor, hasActiveObservations } = await readObservationState(
		memory,
		observationScopeId,
	);
	const deltaMessages = await memory.getMessagesForObservationScope(
		observationScopeId,
		cursor
			? {
					since: {
						sinceCreatedAt: cursor.lastObservedAt,
						sinceMessageId: cursor.lastObservedMessageId,
					},
				}
			: undefined,
	);
	if (deltaMessages.length === 0) return { status: 'skipped', reason: 'no-delta' };

	// A pending tool call (e.g. suspended for a HITL approval) has no outcome
	// yet. Observing past its host would advance the cursor over it, and the
	// later in-place resolution would land behind the cursor — masked from the
	// LLM window and never part of a future observer delta. Observe only the
	// messages before the host; the rest is picked up once the call settles.
	const firstPendingIndex = deltaMessages.findIndex(hasPendingToolCall);
	const observable =
		firstPendingIndex === -1 ? deltaMessages : deltaMessages.slice(0, firstPendingIndex);
	if (observable.length === 0) return { status: 'skipped', reason: 'pending-tool-call' };

	const tokenCounter = opts.tokenCounter ?? estimateObservationTokens;
	const input = await prepareObserverInput(opts, observable, tokenCounter);
	const observeResult = await opts.observe(input);
	const markdown = typeof observeResult === 'string' ? observeResult : observeResult.text;
	const usage = typeof observeResult === 'string' ? undefined : observeResult.usage;
	const model = typeof observeResult === 'string' ? undefined : observeResult.model;
	reportSideCallUsage(opts.onUsage, model, usage);

	const prepared = await prepareObservationEntries(markdown, input.now, tokenCounter, opts);
	const result = {
		status: 'ran' as const,
		observationsWritten: 0,
		cursorAdvanced: false,
		tokenCount: input.transcriptTokenCount,
		skippedLines: prepared.skippedLines,
		usage,
		model,
	};
	if (!prepared.entries || (prepared.entries.length === 0 && !hasActiveObservations)) {
		return result;
	}

	const lastMessage = observable[observable.length - 1];
	const committed =
		(await memory.commitObservationLogBatch({
			observationScopeId,
			expectedCursor: storedCursor,
			nextCursor: {
				observationScopeId,
				lastObservedMessageId: lastMessage.id,
				lastObservedAt: lastMessage.createdAt,
				updatedAt: input.now,
			},
			entries: prepared.entries,
		})) === 'committed';
	return {
		...result,
		observationsWritten: committed ? prepared.entries.length : 0,
		cursorAdvanced: committed,
	};
}

async function prepareObserverInput(
	opts: RunObservationLogObserverOpts,
	observable: AgentDbMessage[],
	tokenCounter: TokenCounter,
): Promise<ObservationLogObserverInput> {
	const guardedMessages = await Promise.all(
		observable.map(async (message) => await guardObserverToolResults(message, tokenCounter)),
	);
	const transcript = renderObserverTranscript(guardedMessages);
	const tokenCount = await tokenCounter(transcript);

	const observationLogTail = (
		await opts.memory.getActiveObservationLog({
			observationScopeId: opts.observationScopeId,
			limit: opts.observationLogTailLimit,
			order: 'desc',
		})
	).reverse();
	const now = opts.now ?? new Date();
	return {
		observationScopeId: opts.observationScopeId,
		now,
		deltaMessages: observable,
		transcript,
		transcriptTokenCount: tokenCount,
		observationLogTail,
		renderedObservationLogTail: renderObservationLog(observationLogTail),
		executionCounter: opts.executionCounter,
		telemetry: opts.telemetry,
		modelFetch: opts.modelFetch,
		functionId: opts.functionId,
	};
}

async function prepareObservationEntries(
	markdown: string,
	now: Date,
	tokenCounter: TokenCounter,
	opts: Pick<RunObservationLogObserverOpts, 'onMalformedLine'>,
): Promise<{ entries: ObservationLogBatchEntry[] | null; skippedLines: string[] }> {
	const noObservations = markdown.trim() === 'NO_OBSERVATIONS';
	const parsed = noObservations
		? { entries: [], skippedLines: [] }
		: parseObservationLogMarkdown(markdown);
	for (const line of parsed.skippedLines) {
		opts.onMalformedLine?.(line);
	}
	if (
		!noObservations &&
		(parsed.entries.length === 0 ||
			parsed.skippedLines.length > 0 ||
			parsed.entries.some((entry) => entry.text.length === 0))
	) {
		return { entries: null, skippedLines: parsed.skippedLines };
	}

	const prepared = await Promise.all(
		parsed.entries.map(async (entry, index) => {
			const text = redactText(entry.text).text;
			return {
				marker: entry.marker,
				parentIndex: entry.parentIndex,
				text,
				tokenCount: await tokenCounter(text),
				createdAt: new Date(now.getTime() + index),
			};
		}),
	);

	return { entries: prepared, skippedLines: parsed.skippedLines };
}

function hasPendingToolCall(message: AgentDbMessage): boolean {
	if (!isLlmMessage(message)) return false;
	return message.content.some((c) => c.type === 'tool-call' && c.state === 'pending');
}

function isLlmMessage(message: AgentDbMessage): message is AgentDbMessage & Message {
	return 'role' in message && Array.isArray(message.content);
}

function isToolCallContent(content: Message['content'][number]): content is ContentToolCall {
	return content.type === 'tool-call';
}

async function guardObserverToolResults(
	message: AgentDbMessage,
	tokenCounter: TokenCounter,
): Promise<AgentDbMessage> {
	if (!isLlmMessage(message)) return message;
	const content = await Promise.all(
		message.content.map(async (block) => {
			if (block.type !== 'tool-call' || block.state !== 'resolved') return block;
			// Bound the serialized result so rich media metadata cannot bypass the guard.
			const serialized = serializeForObserver(block.output, {}, true);
			const guarded = await guardSerializedToolResultForModel(serialized, tokenCounter);
			if (!guarded.truncated) return block;
			return { ...block, output: guarded.historyOutput };
		}),
	);
	return { ...message, content };
}

function serializeForObserver(
	value: unknown,
	options: RenderObserverTranscriptOptions,
	isToolResult = false,
): string {
	const compacted = compactForObserver(value, options, isToolResult);
	const serialized = safeJsonStringify(compacted);
	return truncateString(
		serialized,
		options.maxSerializedChars ?? (isToolResult ? Infinity : DEFAULT_MAX_SERIALIZED_CHARS),
		'serialized',
	);
}

function serializeErrorForObserver(
	error: string,
	options: RenderObserverTranscriptOptions,
): string {
	return truncateString(
		redactText(error).text,
		options.maxStringChars ?? DEFAULT_MAX_STRING_CHARS,
		'string',
	);
}

function compactForObserver(
	value: unknown,
	options: RenderObserverTranscriptOptions,
	isToolResult: boolean,
): unknown {
	const maxStringChars =
		options.maxStringChars ?? (isToolResult ? Infinity : DEFAULT_MAX_STRING_CHARS);
	const maxArrayItems =
		options.maxArrayItems ?? (isToolResult ? Infinity : DEFAULT_MAX_ARRAY_ITEMS);
	const maxObjectKeys =
		options.maxObjectKeys ?? (isToolResult ? Infinity : DEFAULT_MAX_OBJECT_KEYS);

	if (typeof value === 'string') {
		return truncateString(redactText(value).text, maxStringChars, 'string');
	}
	if (value === null || typeof value !== 'object') return value;

	if (Array.isArray(value)) {
		const compacted = value
			.slice(0, maxArrayItems)
			.map((item) => compactForObserver(item, options, isToolResult));
		if (value.length > maxArrayItems) {
			compacted.push({ __truncatedItems: value.length - maxArrayItems });
		}
		return compacted;
	}

	const result: Record<string, unknown> = {};
	const entries = Object.entries(value as Record<string, unknown>);
	for (const [key, entryValue] of entries.slice(0, maxObjectKeys)) {
		if (isSensitiveKey(key)) {
			result[key] = REDACTED_VALUE;
		} else if (shouldStripBlob(key, entryValue, maxStringChars, isToolResult ? value : undefined)) {
			result[key] = '[omitted large blob]';
		} else {
			result[key] = compactForObserver(entryValue, options, isToolResult);
		}
	}
	if (entries.length > maxObjectKeys) {
		result.__truncatedKeys = entries.length - maxObjectKeys;
	}
	return result;
}

function shouldStripBlob(
	key: string,
	value: unknown,
	maxStringChars: number,
	toolResult?: object,
): boolean {
	if (typeof value !== 'string') return false;
	if (
		toolResult &&
		key === 'data' &&
		'type' in toolResult &&
		(toolResult.type === 'image-data' ||
			toolResult.type === 'file-data' ||
			toolResult.type === 'data')
	) {
		return true;
	}
	if (toolResult) {
		return /blob|base64/i.test(key) || /^data:[^,]*;base64,/i.test(value);
	}
	if (value.length <= maxStringChars) return false;
	return /blob|base64|data|file|image/i.test(key);
}

function truncateString(value: string, maxChars: number, label: string): string {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, maxChars)}...[truncated ${value.length - maxChars} ${label} chars]`;
}

function safeJsonStringify(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return JSON.stringify('[unserializable]');
	}
}

function escapeXmlAttribute(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

export function wrapUntrustedObserverData(content: string, source: string): string {
	const safeSource = escapeXmlAttribute(source);
	const safeContent = content.replace(/<\/untrusted_tool_data/gi, '&lt;/untrusted_tool_data');
	return `<untrusted_tool_data source="${safeSource}">${safeContent}</untrusted_tool_data>`;
}
