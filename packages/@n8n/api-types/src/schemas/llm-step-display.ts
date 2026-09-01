/**
 * Shared LLM step display helpers for Instance AI run debug.
 *
 * Used by the frontend debug modal, eval HTML reports, and any tooling
 * that renders InstanceAiRunDebug* API payloads.
 */

export interface ReadableContentBlock {
	role: string;
	content: string;
	segments?: ReadableSegment[];
	metadata?: unknown;
}

export type ReadableSegment =
	| { type: 'text'; text: string }
	| { type: 'tool-call'; name: string; payload?: unknown; metadata?: unknown }
	| { type: 'tool-result'; name?: string; payload?: unknown; metadata?: unknown }
	| { type: 'json'; payload: unknown; label?: string }
	| { type: 'reasoning'; text: string };

export interface ReadableToolCallBlock {
	name: string;
	kind?: 'input' | 'output';
	payload?: unknown;
	content: string;
	metadata?: unknown;
}

export interface StepDebugSummary {
	finishReason?: string;
	toolNames: string[];
	usageLabel?: string;
	messagePreview?: string;
	systemCharCount?: number;
}

export interface ReadableUsageSummary {
	label: string;
	metadata: unknown;
}

export interface ParsedSystemPromptDisplay {
	systemBlocks: ReadableContentBlock[];
	observations: string | null;
}

const OBSERVATIONS_BLOCK_PATTERN = /<observations>([\s\S]*?)<\/observations>/i;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function formatDebugJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function looksLikeJsonString(value: string): boolean {
	const trimmed = value.trim();
	return (
		(trimmed.startsWith('{') && trimmed.endsWith('}')) ||
		(trimmed.startsWith('[') && trimmed.endsWith(']'))
	);
}

function unwrapJsonPayload(value: unknown): unknown {
	if (isRecord(value) && value.type === 'json' && 'value' in value) {
		return value.value;
	}
	return value;
}

export function summarizeJsonValue(value: unknown): string {
	const unwrapped = unwrapJsonPayload(value);

	if (unwrapped === null) return 'null';
	if (unwrapped === undefined) return 'undefined';
	if (typeof unwrapped === 'string') {
		const trimmed = unwrapped.trim();
		if (looksLikeJsonString(trimmed)) {
			try {
				return summarizeJsonValue(JSON.parse(trimmed));
			} catch {
				// fall through
			}
		}
		return trimmed.length > 96 ? `${trimmed.slice(0, 96)}…` : trimmed;
	}
	if (typeof unwrapped === 'number' || typeof unwrapped === 'boolean') {
		return String(unwrapped);
	}
	if (Array.isArray(unwrapped)) {
		return `[${unwrapped.length} items]`;
	}
	if (isRecord(unwrapped)) {
		const keys = Object.keys(unwrapped);
		if (keys.length === 0) return '{}';
		if (keys.length === 1) {
			const key = keys[0] ?? 'key';
			const entry = summarizeJsonValue(unwrapped[key]);
			return `{ ${key}: ${entry} }`;
		}
		const preview = keys.slice(0, 2).join(', ');
		return keys.length > 2 ? `{ ${preview}, +${keys.length - 2} }` : `{ ${preview} }`;
	}

	const formatted = formatDebugJson(unwrapped);
	return formatted.length > 96 ? `${formatted.slice(0, 96)}…` : formatted;
}

function omitKeys(record: Record<string, unknown>, keys: ReadonlySet<string>): unknown {
	const rest: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(record)) {
		if (!keys.has(key)) {
			rest[key] = value;
		}
	}
	return Object.keys(rest).length > 0 ? rest : undefined;
}

