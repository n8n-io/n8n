/**
 * Splits each run-debug model step into prompt blocks (system sections, skill catalog, tool
 * schemas, message parts, skill bodies) and counts each block with the Anthropic count_tokens
 * API: the block in a small request minus the same request without it. Counts are cached by
 * request hash. Without ANTHROPIC_API_KEY the counts are chars / 3.5 estimates.
 */
import type { InstanceAiRunDebugStep } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { sleep } from '@n8n/utils/sleep';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import pLimit from 'p-limit';

type BlockKind = 'fixed' | 'growing';

interface AnthropicText {
	type: 'text';
	text: string;
}

type AnthropicContent =
	| AnthropicText
	| { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
	| { type: 'tool_result'; tool_use_id: string; content: string | AnthropicText[] };

interface AnthropicMessage {
	role: 'user' | 'assistant';
	content: string | AnthropicContent[];
}

interface AnthropicTool {
	name: string;
	description?: string;
	input_schema: unknown;
}

interface CountRequest {
	system?: string;
	tools?: AnthropicTool[];
	messages: AnthropicMessage[];
}

interface BlockSpec {
	key: string;
	kind: BlockKind;
	request: CountRequest;
	reference: CountRequest;
}

export interface TokenComposition {
	method: 'count_tokens' | 'estimate';
	model: string;
	/** Tokens per block and step; null where the step has no such block. */
	blocks: Array<{ key: string; kind: BlockKind; tokens: Array<number | null>; paid: number }>;
	steps: Array<{
		reportedInput?: number;
		baseline: number;
		fixed: number;
		growing: number;
		/** Reported input minus baseline and blocks: message framing and count drift. */
		residual?: number;
		output: {
			reported?: number;
			/** Reported by the provider: the thinking the model did, not the shown summary. */
			reasoning?: number;
			text: number;
			toolCalls: Array<{ tool: string; tokens: number }>;
			residual?: number;
		};
	}>;
	top10: Array<{ key: string; paid: number }>;
}

const USER_DOT: AnthropicMessage = { role: 'user', content: '.' };
const BASELINE: CountRequest = { messages: [USER_DOT] };
// A tool_use block needs tools in the request; this one keeps the tool-use preamble constant.
const DUMMY_TOOLS: AnthropicTool[] = [
	{ name: 'x', description: 'd', input_schema: { type: 'object', properties: {} } },
];
const TOOL_BASELINE: CountRequest = { tools: DUMMY_TOOLS, messages: [USER_DOT] };

const CATALOG_START = 'Skill loading protocol:';
// The last line of renderSkillCatalogPrompt in @n8n/agents.
const CATALOG_END = '- Do not load a skill just because it is listed here.';
const SKILL_MARKER = /^\[Skill: "([^"\n]+)"\]$/gm;

const stringOr = (value: unknown, fallback: string) =>
	typeof value === 'string' ? value : fallback;
const numberOrUndefined = (value: unknown) => (typeof value === 'number' ? value : undefined);
const recordsOf = (value: unknown) => (Array.isArray(value) ? value.filter(isRecord) : []);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

// ── Blocks ──────────────────────────────────────────────────────────────────

