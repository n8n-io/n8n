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

export interface ReadableStepSetting {
	label: string;
	value: string;
}

export interface ReadableStepTool {
	name: string;
	description?: string;
	inputSchema?: unknown;
	/** Character-based estimate, not a provider token count. */
	estimatedTokens: number;
}

export interface ReadableStepConfig {
	settings: ReadableStepSetting[];
	tools: ReadableStepTool[];
	toolsEstimatedTokens: number;
}

/**
 * Most likely reason a step lost its prompt cache:
 * - `tools`, `system`, `settings`: that part of the request changed since the previous step.
 * - `expired`: more than the cache lifetime passed between the steps.
 * - `messages`: none of the above, so an earlier message probably changed.
 */
export type CacheBreakCause = 'tools' | 'system' | 'settings' | 'expired' | 'messages';

export interface StepCacheBreak {
	/** Cached tokens the previous step left for this step to read. */
	expectedReadTokens: number;
	readTokens: number;
	lostTokens: number;
	cause: CacheBreakCause;
}

export interface ReadableUsageDetail {
	label: string;
	tokens: number;
}

export interface ReadableUsageRow {
	label: string;
	tokens: number;
	details: ReadableUsageDetail[];
}

export interface ReadableUsageSummary {
	label: string;
	rows: ReadableUsageRow[];
	settings: ReadableStepSetting[];
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

/**
 * The step's system prompt, wherever the SDK put it. AI SDK v7 standardizes it as
 * `instructions` (`StandardizedPrompt`); `system` is the pre-v7 name, kept as a
 * fallback so snapshots captured before the rename still render. Without this the
 * System section — and the `<observations>` block inside it — reads as empty.
 */
export function stepInstructions(input: Record<string, unknown> | undefined): unknown {
	return input?.instructions ?? input?.system;
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
		return { label: formatDebugJson(usage), rows: [], settings: [], metadata: usage };
	}

	const inputTokens = usage.inputTokens ?? usage.promptTokens;
	const outputTokens = usage.outputTokens ?? usage.completionTokens;
	const totalTokens = usage.totalTokens;

	const parts: string[] = [];
	if (typeof inputTokens === 'number') parts.push(`in: ${inputTokens}`);
	if (typeof outputTokens === 'number') parts.push(`out: ${outputTokens}`);
	if (typeof totalTokens === 'number') parts.push(`total: ${totalTokens}`);

	const rows: ReadableUsageRow[] = [];
	if (typeof inputTokens === 'number') {
		rows.push({
			label: 'input',
			tokens: inputTokens,
			details: parseTokenDetails(usage.inputTokenDetails),
		});
	}
	if (typeof outputTokens === 'number') {
		rows.push({
			label: 'output',
			tokens: outputTokens,
			details: parseTokenDetails(usage.outputTokenDetails),
		});
	}
	if (typeof totalTokens === 'number') {
		rows.push({ label: 'total', tokens: totalTokens, details: [] });
	}

	return {
		label: parts.length > 0 ? parts.join(' · ') : formatDebugJson(usage),
		rows,
		settings: parseRawUsageSettings(usage.raw),
		metadata: usage,
	};
}

const TOKEN_DETAIL_LABELS: Record<string, string> = {
	noCacheTokens: 'uncached',
	cacheReadTokens: 'cache read',
	cacheWriteTokens: 'cache write',
	textTokens: 'text',
	reasoningTokens: 'reasoning',
};

function humanizeTokenKey(key: string): string {
	return (
		TOKEN_DETAIL_LABELS[key] ??
		key
			.replace(/Tokens$/, '')
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.toLowerCase()
	);
}

function parseTokenDetails(details: unknown): ReadableUsageDetail[] {
	if (!isRecord(details)) return [];
	return Object.entries(details).flatMap(([key, tokens]) =>
		typeof tokens === 'number' ? [{ label: humanizeTokenKey(key), tokens }] : [],
	);
}

/**
 * The provider's raw usage repeats the token counts under other names. Only its
 * non-numeric facts (such as service tier or region) add information.
 */
function parseRawUsageSettings(raw: unknown): ReadableStepSetting[] {
	if (!isRecord(raw)) return [];
	return Object.entries(raw).flatMap(([key, value]) =>
		typeof value === 'string' || typeof value === 'boolean'
			? [{ label: key.replace(/_/g, ' '), value: String(value) }]
			: [],
	);
}