function parsePartSegment(part: unknown): ReadableSegment[] {
	if (!isRecord(part)) {
		return [{ type: 'json', payload: part }];
	}

	if (part.type === 'text' && typeof part.text === 'string') {
		return [{ type: 'text', text: part.text }];
	}

	if (part.type === 'tool-call') {
		const name =
			(typeof part.toolName === 'string' && part.toolName) ||
			(typeof part.name === 'string' && part.name) ||
			'tool';
		const input = part.input ?? part.args;
		return [
			{
				type: 'tool-call',
				name,
				payload: input,
				metadata: omitKeys(part, new Set(['type', 'toolName', 'name', 'input', 'args'])),
			},
		];
	}

	if (part.type === 'tool-result') {
		const name =
			(typeof part.toolName === 'string' && part.toolName) ||
			(typeof part.name === 'string' && part.name) ||
			undefined;
		const output = part.output ?? part.result ?? part;
		return [
			{
				type: 'tool-result',
				name,
				payload: output,
				metadata: omitKeys(part, new Set(['type', 'toolName', 'name', 'output', 'result'])),
			},
		];
	}

	if (part.type === 'reasoning' && typeof part.text === 'string') {
		return [{ type: 'reasoning', text: part.text }];
	}

	if (part.type === 'file') {
		const mediaType = typeof part.mediaType === 'string' ? part.mediaType : 'file';
		return [{ type: 'json', payload: part, label: `file: ${mediaType}` }];
	}

	return [
		{
			type: 'json',
			payload: part,
			label: typeof part.type === 'string' ? String(part.type) : undefined,
		},
	];
}

function parseContentSegments(content: unknown): ReadableSegment[] {
	if (typeof content === 'string') {
		const trimmed = content.trim();
		if (trimmed.length === 0) return [];
		if (looksLikeJsonString(trimmed)) {
			try {
				return [{ type: 'json', payload: JSON.parse(trimmed) }];
			} catch {
				// fall through
			}
		}
		return [{ type: 'text', text: content }];
	}

	if (Array.isArray(content)) {
		return content.flatMap((part) => parsePartSegment(part));
	}

	if (isRecord(content)) {
		if (typeof content.type === 'string') {
			return parsePartSegment(content);
		}
		return [{ type: 'json', payload: content }];
	}

	if (content === undefined || content === null) {
		return [];
	}

	return [{ type: 'json', payload: content }];
}

function segmentsToPreview(segments: ReadableSegment[]): string {
	return segments
		.map((segment) => {
			switch (segment.type) {
				case 'text':
					return segment.text;
				case 'tool-call':
					return `[tool-call: ${segment.name}]`;
				case 'tool-result':
					return segment.name ? `[tool-result: ${segment.name}]` : '[tool-result]';
				case 'reasoning':
					return segment.text;
				case 'json':
					return summarizeJsonValue(segment.payload);
			}
		})
		.filter((entry) => entry.length > 0)
		.join('\n\n');
}

function inferRoleFromValue(value: Record<string, unknown>, fallback: string): string {
	if (typeof value.role === 'string') {
		return value.role;
	}
	if (value.type === 'tool-result') {
		return 'tool';
	}
	if (value.type === 'tool-call') {
		return 'assistant';
	}
	return fallback;
}

function createTextBlock(
	role: string,
	text: string,
	segmentType: 'text' | 'reasoning' = 'text',
): ReadableContentBlock {
	if (segmentType === 'reasoning') {
		return {
			role,
			content: text,
			segments: [{ type: 'reasoning', text }],
		};
	}

	return {
		role,
		content: text,
		segments: [{ type: 'text', text }],
	};
}

function toolCallToBlock(toolCall: ReadableToolCallBlock): ReadableContentBlock {
	return {
		role: 'assistant',
		content: `[tool-call: ${toolCall.name}]`,
		segments: [
			{
				type: 'tool-call',
				name: toolCall.name,
				payload: toolCall.payload,
				metadata: toolCall.metadata,
			},
		],
	};
}

function toolResultToBlock(toolResult: ReadableToolCallBlock): ReadableContentBlock {
	return {
		role: 'tool',
		content: toolResult.name ? `[tool-result: ${toolResult.name}]` : '[tool-result]',
		segments: [
			{
				type: 'tool-result',
				name: toolResult.name,
				payload: toolResult.payload,
				metadata: toolResult.metadata,
			},
		],
	};
}