/** A request with one tool call and its result; `result` '.' keeps the result non-empty. */
const toolCallRequest = (
	name: string,
	input: Record<string, unknown>,
	result: string | AnthropicText[] = '.',
): CountRequest => ({
	tools: DUMMY_TOOLS,
	messages: [
		USER_DOT,
		{ role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_count', name, input }] },
		{
			role: 'user',
			content: [{ type: 'tool_result', tool_use_id: 'toolu_count', content: result }],
		},
	],
});

const assistantTextRequest = (text: string): CountRequest => ({
	messages: [USER_DOT, { role: 'assistant', content: [{ type: 'text', text }] }, USER_DOT],
});

const toolInput = (value: unknown): Record<string, unknown> => {
	if (isRecord(value)) return value;
	if (typeof value !== 'string') return { value };
	try {
		const parsed: unknown = JSON.parse(value);
		return isRecord(parsed) ? parsed : { value: parsed };
	} catch {
		return { value };
	}
};

/** Text chunks of `text`; each `[Skill: "name"]` envelope starts a skill body chunk. */
function splitSkillBodies(text: string): Array<{ skill?: string; text: string }> {
	const markers = [...text.matchAll(SKILL_MARKER)];
	const head = text.slice(0, markers[0]?.index ?? text.length);
	return [
		...(head.trim() ? [{ text: head }] : []),
		...markers.map((marker, index) => ({
			skill: marker[1],
			text: text.slice(marker.index, markers[index + 1]?.index),
		})),
	];
}

interface Section {
	label: string;
	lines: string[];
	closed: boolean;
}

/** Top-level `## ` headings, `<tag>` … `</tag>` blocks and the skill catalog of a system prompt. */
function systemSections(text: string): Array<{ label: string; text: string }> {
	const { sections } = text.split('\n').reduce<{ sections: Section[]; open?: string }>(
		(state, line) => {
			const last = state.sections.at(-1);
			const tag = state.open ? undefined : line.match(/^<([\w-]+)>$/)?.[1];
			const label = state.open
				? undefined
				: tag
					? `<${tag}>`
					: line.startsWith('## ')
						? line
						: line === CATALOG_START
							? 'skill catalog'
							: !last || (last.closed && line.trim())
								? '(text)'
								: undefined;
			const closes =
				(state.open !== undefined && line === `</${state.open}>`) || line === CATALOG_END;
			const current: Section =
				label || !last
					? { label: label ?? '(text)', lines: [line], closed: closes }
					: { ...last, lines: [...last.lines, line], closed: last.closed || closes };
			return {
				sections:
					label || !last ? [...state.sections, current] : [...state.sections.slice(0, -1), current],
				open: tag ?? (closes ? undefined : state.open),
			};
		},
		{ sections: [] },
	);
	return sections.flatMap((section) =>
		splitSkillBodies(section.lines.join('\n')).map((chunk) => ({
			label: chunk.skill
				? `skill body ${chunk.skill}`
				: section.label === 'skill catalog'
					? section.label
					: `system ${section.label}`,
			text: chunk.text,
		})),
	);
}

const systemBlock = (key: string, text: string): BlockSpec => ({
	key,
	kind: 'fixed',
	request: { system: text, messages: [USER_DOT] },
	reference: BASELINE,
});

function systemTexts(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap(systemTexts);
	if (!isRecord(value)) return [];
	if (typeof value.content === 'string') return [value.content];
	return recordsOf(value.content).flatMap((part) =>
		typeof part.text === 'string' ? [part.text] : [],
	);
}

/** Tool results as the Anthropic provider sends them: json values become JSON text. */
function toolResultTexts(output: unknown): string[] {
	if (!isRecord(output)) return [JSON.stringify(output)];
	if (output.type === 'text' || output.type === 'error-text') return [stringOr(output.value, '')];
	if (output.type === 'json' || output.type === 'error-json') return [JSON.stringify(output.value)];
	if (output.type === 'content') {
		return recordsOf(output.value).map((part) =>
			typeof part.text === 'string' ? part.text : JSON.stringify(part),
		);
	}
	return [JSON.stringify(output)];
}

function messagePartBlocks(role: string, part: Record<string, unknown>, key: string): BlockSpec[] {
	const text = typeof part.text === 'string' ? part.text : JSON.stringify(part);
	if (part.type === 'tool-call') {
		const tool = stringOr(part.toolName, '?');
		return [
			{
				key: `${key} call ${tool}`,
				kind: 'growing',
				request: toolCallRequest(tool, toolInput(part.input ?? part.args)),
				reference: TOOL_BASELINE,
			},
		];
	}
	if (part.type === 'tool-result') {
		const tool = stringOr(part.toolName, '?');
		const chunks = toolResultTexts(part.output).flatMap(splitSkillBodies);
		const resultBlock = (label: string, texts: string[]): BlockSpec => ({
			key: `${key} ${label}`,
			kind: 'growing',
			request: toolCallRequest(
				tool,
				{},
				texts.map((text): AnthropicText => ({ type: 'text', text })),
			),
			reference: toolCallRequest(tool, {}),
		});
		const plain = chunks.flatMap((chunk) => (chunk.skill ? [] : [chunk.text]));
		return [
			...(plain.length ? [resultBlock(`result ${tool}`, plain)] : []),
			...chunks.flatMap((chunk) =>
				chunk.skill ? [resultBlock(`skill body ${chunk.skill}`, [chunk.text])] : [],
			),
		];
	}
	if (role === 'assistant') {
		const label = part.type === 'reasoning' ? 'assistant reasoning' : 'assistant text';
		return [
			{
				key: `${key} ${label}`,
				kind: 'growing',
				request: assistantTextRequest(text),
				reference: assistantTextRequest('.'),
			},
		];
	}
	return [
		{
			key: `${key} ${role} text`,
			kind: 'growing',
			request: {
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'text', text: '.' },
							{ type: 'text', text },
						],
					},
				],
			},
			reference: BASELINE,
		},
	];
}

