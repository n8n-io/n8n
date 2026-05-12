import { renderObservationLog } from './observation-log-renderer';
import type { BuiltMemory } from '../types/sdk/memory';
import type { AgentDbMessage, ContentToolCall, Message } from '../types/sdk/message';
import type { ObservationCursor } from '../types/sdk/observation';
import type {
	BuiltObservationLogStore,
	ObservationLogEntry,
	ObservationLogMarker,
	ObservationLogObserveFn,
	ObservationLogObserverInput,
	ObservationLogScopeKind,
	TokenCounter,
} from '../types/sdk/observation-log';
import { estimateObservationTokens } from '../types/sdk/observation-log';

export type { ObservationLogObserveFn, ObservationLogObserverInput };

const MARKER_BY_SYMBOL: Record<string, ObservationLogMarker> = {
	'🔴': 'critical',
	'🟡': 'important',
	'🟢': 'info',
	'✅': 'completion',
};

const BULLET_PATTERN = /^(\s*)[*-]\s+([🔴🟡🟢✅])(?:\s+\(\d{2}:\d{2}\))?\s+(.+)$/u;
const DEFAULT_MAX_SERIALIZED_CHARS = 2_000;
const DEFAULT_MAX_STRING_CHARS = 500;
const DEFAULT_MAX_ARRAY_ITEMS = 20;
const DEFAULT_MAX_OBJECT_KEYS = 40;

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
	getMessagesForScope(
		scopeKind: ObservationLogScopeKind,
		scopeId: string,
		opts?: { since?: { sinceCreatedAt: Date; sinceMessageId: string } },
	): Promise<AgentDbMessage[]>;
	getCursor(scopeKind: ObservationLogScopeKind, scopeId: string): Promise<ObservationCursor | null>;
	setCursor(cursor: ObservationCursor & { scopeKind: ObservationLogScopeKind }): Promise<void>;
}

export interface RunObservationLogObserverOpts {
	memory: ObservationLogObserverMemory;
	scopeKind: ObservationLogScopeKind;
	scopeId: string;
	observerThresholdTokens: number;
	observationLogTailLimit: number;
	observe: ObservationLogObserveFn;
	tokenCounter?: TokenCounter;
	now?: Date;
	onMalformedLine?: (line: string) => void;
}

export type RunObservationLogObserverResult =
	| { status: 'skipped'; reason: 'no-delta' }
	| { status: 'skipped'; reason: 'below-threshold'; tokenCount: number }
	| {
			status: 'ran';
			observationsWritten: number;
			tokenCount: number;
			skippedLines: string[];
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
			skippedLines.push(rawLine);
			continue;
		}

		const [, indentation, markerSymbol, text] = match;
		const marker = MARKER_BY_SYMBOL[markerSymbol];
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

export function renderObserverTranscript(
	messages: AgentDbMessage[],
	options: RenderObserverTranscriptOptions = {},
): string {
	const lines: string[] = [];
	for (const message of messages) {
		if (!isLlmMessage(message)) continue;
		const timestamp = message.createdAt.toISOString();
		const text = message.content
			.filter((content): content is { type: 'text'; text: string } => content.type === 'text')
			.map((content) => content.text)
			.join('\n');
		if (text) {
			lines.push(`[${timestamp}] ${message.role}:`);
			lines.push(text);
		}

		for (const toolCall of message.content.filter(isToolCallContent)) {
			lines.push(
				`[${timestamp}] tool_call ${toolCall.toolName} input=${serializeForObserver(toolCall.input, options)}`,
			);
			if (toolCall.state === 'resolved') {
				lines.push(
					`[${timestamp}] tool_result ${toolCall.toolName} output=${serializeForObserver(toolCall.output, options)}`,
				);
			} else if (toolCall.state === 'rejected') {
				lines.push(`[${timestamp}] tool_result ${toolCall.toolName} error=${toolCall.error}`);
			}
		}
	}

	return lines.join('\n');
}