function isEmptyContainer(value: unknown): boolean {
	if (Array.isArray(value)) return value.length === 0;
	return isRecord(value) && Object.keys(value).length === 0;
}

function formatSettingValue(value: unknown): string {
	return typeof value === 'string' ? value : formatDebugJson(value);
}

function flattenSettings(value: unknown, path: string, settings: ReadableStepSetting[]): void {
	if (isRecord(value)) {
		for (const [key, entry] of Object.entries(value)) {
			flattenSettings(entry, path ? `${path}.${key}` : key, settings);
		}
		return;
	}
	if (value !== undefined && value !== null && path) {
		settings.push({ label: path, value: formatSettingValue(value) });
	}
}

function formatToolChoice(toolChoice: unknown): string | undefined {
	if (typeof toolChoice === 'string') return toolChoice;
	if (!isRecord(toolChoice) || typeof toolChoice.type !== 'string') return undefined;
	return typeof toolChoice.toolName === 'string'
		? `${toolChoice.type}: ${toolChoice.toolName}`
		: toolChoice.type;
}

/** A Zod instance serialized as plain data. It holds no readable schema. */
function isSerializedZodSchema(value: unknown): boolean {
	return isRecord(value) && (isRecord(value._def) || isRecord(value._zod));
}

/**
 * Rough size of a tool definition in the prompt: about 4 characters per token.
 * The provider tokenizer and its tool framing differ, so this is only an estimate.
 */
function estimateToolTokens(name: string, description?: string, inputSchema?: unknown): number {
	const serialized = JSON.stringify({ name, description, inputSchema }) ?? '';
	return Math.ceil(serialized.length / 4);
}

function toReadableTool(
	name: string,
	description?: string,
	inputSchema?: unknown,
): ReadableStepTool {
	return {
		name,
		description,
		inputSchema,
		estimatedTokens: estimateToolTokens(name, description, inputSchema),
	};
}

function parseStepTools(input: Record<string, unknown>): ReadableStepTool[] {
	if (Array.isArray(input.stepTools)) {
		return input.stepTools
			.filter(isRecord)
			.map((tool, index) =>
				toReadableTool(
					typeof tool.name === 'string' ? tool.name : `tool ${index + 1}`,
					typeof tool.description === 'string' ? tool.description : undefined,
					tool.inputSchema,
				),
			);
	}

	if (isRecord(input.tools)) {
		return Object.entries(input.tools).map(([name, tool]) =>
			toReadableTool(
				name,
				isRecord(tool) && typeof tool.description === 'string' ? tool.description : undefined,
				isRecord(tool) && !isSerializedZodSchema(tool.inputSchema) ? tool.inputSchema : undefined,
			),
		);
	}

	return [];
}

/**
 * Model settings and the tool list the model received for a step, in a form
 * that renders as chips and one row for each tool.
 */
export function parseStepConfig(
	input: Record<string, unknown> | undefined,
): ReadableStepConfig | undefined {
	if (!input) return undefined;

	const settings: ReadableStepSetting[] = [];
	if (typeof input.modelId === 'string') settings.push({ label: 'model', value: input.modelId });
	if (typeof input.provider === 'string') {
		settings.push({ label: 'provider', value: input.provider });
	}

	// With a single provider namespace, its name only repeats the provider setting.
	if (isRecord(input.providerOptions)) {
		const [onlyNamespace, ...otherNamespaces] = Object.keys(input.providerOptions);
		flattenSettings(
			onlyNamespace !== undefined && otherNamespaces.length === 0
				? input.providerOptions[onlyNamespace]
				: input.providerOptions,
			'',
			settings,
		);
	}

	const toolChoice = formatToolChoice(input.stepToolChoice ?? input.toolChoice);
	if (toolChoice) settings.push({ label: 'tool choice', value: toolChoice });

	const tools = parseStepTools(input);
	if (settings.length === 0 && tools.length === 0) return undefined;

	return {
		settings,
		tools,
		toolsEstimatedTokens: tools.reduce((total, tool) => total + tool.estimatedTokens, 0),
	};
}