function messageBlocks(messages: unknown): BlockSpec[] {
	return recordsOf(messages).flatMap((message, messageIndex) => {
		const role = stringOr(message.role, 'user');
		if (role === 'system') {
			return systemTexts(message.content).flatMap((text) =>
				systemSections(text).map((section) =>
					systemBlock(`m${messageIndex} ${section.label}`, section.text),
				),
			);
		}
		const parts =
			typeof message.content === 'string'
				? [{ type: 'text', text: message.content }]
				: recordsOf(message.content);
		return parts.flatMap((part, partIndex) =>
			messagePartBlocks(role, part, `m${messageIndex}.${partIndex}`),
		);
	});
}

/** `stepTools` carries the JSON schema the model got; `tools` is the summary fallback. */
function stepTools(input: Record<string, unknown>): AnthropicTool[] {
	const listed: Array<[unknown, unknown]> = Array.isArray(input.stepTools)
		? recordsOf(input.stepTools).map((tool) => [tool.name, tool])
		: Object.entries(isRecord(input.tools) ? input.tools : {});
	return listed.flatMap(([name, tool]) =>
		typeof name === 'string' && isRecord(tool) && tool.inputSchema !== undefined
			? [
					{
						name,
						...(typeof tool.description === 'string' ? { description: tool.description } : {}),
						input_schema: tool.inputSchema,
					},
				]
			: [],
	);
}

/** Keys stay unique within a step: a repeated label gets its occurrence number. */
const uniqueKeys = (blocks: BlockSpec[]) =>
	blocks.map((block, index) => {
		const earlier = blocks.slice(0, index).filter((other) => other.key === block.key).length;
		return earlier ? { ...block, key: `${block.key} #${earlier + 1}` } : block;
	});

// ── Counting ────────────────────────────────────────────────────────────────

type Count = (request: CountRequest) => Promise<number>;

async function countTokensApi(apiKey: string, body: unknown, attempt = 0): Promise<number> {
	const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'content-type': 'application/json',
		},
		body: JSON.stringify(body),
	});
	if ((response.status === 429 || response.status >= 500) && attempt < 5) {
		const retryAfter = Number(response.headers.get('retry-after') ?? 0);
		await sleep(Math.max(retryAfter * 1000, 1000 * 2 ** attempt));
		return await countTokensApi(apiKey, body, attempt + 1);
	}
	const parsed: unknown = await response.json();
	const tokens = isRecord(parsed) ? numberOrUndefined(parsed.input_tokens) : undefined;
	if (!response.ok || tokens === undefined) {
		throw new Error(`count_tokens ${response.status}: ${JSON.stringify(parsed).slice(0, 300)}`);
	}
	return tokens;
}

/** Counts through the API with a file cache, or estimates as chars / 3.5 without a key. */
export function tokenCounter(cacheFile: string) {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	const loaded: unknown = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
	const cache = new Map<string, number>(
		Object.entries(isRecord(loaded) ? loaded : {}).flatMap(
			([key, value]): Array<[string, number]> => (typeof value === 'number' ? [[key, value]] : []),
		),
	);
	const method: TokenComposition['method'] = apiKey ? 'count_tokens' : 'estimate';
	const limit = pLimit(8);
	const count = (model: string): Count =>
		apiKey
			? async (request) => {
					const body = { model, ...request };
					const key = createHash('sha256').update(JSON.stringify(body)).digest('hex');
					const cached = cache.get(key);
					if (cached !== undefined) return cached;
					const tokens = await limit(async () => await countTokensApi(apiKey, body));
					cache.set(key, tokens);
					return tokens;
				}
			: async (request) => JSON.stringify(request).length / 3.5;
	return {
		method,
		count,
		save: () => writeFileSync(cacheFile, JSON.stringify(Object.fromEntries(cache))),
	};
}

const difference = async (count: Count, block: BlockSpec) => {
	const [withBlock, without] = await Promise.all([count(block.request), count(block.reference)]);
	return withBlock - without;
};