export async function runObservationLogObserver(
	opts: RunObservationLogObserverOpts,
): Promise<RunObservationLogObserverResult> {
	const { memory, scopeKind, scopeId } = opts;
	const cursor = await memory.getCursor(scopeKind, scopeId);
	const deltaMessages = await memory.getMessagesForScope(
		scopeKind,
		scopeId,
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

	const tokenCounter = opts.tokenCounter ?? estimateObservationTokens;
	const transcript = renderObserverTranscript(deltaMessages);
	const tokenCount = tokenCounter(transcript);
	if (tokenCount < opts.observerThresholdTokens) {
		return { status: 'skipped', reason: 'below-threshold', tokenCount };
	}

	const observationLogTail = (
		await memory.getActiveObservationLog({
			scopeKind,
			scopeId,
			limit: opts.observationLogTailLimit,
			order: 'desc',
		})
	).reverse();
	const now = opts.now ?? new Date();
	const renderedObservationLogTail = renderObservationLog(observationLogTail);
	const markdown = await opts.observe({
		scopeKind,
		scopeId,
		now,
		deltaMessages,
		transcript,
		transcriptTokenCount: tokenCount,
		observationLogTail,
		renderedObservationLogTail,
	});

	const parsed = parseObservationLogMarkdown(markdown);
	for (const line of parsed.skippedLines) {
		opts.onMalformedLine?.(line);
	}

	const inserted: ObservationLogEntry[] = [];
	for (const entry of parsed.entries) {
		const parentId = entry.parentIndex === null ? null : (inserted[entry.parentIndex]?.id ?? null);
		const [row] = await memory.appendObservationLogEntries([
			{
				scopeKind,
				scopeId,
				marker: entry.marker,
				text: entry.text,
				parentId,
				createdAt: new Date(now.getTime() + inserted.length),
			},
		]);
		inserted.push(row);
	}

	await advanceObserverCursor(
		memory,
		scopeKind,
		scopeId,
		deltaMessages[deltaMessages.length - 1],
		now,
	);

	return {
		status: 'ran',
		observationsWritten: inserted.length,
		tokenCount,
		skippedLines: parsed.skippedLines,
	};
}

function isLlmMessage(message: AgentDbMessage): message is AgentDbMessage & Message {
	return 'role' in message && Array.isArray(message.content);
}

function isToolCallContent(content: Message['content'][number]): content is ContentToolCall {
	return content.type === 'tool-call';
}

function serializeForObserver(value: unknown, options: RenderObserverTranscriptOptions): string {
	const compacted = compactForObserver(value, options);
	const serialized = safeJsonStringify(compacted);
	return truncateString(
		serialized,
		options.maxSerializedChars ?? DEFAULT_MAX_SERIALIZED_CHARS,
		'serialized',
	);
}

function compactForObserver(value: unknown, options: RenderObserverTranscriptOptions): unknown {
	const maxStringChars = options.maxStringChars ?? DEFAULT_MAX_STRING_CHARS;
	const maxArrayItems = options.maxArrayItems ?? DEFAULT_MAX_ARRAY_ITEMS;
	const maxObjectKeys = options.maxObjectKeys ?? DEFAULT_MAX_OBJECT_KEYS;

	if (typeof value === 'string') return truncateString(value, maxStringChars, 'string');
	if (value === null || typeof value !== 'object') return value;

	if (Array.isArray(value)) {
		const compacted = value
			.slice(0, maxArrayItems)
			.map((item) => compactForObserver(item, options));
		if (value.length > maxArrayItems) {
			compacted.push({ __truncatedItems: value.length - maxArrayItems });
		}
		return compacted;
	}

	const result: Record<string, unknown> = {};
	const entries = Object.entries(value as Record<string, unknown>);
	for (const [key, entryValue] of entries.slice(0, maxObjectKeys)) {
		if (shouldStripBlob(key, entryValue)) {
			result[key] = '[omitted large blob]';
		} else {
			result[key] = compactForObserver(entryValue, options);
		}
	}
	if (entries.length > maxObjectKeys) {
		result.__truncatedKeys = entries.length - maxObjectKeys;
	}
	return result;
}

function shouldStripBlob(key: string, value: unknown): boolean {
	if (typeof value !== 'string') return false;
	if (value.length <= DEFAULT_MAX_STRING_CHARS) return false;
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

async function advanceObserverCursor(
	memory: ObservationLogObserverMemory,
	scopeKind: ObservationLogScopeKind,
	scopeId: string,
	lastMessage: AgentDbMessage,
	now: Date,
): Promise<void> {
	await memory.setCursor({
		scopeKind,
		scopeId,
		lastObservedMessageId: lastMessage.id,
		lastObservedAt: lastMessage.createdAt,
		updatedAt: now,
	});
}