function parseContentBlock(
	role: string,
	value: unknown,
	contentKey = 'content',
): ReadableContentBlock {
	if (typeof value === 'string') {
		const segments = parseContentSegments(value);
		return {
			role,
			content: segmentsToPreview(segments) || value,
			segments: segments.length > 0 ? segments : undefined,
		};
	}

	if (!isRecord(value)) {
		const segments = [{ type: 'json' as const, payload: value }];
		return {
			role,
			content: summarizeJsonValue(value),
			segments,
		};
	}

	const resolvedRole = inferRoleFromValue(value, role);
	const rawContent = value[contentKey] ?? value.text ?? value;
	const segments = parseContentSegments(rawContent);
	const metadataKeys = new Set<string>([contentKey, 'text', 'role']);
	if (rawContent === value) {
		for (const key of ['type', 'toolName', 'name', 'input', 'args', 'output', 'result']) {
			metadataKeys.add(key);
		}
	}
	const hasToolSegments = segments.some(
		(segment) => segment.type === 'tool-call' || segment.type === 'tool-result',
	);
	if (hasToolSegments) {
		for (const key of ['toolCallId', 'providerMetadata', 'providerOptions']) {
			metadataKeys.add(key);
		}
	}
	const metadata = omitKeys(value, metadataKeys);

	return {
		role: resolvedRole,
		content: segmentsToPreview(segments) || summarizeJsonValue(rawContent),
		segments: segments.length > 0 ? segments : undefined,
		metadata,
	};
}

export function parseSystemBlocks(system: unknown): ReadableContentBlock[] {
	if (system === undefined || system === null) {
		return [];
	}

	if (typeof system === 'string') {
		return [{ role: 'system', content: system, segments: [{ type: 'text', text: system }] }];
	}

	if (Array.isArray(system)) {
		return system.flatMap((entry, index) => {
			const block = parseContentBlock('system', entry);
			return [{ ...block, role: block.role === 'system' ? `system ${index + 1}` : block.role }];
		});
	}

	return [parseContentBlock('system', system)];
}

export function extractObservationsBlock(text: string): {
	withoutObservations: string;
	observations: string | null;
} {
	const match = text.match(OBSERVATIONS_BLOCK_PATTERN);
	if (!match) {
		return { withoutObservations: text, observations: null };
	}

	const observations = match[1]?.trim() ?? null;
	const withoutObservations = text.replace(OBSERVATIONS_BLOCK_PATTERN, '').trim();

	return {
		withoutObservations,
		observations: observations && observations.length > 0 ? observations : null,
	};
}

function extractObservationsFromBlock(block: ReadableContentBlock): {
	block: ReadableContentBlock;
	observations: string | null;
} {
	if (block.segments?.length) {
		let observations: string | null = null;
		const segments: ReadableSegment[] = block.segments.flatMap((segment): ReadableSegment[] => {
			if (segment.type !== 'text') {
				return [segment];
			}

			const extracted = extractObservationsBlock(segment.text);
			if (extracted.observations) {
				observations = observations
					? `${observations}\n\n${extracted.observations}`
					: extracted.observations;
			}

			if (extracted.withoutObservations.trim().length === 0) {
				return [];
			}

			return [{ ...segment, text: extracted.withoutObservations }];
		});

		return {
			block: {
				...block,
				content: segmentsToPreview(segments),
				segments: segments.length > 0 ? segments : undefined,
			},
			observations,
		};
	}

	const extracted = extractObservationsBlock(block.content);
	return {
		block: {
			...block,
			content: extracted.withoutObservations,
			segments: extracted.withoutObservations
				? [{ type: 'text', text: extracted.withoutObservations }]
				: undefined,
		},
		observations: extracted.observations,
	};
}

export function parseSystemPromptForDisplay(system: unknown): ParsedSystemPromptDisplay {
	const blocks = parseSystemBlocks(system);
	const observationsParts: string[] = [];
	const systemBlocks: ReadableContentBlock[] = [];

	for (const block of blocks) {
		const extracted = extractObservationsFromBlock(block);
		if (extracted.observations) {
			observationsParts.push(extracted.observations);
		}
		if (extracted.block.content.trim().length > 0 || extracted.block.segments?.length) {
			systemBlocks.push(extracted.block);
		}
	}

	return {
		systemBlocks,
		observations: observationsParts.length > 0 ? observationsParts.join('\n\n') : null,
	};
}

export function parseMessageBlocks(messages: unknown): ReadableContentBlock[] {
	if (messages === undefined || messages === null) {
		return [];
	}

	if (!Array.isArray(messages)) {
		return [parseContentBlock('message', messages)];
	}

	return messages.map((message, index) => {
		const block = parseContentBlock(`message ${index + 1}`, message);
		return {
			...block,
			role: block.role.startsWith('message ') ? block.role : block.role || `message ${index + 1}`,
		};
	});
}