/**
 * Tools alone: `tools=[tool]` minus no tools, which also pays the tool-use preamble once per tool.
 * All tools together pay it once, so the preamble is the overlap of the single counts.
 */
interface CountedBlock {
	key: string;
	kind: BlockKind;
	tokens: number;
}

async function toolTokens(
	count: Count,
	tools: AnthropicTool[],
	baseline: number,
): Promise<CountedBlock[]> {
	const single = await Promise.all(
		tools.map(async (tool) => (await count({ tools: [tool], messages: [USER_DOT] })) - baseline),
	);
	const together = tools.length ? (await count({ tools, messages: [USER_DOT] })) - baseline : 0;
	const preamble = tools.length > 1 ? (sum(single) - together) / (tools.length - 1) : 0;
	const preambleBlocks: CountedBlock[] = preamble
		? [{ key: 'tool-use preamble', kind: 'fixed', tokens: preamble }]
		: [];
	return [
		...preambleBlocks,
		...tools.map(
			(tool, index): CountedBlock => ({
				key: `tool ${tool.name}`,
				kind: 'fixed',
				tokens: (single[index] ?? 0) - preamble,
			}),
		),
	];
}

async function outputSplit(count: Count, output: Record<string, unknown>) {
	const parts = recordsOf(output.content);
	const [assistantDot, toolBaseline] = await Promise.all([
		count(assistantTextRequest('.')),
		count(TOOL_BASELINE),
	]);
	const text = await Promise.all(
		parts
			.filter((part) => part.type === 'text' && typeof part.text === 'string')
			.map(
				async (part) => (await count(assistantTextRequest(stringOr(part.text, '')))) - assistantDot,
			),
	);
	const toolCalls = await Promise.all(
		parts
			.filter((part) => part.type === 'tool-call')
			.map(async (part) => {
				const tool = stringOr(part.toolName, '?');
				const request = toolCallRequest(tool, toolInput(part.input ?? part.args));
				return { tool, tokens: Math.round((await count(request)) - toolBaseline) };
			}),
	);
	const reported = numberOrUndefined(
		isRecord(output.usage) ? output.usage.outputTokens : undefined,
	);
	const details = isRecord(output.usage) ? output.usage.outputTokenDetails : undefined;
	const reasoning = numberOrUndefined(isRecord(details) ? details.reasoningTokens : undefined);
	const counted = Math.round(sum(text)) + sum(toolCalls.map((call) => call.tokens));
	return {
		reported,
		reasoning,
		text: Math.round(sum(text)),
		toolCalls,
		residual: reported === undefined ? undefined : reported - (reasoning ?? 0) - counted,
	};
}

async function stepComposition(count: Count, step: InstanceAiRunDebugStep) {
	const input = step.input ?? {};
	const output = step.output ?? {};
	const baseline = await count(BASELINE);
	const specs = uniqueKeys([
		...systemTexts(input.instructions ?? input.system).flatMap((text) =>
			systemSections(text).map((section) => systemBlock(section.label, section.text)),
		),
		...messageBlocks(input.messages),
	]);
	const counted = await Promise.all(
		specs.map(async (spec) => ({
			key: spec.key,
			kind: spec.kind,
			tokens: await difference(count, spec),
		})),
	);
	const blocks = [...(await toolTokens(count, stepTools(input), baseline)), ...counted].map(
		(block) => ({ ...block, tokens: Math.round(block.tokens) }),
	);
	const usage = isRecord(output.usage) ? output.usage : {};
	const reportedInput = numberOrUndefined(usage.inputTokens);
	const kindTotal = (kind: BlockKind) =>
		sum(blocks.filter((block) => block.kind === kind).map((block) => block.tokens));
	return {
		blocks,
		summary: {
			reportedInput,
			baseline: Math.round(baseline),
			fixed: kindTotal('fixed'),
			growing: kindTotal('growing'),
			residual:
				reportedInput === undefined
					? undefined
					: reportedInput - Math.round(baseline) - kindTotal('fixed') - kindTotal('growing'),
			output: await outputSplit(count, output),
		},
	};
}

const ANTHROPIC_FALLBACK_MODEL = 'claude-opus-4-5';