export function parseInputExtras(input: Record<string, unknown> | undefined): unknown {
	if (!input) return undefined;

	const extras: Record<string, unknown> = {};
	// `instructions` is the v7 name for `system` — both are rendered as the System
	// section, so neither belongs in the extras dump. Config keys render through
	// `parseStepConfig`. `promptMessages` and `steps` repeat data shown elsewhere.
	const shownElsewhere = new Set([
		'system',
		'instructions',
		'messages',
		'stepNumber',
		'sdkStepNumber',
		'modelId',
		'provider',
		'providerOptions',
		'toolChoice',
		'stepToolChoice',
		'tools',
		'stepTools',
		'promptMessages',
		'steps',
	]);

	for (const [key, value] of Object.entries(input)) {
		if (!shownElsewhere.has(key) && !isEmptyContainer(value)) {
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

	// Same field move as the System section: read through `stepInstructions`, or
	// this silently stays undefined for every v7 snapshot. `parseSystemBlocks`
	// handles the string, array and single-object forms alike.
	const instructions = stepInstructions(input);
	let systemCharCount: number | undefined;
	if (typeof instructions === 'string') {
		systemCharCount = instructions.length;
	} else if (instructions !== undefined && instructions !== null) {
		systemCharCount = parseSystemBlocks(instructions).reduce(
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

/**
 * Smallest cached prefix a provider stores (Anthropic: 1024 tokens). A shortfall
 * below this is normal breakpoint movement, not a lost cache.
 */
const CACHE_BREAK_MIN_LOST_TOKENS = 1024;

/** Default lifetime of an ephemeral prompt cache entry. */
const CACHE_TTL_MS = 5 * 60 * 1000;

interface StepLike {
	input?: Record<string, unknown>;
	output?: Record<string, unknown>;
}

function readCacheTokens(output: Record<string, unknown> | undefined) {
	const usage = output?.usage;
	if (!isRecord(usage) || !isRecord(usage.inputTokenDetails)) return undefined;
	const { cacheReadTokens, cacheWriteTokens } = usage.inputTokenDetails;
	if (typeof cacheReadTokens !== 'number' || typeof cacheWriteTokens !== 'number') {
		return undefined;
	}
	return { read: cacheReadTokens, write: cacheWriteTokens };
}

function responseTime(output: Record<string, unknown> | undefined): number | undefined {
	const timestamp = isRecord(output?.response) ? output.response.timestamp : undefined;
	if (typeof timestamp !== 'string') return undefined;
	const time = Date.parse(timestamp);
	return Number.isNaN(time) ? undefined : time;
}

function sameJson(a: unknown, b: unknown): boolean {
	return formatDebugJson(a) === formatDebugJson(b);
}

/**
 * Checks the cached prompt parts in the order the provider hashes them
 * (tools, then system, then request settings). A change in one part discards
 * the cache from that point on.
 */
function findCacheBreakCause(previous: StepLike, current: StepLike): CacheBreakCause {
	const toolsOf = (step: StepLike) => step.input?.stepTools ?? step.input?.tools;
	if (!sameJson(toolsOf(previous), toolsOf(current))) return 'tools';
	if (!sameJson(stepInstructions(previous.input), stepInstructions(current.input))) {
		return 'system';
	}
	const settingsOf = (step: StepLike) => ({
		modelId: step.input?.modelId,
		providerOptions: step.input?.providerOptions,
		toolChoice: step.input?.stepToolChoice ?? step.input?.toolChoice,
	});
	if (!sameJson(settingsOf(previous), settingsOf(current))) return 'settings';

	const previousTime = responseTime(previous.output);
	const currentTime = responseTime(current.output);
	if (
		previousTime !== undefined &&
		currentTime !== undefined &&
		currentTime - previousTime > CACHE_TTL_MS
	) {
		return 'expired';
	}
	return 'messages';
}

/**
 * Finds steps that read back less of the prompt cache than the previous step
 * left in it. A step normally reads what the previous step read plus what it
 * wrote; a large shortfall means the provider recomputed that prompt prefix.
 * Returns one entry for each step, in order.
 */
export function parseStepCacheBreaks(steps: StepLike[]): Array<StepCacheBreak | undefined> {
	return steps.map((step, index) => {
		const previous = index > 0 ? steps[index - 1] : undefined;
		if (!previous) return undefined;

		const previousCache = readCacheTokens(previous.output);
		const currentCache = readCacheTokens(step.output);
		if (!previousCache || !currentCache) return undefined;

		const expectedReadTokens = previousCache.read + previousCache.write;
		const lostTokens = expectedReadTokens - currentCache.read;
		if (lostTokens < CACHE_BREAK_MIN_LOST_TOKENS) return undefined;

		return {
			expectedReadTokens,
			readTokens: currentCache.read,
			lostTokens,
			cause: findCacheBreakCause(previous, step),
		};
	});
}
