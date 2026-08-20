import { SECRET_KEYS } from '@n8n/utils/scrub-secrets';

import { renderObservationLog } from './observation-log-renderer';
import { redactText } from '../../sdk/guardrails';
import type { AgentExecutionCounter } from '../../types/sdk/agent';
import type { BuiltMemory } from '../../types/sdk/memory';
import type { AgentDbMessage, ContentToolCall, Message } from '../../types/sdk/message';
import type { ObservationCursor } from '../../types/sdk/observation';
import type {
	BuiltObservationLogStore,
	ObservationLogEntry,
	ObservationLogMarker,
	ObservationLogObserveFn,
	ObservationLogObserverInput,
} from '../../types/sdk/observation-log';
import type { BuiltTelemetry } from '../../types/telemetry';
import { estimateObservationTokens, type TokenCounter } from '../model/model-token-counter';

export type { ObservationLogObserveFn, ObservationLogObserverInput };

const MARKER_BY_TOKEN: Record<string, ObservationLogMarker> = {
	CRITICAL: 'critical',
	IMPORTANT: 'important',
	INFO: 'info',
	COMPLETION: 'completion',
};

const BULLET_PATTERN =
	/^(\s*)[*-]\s+(CRITICAL|IMPORTANT|INFO|COMPLETION)(?:\s+\(\d{2}:\d{2}\))?\s+(.+)$/iu;
const DEFAULT_MAX_SERIALIZED_CHARS = 2_000;
const DEFAULT_MAX_STRING_CHARS = 500;
const DEFAULT_MAX_ARRAY_ITEMS = 20;
const DEFAULT_MAX_OBJECT_KEYS = 40;
const REDACTED_VALUE = '[REDACTED]';
// Built from the shared secret-key vocabulary (@n8n/utils/scrub-secrets) plus
// a few key names that vocabulary doesn't cover (bare `token`, private keys,
// client secrets, session cookies) — catches secrets sitting under a
// sensitive object key regardless of value shape.
const SENSITIVE_KEY_PATTERN = new RegExp(
	`(?:^|[_-])(?:${SECRET_KEYS}|token|private[_-]?key|client[_-]?secret|session[_-]?cookie)(?:$|[_-])`,
	'i',
);

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
	setCursor(cursor: ObservationCursor): Promise<void>;
}

export interface RunObservationLogObserverOpts {
	memory: ObservationLogObserverMemory;
	observationScopeId: string;
	observerThresholdTokens: number;
	observationLogTailLimit: number;
	observe: ObservationLogObserveFn;
	tokenCounter?: TokenCounter;
	now?: Date;
	onMalformedLine?: (line: string) => void;
	executionCounter?: AgentExecutionCounter;
	telemetry?: BuiltTelemetry;
}

export type RunObservationLogObserverResult =
	| { status: 'skipped'; reason: 'no-delta' }
	| { status: 'skipped'; reason: 'below-threshold'; tokenCount: number }
	| {
			status: 'ran';
			observationsWritten: number;
			cursorAdvanced: boolean;
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
					`[${timestamp}] tool_result ${toolCall.toolName} output=${wrapUntrustedObserverData(serializeForObserver(toolCall.output, options), toolCall.toolName)}`,
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
	const cursor = await memory.getCursor(observationScopeId);
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

	const tokenCounter = opts.tokenCounter ?? estimateObservationTokens;
	const transcript = renderObserverTranscript(deltaMessages);
	const tokenCount = await tokenCounter(transcript);
	if (tokenCount < opts.observerThresholdTokens) {
		return { status: 'skipped', reason: 'below-threshold', tokenCount };
	}

	const observationLogTail = (
		await memory.getActiveObservationLog({
			observationScopeId,
			limit: opts.observationLogTailLimit,
			order: 'desc',
		})
	).reverse();
	const now = opts.now ?? new Date();
	const renderedObservationLogTail = renderObservationLog(observationLogTail);
	const markdown = await opts.observe({
		observationScopeId,
		now,
		deltaMessages,
		transcript,
		transcriptTokenCount: tokenCount,
		observationLogTail,
		renderedObservationLogTail,
		executionCounter: opts.executionCounter,
		telemetry: opts.telemetry,
	});

	const parsed = parseObservationLogMarkdown(markdown);
	for (const line of parsed.skippedLines) {
		opts.onMalformedLine?.(line);
	}

	const prepared = await Promise.all(
		parsed.entries.map(async (entry) => {
			const text = redactText(entry.text).text;
			return {
				marker: entry.marker,
				parentIndex: entry.parentIndex,
				text,
				tokenCount: await tokenCounter(text),
			};
		}),
	);

	const inserted: ObservationLogEntry[] = [];
	for (const entry of prepared) {
		const parentId = entry.parentIndex === null ? null : (inserted[entry.parentIndex]?.id ?? null);
		const [row] = await memory.appendObservationLogEntries([
			{
				observationScopeId,
				marker: entry.marker,
				text: entry.text,
				parentId,
				tokenCount: entry.tokenCount,
				createdAt: new Date(now.getTime() + inserted.length),
			},
		]);
		inserted.push(row);
	}

	// Only advance the cursor once the delta is actually represented by
	// persisted observations. Advancing after an empty or unparseable observe()
	// result would mark these messages "observed" with no summary standing in
	// for them, which permanently orphans them from loaded history.
	const cursorAdvanced = inserted.length > 0;
	if (cursorAdvanced) {
		await advanceObserverCursor(
			memory,
			observationScopeId,
			deltaMessages[deltaMessages.length - 1],
			now,
		);
	}

	return {
		status: 'ran',
		observationsWritten: inserted.length,
		cursorAdvanced,
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

function compactForObserver(value: unknown, options: RenderObserverTranscriptOptions): unknown {
	const maxStringChars = options.maxStringChars ?? DEFAULT_MAX_STRING_CHARS;
	const maxArrayItems = options.maxArrayItems ?? DEFAULT_MAX_ARRAY_ITEMS;
	const maxObjectKeys = options.maxObjectKeys ?? DEFAULT_MAX_OBJECT_KEYS;

	if (typeof value === 'string') {
		return truncateString(redactText(value).text, maxStringChars, 'string');
	}
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
		if (isSensitiveKey(key)) {
			result[key] = REDACTED_VALUE;
		} else if (shouldStripBlob(key, entryValue)) {
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

function isSensitiveKey(key: string): boolean {
	return SENSITIVE_KEY_PATTERN.test(key);
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

async function advanceObserverCursor(
	memory: ObservationLogObserverMemory,
	observationScopeId: string,
	lastMessage: AgentDbMessage,
	now: Date,
): Promise<void> {
	await memory.setCursor({
		observationScopeId,
		lastObservedMessageId: lastMessage.id,
		lastObservedAt: lastMessage.createdAt,
		updatedAt: now,
	});
}