/** The run's model when it is an Anthropic model, else a current Claude model. */
function countModel(steps: InstanceAiRunDebugStep[]) {
	const input = steps[0]?.input ?? {};
	const modelId = stringOr(input.modelId, '');
	return stringOr(input.provider, '').startsWith('anthropic') && modelId
		? modelId
		: ANTHROPIC_FALLBACK_MODEL;
}

export async function tokenComposition(
	counter: ReturnType<typeof tokenCounter>,
	steps: InstanceAiRunDebugStep[],
): Promise<TokenComposition> {
	const model = countModel(steps);
	const count = counter.count(model);
	const perStep = await steps.reduce<Promise<Array<Awaited<ReturnType<typeof stepComposition>>>>>(
		async (previous, step) => [...(await previous), await stepComposition(count, step)],
		Promise.resolve([]),
	);
	counter.save();
	const keys = [...new Set(perStep.flatMap((step) => step.blocks.map((block) => block.key)))];
	const blocks = keys.map((key) => {
		const tokens = perStep.map(
			(step) => step.blocks.find((block) => block.key === key)?.tokens ?? null,
		);
		const kind = perStep.flatMap((step) => step.blocks).find((block) => block.key === key)?.kind;
		return {
			key,
			kind: kind ?? 'growing',
			tokens,
			paid: sum(tokens.map((value) => value ?? 0)),
		};
	});
	return {
		method: counter.method,
		model,
		blocks,
		steps: perStep.map((step) => step.summary),
		top10: [...blocks]
			.sort((a, b) => b.paid - a.paid)
			.slice(0, 10)
			.map(({ key, paid }) => ({ key, paid })),
	};
}

// ── Printing ────────────────────────────────────────────────────────────────

const cell = (value: number | null | undefined) =>
	value === null || value === undefined ? '-' : String(Math.round(value));

const row = (cells: string[]) => `| ${cells.join(' | ')} |`;

export function printComposition(label: string, composition: TokenComposition) {
	const { steps, blocks } = composition;
	const stepHeaders = steps.map((_, index) => `s${index + 1}`);
	const perStep = (name: string, values: Array<number | undefined>, paid?: number) =>
		row([name, '', ...values.map(cell), cell(paid ?? sum(values.map((value) => value ?? 0)))]);
	const method =
		composition.method === 'estimate' ? 'estimate, chars / 3.5' : 'exact, Anthropic count_tokens';
	const totalInput = sum(steps.map((step) => step.reportedInput ?? 0));
	console.log(`\nComposition [${label}] (${method}, model ${composition.model})`);
	console.log(row(['block', 'kind', ...stepHeaders, 'paid']));
	console.log(`|${'---|'.repeat(stepHeaders.length + 3)}`);
	for (const block of blocks) {
		console.log(row([block.key, block.kind, ...block.tokens.map(cell), cell(block.paid)]));
	}
	console.log(
		perStep(
			'baseline request',
			steps.map((step) => step.baseline),
		),
	);
	console.log(
		perStep(
			'fixed (system + tools)',
			steps.map((step) => step.fixed),
		),
	);
	console.log(
		perStep(
			'growing (messages)',
			steps.map((step) => step.growing),
		),
	);
	console.log(
		perStep(
			'sum (baseline + blocks)',
			steps.map((step) => step.baseline + step.fixed + step.growing),
		),
	);
	console.log(
		perStep(
			'reported input',
			steps.map((step) => step.reportedInput),
		),
	);
	console.log(
		perStep(
			'residual (reported - sum)',
			steps.map((step) => step.residual),
		),
	);

	console.log(`\nTop 10 blocks by tokens paid over all steps [${label}]`);
	console.log(row(['block', 'paid', '% of reported input']));
	console.log('|---|---|---|');
	for (const top of composition.top10) {
		const share = totalInput ? ((100 * top.paid) / totalInput).toFixed(1) : '-';
		console.log(row([top.key, cell(top.paid), share]));
	}

	console.log(`\nOutput per step [${label}]`);
	console.log(row(['step', 'reported', 'reasoning', 'text', 'tool calls', 'residual']));
	console.log('|---|---|---|---|---|---|');
	steps.forEach((step, index) => {
		const calls = step.output.toolCalls.map((call) => `${call.tool} ${call.tokens}`).join(', ');
		console.log(
			row([
				`s${index + 1}`,
				cell(step.output.reported),
				cell(step.output.reasoning),
				cell(step.output.text),
				calls || '-',
				cell(step.output.residual),
			]),
		);
	});
}