export function parseToolCallBlocks(toolCalls: unknown): ReadableToolCallBlock[] {
	if (toolCalls === undefined || toolCalls === null) {
		return [];
	}

	if (!Array.isArray(toolCalls)) {
		return [
			{
				name: 'tool',
				payload: toolCalls,
				content: summarizeJsonValue(toolCalls),
			},
		];
	}

	return (toolCalls as unknown[]).map((toolCall: unknown, index) => {
		if (!isRecord(toolCall)) {
			return {
				name: `tool ${index + 1}`,
				payload: toolCall,
				content: summarizeJsonValue(toolCall),
			};
		}

		const name =
			(typeof toolCall.toolName === 'string' && toolCall.toolName) ||
			(typeof toolCall.name === 'string' && toolCall.name) ||
			`tool ${index + 1}`;
		const input = toolCall.input ?? toolCall.args;
		const payload = input ?? toolCall;
		const metadata = omitKeys(
			toolCall,
			new Set(['toolName', 'name', 'input', 'args', 'output', 'result']),
		);

		return {
			name,
			kind: 'input',
			payload,
			content: summarizeJsonValue(payload),
			metadata,
		};
	});
}

export function parseToolResultBlocks(toolResults: unknown): ReadableToolCallBlock[] {
	if (toolResults === undefined || toolResults === null) {
		return [];
	}

	if (!Array.isArray(toolResults)) {
		return [
			{
				name: 'tool result',
				payload: toolResults,
				content: summarizeJsonValue(toolResults),
			},
		];
	}

	return (toolResults as unknown[]).map((toolResult: unknown, index) => {
		if (!isRecord(toolResult)) {
			return {
				name: `result ${index + 1}`,
				payload: toolResult,
				content: summarizeJsonValue(toolResult),
			};
		}

		const name =
			(typeof toolResult.toolName === 'string' && toolResult.toolName) ||
			(typeof toolResult.name === 'string' && toolResult.name) ||
			`tool ${index + 1}`;
		const output = toolResult.output ?? toolResult.result;
		const payload = output ?? toolResult;
		const metadata = omitKeys(
			toolResult,
			new Set(['toolName', 'name', 'output', 'result', 'input', 'args']),
		);

		return {
			name,
			kind: 'output',
			payload,
			content: summarizeJsonValue(payload),
			metadata,
		};
	});
}

export function parseUsageSummary(usage: unknown): ReadableUsageSummary | undefined {
	if (usage === undefined || usage === null) {
		return undefined;
	}

	if (!isRecord(usage)) {
		return { label: formatDebugJson(usage), metadata: usage };
	}

	const inputTokens = usage.inputTokens ?? usage.promptTokens;
	const outputTokens = usage.outputTokens ?? usage.completionTokens;
	const totalTokens = usage.totalTokens;

	const parts: string[] = [];
	if (typeof inputTokens === 'number') parts.push(`in: ${inputTokens}`);
	if (typeof outputTokens === 'number') parts.push(`out: ${outputTokens}`);
	if (typeof totalTokens === 'number') parts.push(`total: ${totalTokens}`);

	return {
		label: parts.length > 0 ? parts.join(' · ') : formatDebugJson(usage),
		metadata: usage,
	};
}

export function parseInputExtras(input: Record<string, unknown> | undefined): unknown {
	if (!input) return undefined;

	const extras: Record<string, unknown> = {};
	const primaryKeys = new Set(['system', 'messages', 'stepNumber', 'sdkStepNumber']);

	for (const [key, value] of Object.entries(input)) {
		if (!primaryKeys.has(key)) {
			extras[key] = value;
		}
	}

	return Object.keys(extras).length > 0 ? extras : undefined;
}

function getBlockDedupeKey(block: ReadableContentBlock): string {
	if (block.segments?.length) {
		return block.segments
			.map((segment) => {
				switch (segment.type) {
					case 'text':
						return `text:${segment.text}`;
					case 'reasoning':
						return `reasoning:${segment.text}`;
					case 'tool-call': {
						const toolCallId =
							isRecord(segment.metadata) && typeof segment.metadata.toolCallId === 'string'
								? segment.metadata.toolCallId
								: '';
						return `tool-call:${segment.name}:${toolCallId}:${formatDebugJson(segment.payload ?? null)}`;
					}
					case 'tool-result': {
						const toolCallId =
							isRecord(segment.metadata) && typeof segment.metadata.toolCallId === 'string'
								? segment.metadata.toolCallId
								: '';
						return `tool-result:${segment.name ?? ''}:${toolCallId}:${formatDebugJson(segment.payload ?? null)}`;
					}
					case 'json':
						return `json:${formatDebugJson(segment.payload)}`;
				}
			})
			.join('|');
	}

	return `${block.role}:${block.content}`;
}

function dedupeContentBlocks(blocks: ReadableContentBlock[]): ReadableContentBlock[] {
	const seen = new Set<string>();
	return blocks.filter((block) => {
		const key = getBlockDedupeKey(block);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

function parsePrimaryOutputMessageBlocks(output: Record<string, unknown>): ReadableContentBlock[] {
	if (isRecord(output.response) && Array.isArray(output.response.messages)) {
		const messages = parseMessageBlocks(output.response.messages);
		if (messages.length > 0) {
			return messages;
		}
	}

	if (output.content !== undefined && output.content !== null) {
		const contentBlocks = parseMessageBlocks(output.content);
		if (contentBlocks.length > 0) {
			return contentBlocks;
		}
	}

	return parseToolCallBlocks(output.toolCalls).map(toolCallToBlock);
}

export function parseOutputDisplayBlocks(
	output: Record<string, unknown> | undefined,
): ReadableContentBlock[] {
	if (!output) {
		return [];
	}

	const blocks: ReadableContentBlock[] = [];

	if (typeof output.text === 'string' && output.text.trim()) {
		blocks.push(createTextBlock('assistant', output.text));
	}

	if (typeof output.reasoningText === 'string' && output.reasoningText.trim()) {
		blocks.push(createTextBlock('reasoning', output.reasoningText, 'reasoning'));
	}

	blocks.push(...parseToolResultBlocks(output.toolResults).map(toolResultToBlock));
	blocks.push(...parsePrimaryOutputMessageBlocks(output));

	return dedupeContentBlocks(blocks);
}

export function parseOutputExtras(output: Record<string, unknown> | undefined): unknown {
	if (!output) return undefined;

	const extras: Record<string, unknown> = {};
	const primaryKeys = new Set([
		'text',
		'toolCalls',
		'toolResults',
		'usage',
		'response',
		'finishReason',
		'stepNumber',
		'sdkStepNumber',
		'content',
		'reasoning',
		'reasoningText',
	]);

	for (const [key, value] of Object.entries(output)) {
		if (!primaryKeys.has(key)) {
			extras[key] = value;
		}
	}

	if (isRecord(output.response)) {
		const responseMeta: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(output.response)) {
			if (key !== 'messages') {
				responseMeta[key] = value;
			}
		}
		if (Object.keys(responseMeta).length > 0) {
			extras.responseMeta = responseMeta;
		}
	}

	return Object.keys(extras).length > 0 ? extras : undefined;
}

export function parseStepSummary(
	input?: Record<string, unknown>,
	output?: Record<string, unknown>,
): StepDebugSummary {
	const toolNames: string[] = [];

	if (Array.isArray(output?.toolCalls)) {
		for (const toolCall of output.toolCalls) {
			if (!isRecord(toolCall)) continue;
			const name =
				(typeof toolCall.toolName === 'string' && toolCall.toolName) ||
				(typeof toolCall.name === 'string' && toolCall.name) ||
				undefined;
			if (name && !toolNames.includes(name)) {
				toolNames.push(name);
			}
		}
	}

	let messagePreview: string | undefined;
	if (Array.isArray(input?.messages) && input.messages.length > 0) {
		const blocks = parseMessageBlocks(input.messages);
		const lastBlock = blocks[blocks.length - 1];
		if (lastBlock?.content) {
			const trimmed = lastBlock.content.trim();
			messagePreview = trimmed.length > 72 ? `${trimmed.slice(0, 72)}…` : trimmed;
		}
	}

	let systemCharCount: number | undefined;
	if (typeof input?.system === 'string') {
		systemCharCount = input.system.length;
	} else if (Array.isArray(input?.system)) {
		systemCharCount = parseSystemBlocks(input.system).reduce(
			(total, block) => total + block.content.length,
			0,
		);
	}

	return {
		finishReason: typeof output?.finishReason === 'string' ? output.finishReason : undefined,
		toolNames,
		usageLabel: parseUsageSummary(output?.usage)?.label,
		messagePreview,
		systemCharCount,
	};
}
