/**
 * Builds the viewer data of a node-building eval run folder (the output of
 * `packages/@n8n/node-sdk/evaluations/node-building/run.ts`): one arm per format, old first.
 * A case is a task. An attempt is one `runs/<task>-<format>-<n>` folder. Its checks are
 * expectations, so an attempt passes exactly when the run passed.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { z } from 'zod';

import { median } from '../metrics';
import {
	trialMetricsSchema,
	type ArmCase,
	type BuildTotals,
	type IterationDetail,
	type IterationSummary,
	type ModelStep,
	type TranscriptItem,
	type TrialMetrics,
	type Turn,
} from '../schema';
import { safeId, toolStatsOf, type ExtractedArm } from './extract';
import { caseTitle } from './scenario-title';

const FORMATS = ['old', 'new'] as const;
type Format = (typeof FORMATS)[number];

/** The compile check of each format: `n8n-node build` (old) or `tsc --noEmit` (new). */
const COMPILE_CHECKS = new Set(['build', 'typecheck']);

const runResultSchema = z.object({
	task: z.string(),
	format: z.enum(FORMATS),
	iteration: z.number(),
	pass: z.boolean(),
	checks: z.array(z.object({ name: z.string(), pass: z.boolean(), reason: z.string() })),
	seconds: z.number().optional(),
	turns: z.number().optional(),
	toolCalls: z.number().optional(),
	tokens: z
		.object({
			input: z.number(),
			output: z.number(),
			cacheRead: z.number(),
			cacheWrite: z.number(),
			cost: z.number(),
		})
		.optional(),
	error: z.string().optional(),
});
type RunResult = z.infer<typeof runResultSchema>;

/** Only the per-run file has the tool calls, in `tool_execution_end` order. */
const runCallsSchema = z.object({ calls: z.array(z.object({ seconds: z.number() })) });

const eventSchema = z.object({
	type: z.string(),
	timestamp: z.string().optional(),
	toolCallId: z.string().optional(),
	message: z.unknown(),
});

const contentSchema = z.union([
	z.string(),
	z.array(z.object({ type: z.string(), text: z.string().optional() })),
]);
type Content = z.infer<typeof contentSchema>;

const messageSchema = z.discriminatedUnion('role', [
	z.object({
		role: z.literal('system'),
		content: contentSchema,
		sections: z.record(z.string().nullable()).optional(),
		toolsAdded: z
			.array(z.object({ name: z.string(), description: z.string(), parameters: z.unknown() }))
			.optional(),
	}),
	z.object({ role: z.literal('user'), content: contentSchema }),
	z.object({
		role: z.literal('assistant'),
		content: z.array(
			z.object({
				type: z.string(),
				text: z.string().optional(),
				thinking: z.string().optional(),
				id: z.string().optional(),
				name: z.string().optional(),
				arguments: z.unknown(),
			}),
		),
		model: z.string().optional(),
		stopReason: z.string().optional(),
		usage: z
			.object({
				input: z.number(),
				output: z.number(),
				cacheRead: z.number(),
				cacheWrite: z.number(),
			})
			.optional(),
		timestamp: z.number(),
	}),
	z.object({
		role: z.literal('toolResult'),
		toolCallId: z.string(),
		content: contentSchema,
		isError: z.boolean(),
	}),
]);
type Message = z.infer<typeof messageSchema>;
type AssistantMessage = Extract<Message, { role: 'assistant' }>;
type ToolResultMessage = Extract<Message, { role: 'toolResult' }>;
type SystemMessage = Extract<Message, { role: 'system' }>;

const isAssistant = (message: Message): message is AssistantMessage => message.role === 'assistant';
const isSystem = (message: Message): message is SystemMessage => message.role === 'system';

/** A run folder of the node-building eval has a `results.json` file and a `runs/` folder. */
export const isNodeBuildingRun = (root: string) =>
	existsSync(join(root, 'results.json')) && existsSync(join(root, 'runs'));

const textOf = (content: Content) =>
	typeof content === 'string'
		? content
		: content.flatMap((block) => (block.text === undefined ? [] : [block.text])).join('\n');

const toolCallsOf = (message: AssistantMessage) =>
	message.content.flatMap((block) =>
		block.type === 'toolCall' && block.id && block.name
			? [{ id: block.id, tool: block.name, args: block.arguments }]
			: [],
	);

async function readJson(path: string): Promise<unknown> {
	return existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : null;
}

async function readEvents(path: string) {
	if (!existsSync(path)) return [];
	const lines = (await readFile(path, 'utf8')).split('\n').filter((line) => line.trim());
	return lines.flatMap((line) => {
		const parsed = eventSchema.safeParse(JSON.parse(line));
		return parsed.success ? [parsed.data] : [];
	});
}

/**
 * The stream stamps only the start of each model call. The model time is derived: the time
 * until the next call (or the run end), less the longest tool call of the step, because pi
 * runs the tools of one step in parallel.
 */
function stepsOf(
	assistants: AssistantMessage[],
	toolMs: Map<string, number>,
	runEndMs: number | null,
): ModelStep[] {
	return assistants.map((message, index) => {
		const calls = toolCallsOf(message);
		const next = assistants[index + 1];
		const end = next?.timestamp ?? runEndMs;
		const toolTime = Math.max(0, ...calls.map((call) => toolMs.get(call.id) ?? 0));
		const modelMs = end === null ? 0 : Math.max(end - message.timestamp - toolTime, 0);
		const thinking = message.content.flatMap((block) =>
			block.type === 'thinking' && block.thinking ? [block.thinking] : [],
		);
		const usage = message.usage;
		return {
			index,
			startMs: message.timestamp,
			modelMs,
			toolWindowMs: next ? Math.max(next.timestamp - message.timestamp - modelMs, 0) : null,
			finishReason: message.stopReason ?? null,
			modelId: message.model ?? null,
			usage: usage
				? {
						input: usage.input + usage.cacheRead + usage.cacheWrite,
						output: usage.output,
						noCache: usage.input,
						cacheRead: usage.cacheRead,
						cacheWrite: usage.cacheWrite,
					}
				: null,
			reasoning: thinking.length > 0 ? thinking.join('\n\n') : null,
			toolCalls: calls.map((call) => ({ id: call.id, tool: call.tool, skill: null })),
		};
	});
}

/** The transcript, model steps, system prompt and tools of one run from its pi event stream. */
async function detailOfRun(
	id: string,
	runDir: string,
	seconds: number | null,
): Promise<IterationDetail> {
	const events = await readEvents(join(runDir, 'events.jsonl'));
	const messages = events
		.filter((event) => event.type === 'message_end')
		.flatMap((event) => {
			const parsed = messageSchema.safeParse(event.message);
			return parsed.success ? [parsed.data] : [];
		});
	const calls = runCallsSchema.safeParse(await readJson(join(runDir, 'results.json')));
	const toolEndIds = events
		.filter((event) => event.type === 'tool_execution_end')
		.map((event) => event.toolCallId);
	const toolMs = new Map(
		(calls.success ? calls.data.calls : []).flatMap((call, i): Array<[string, number]> => {
			const callId = toolEndIds[i];
			return callId ? [[callId, call.seconds * 1000]] : [];
		}),
	);
	const sessionStart = Date.parse(
		events.find((event) => event.type === 'session')?.timestamp ?? '',
	);
	const runEndMs =
		seconds === null || Number.isNaN(sessionStart) ? null : sessionStart + seconds * 1000;
	const results = new Map(
		messages.flatMap(
			(message): Array<[string, ToolResultMessage]> =>
				message.role === 'toolResult' ? [[message.toolCallId, message]] : [],
		),
	);
	const assistants = messages.filter(isAssistant);
	const items = assistants.flatMap((message) =>
		message.content.flatMap((block): TranscriptItem[] => {
			if (block.type === 'text' && block.text) return [{ kind: 'text', text: block.text }];
			if (block.type !== 'toolCall' || !block.id || !block.name) return [];
			const result = results.get(block.id);
			return [
				{
					kind: 'tool',
					id: block.id,
					tool: block.name,
					args: block.arguments,
					hasResult: result !== undefined,
					result: result ? textOf(result.content) : undefined,
					failed: result?.isError ?? false,
				},
			];
		}),
	);
	const user = messages.find((message) => message.role === 'user');
	const system = messages.find(isSystem);
	const turn: Turn = {
		userMessage: user ? textOf(user.content) : '',
		items,
		steps: stepsOf(assistants, toolMs, runEndMs),
	};
	const sections = Object.values(system?.sections ?? {});
	const systemPrompt = system
		? textOf(system.content) ||
			sections.flatMap((text) => (text === null ? [] : [text])).join('\n\n')
		: '';
	return {
		id,
		turns: events.length > 0 ? [turn] : [],
		workflow: null,
		systemPrompt: systemPrompt || null,
		tools: (system?.toolsAdded ?? []).map((tool) => ({
			name: tool.name,
			description: tool.description,
			inputSchema: tool.parameters,
		})),
	};
}

function metricsOf(run: RunResult): TrialMetrics {
	const tokens = run.tokens;
	return {
		wallSeconds: run.seconds ?? null,
		harnessBuildSeconds: null,
		turns: run.turns ?? null,
		toolCalls: run.toolCalls ?? null,
		toolFailed: null,
		buildCalls: null,
		buildFailed: null,
		tscErrors: null,
		// The viewer counts cache reads and writes as input; pi reports them apart.
		inputTokens: tokens ? tokens.input + tokens.cacheRead + tokens.cacheWrite : null,
		noCacheTokens: tokens?.input ?? null,
		cacheReadTokens: tokens?.cacheRead ?? null,
		cacheWriteTokens: tokens?.cacheWrite ?? null,
		outputTokens: tokens?.output ?? null,
		cost: tokens?.cost ?? null,
	};
}

const METRIC_KEYS = trialMetricsSchema.keyof().options;
const sum = (values: number[]) =>
	values.length > 0 ? values.reduce((total, value) => total + value, 0) : null;

const foldMetrics = (
	metrics: TrialMetrics[],
	fold: (values: number[]) => number | null,
): TrialMetrics =>
	trialMetricsSchema.parse(
		Object.fromEntries(
			METRIC_KEYS.map((key) => [key, fold(metrics.flatMap((entry) => entry[key] ?? []))]),
		),
	);

/** The totals `summary.json` would hold for these attempts: counts, medians and sums. */
function totalsOf(iterations: IterationSummary[]): BuildTotals {
	const metrics = iterations.flatMap((iteration) => (iteration.metrics ? [iteration.metrics] : []));
	const expectations = iterations.flatMap((iteration) => iteration.expectations);
	return {
		builds: iterations.length,
		built: iterations.filter((iteration) => iteration.built === true).length,
		scenPass: 0,
		scenN: 0,
		scenExcluded: 0,
		scenMock: 0,
		expPass: expectations.filter((entry) => entry.pass).length,
		expN: expectations.length,
		expExcluded: 0,
		median: foldMetrics(metrics, (values) => median(values) ?? null),
		sum: foldMetrics(metrics, sum),
	};
}

async function extractFormat(
	root: string,
	runs: RunResult[],
	format: Format,
	armIndex: number,
): Promise<ExtractedArm> {
	const own = runs
		.filter((run) => run.format === format)
		.sort((a, b) => a.task.localeCompare(b.task) || a.iteration - b.iteration);
	const subOf = (run: RunResult) => `${run.task}-${run.format}-${run.iteration}`;
	const warnings = own.flatMap((run) => [
		...(run.error ? [`${subOf(run)}: ${run.error}`] : []),
		...(existsSync(join(root, 'runs', subOf(run), 'events.jsonl'))
			? []
			: [`${subOf(run)}: no events.jsonl.`]),
	]);
	const extracted = await Promise.all(
		own.map(async (run) => {
			const sub = subOf(run);
			const runDir = join(root, 'runs', sub);
			const id = safeId(`${armIndex}-${sub}`);
			const detail = await detailOfRun(id, runDir, run.seconds ?? null);
			const iteration: IterationSummary = {
				id,
				arm: armIndex,
				caseName: run.task,
				sub,
				index: run.iteration - 1,
				thread: null,
				built: run.checks.find((check) => COMPILE_CHECKS.has(check.name))?.pass ?? null,
				buildError: run.error ?? null,
				metrics: run.seconds === undefined ? null : metricsOf(run),
				firstBuild: {
					firstOk: false,
					oneShot: false,
					callsToFirstSave: null,
					rebuilds: 0,
					verifies: 0,
					scenarioPasses: [],
				},
				scenarios: [],
				expectations: run.checks.map((check) => ({
					expectation: check.name,
					pass: check.pass,
					reason: check.reason || null,
				})),
				toolStats: toolStatsOf(detail.turns),
				hasDebug: detail.turns.length > 0,
				rawDebugId: null,
			};
			return { iteration, detail };
		}),
	);
	const iterations = extracted.map((entry) => entry.iteration);
	const caseNames = [...new Set(iterations.map((iteration) => iteration.caseName))];
	const cases = caseNames.map((name): ArmCase => {
		const own = extracted.filter((entry) => entry.iteration.caseName === name);
		return {
			name,
			title: caseTitle(name, null),
			prompt: own.map((entry) => entry.detail.turns[0]?.userMessage).find(Boolean) ?? null,
			tags: [],
			totals: totalsOf(own.map((entry) => entry.iteration)),
			iterations: own.map((entry) => entry.iteration),
		};
	});
	return {
		arm: {
			name: `${basename(root)}:${format}`,
			// Both arms share one folder; the app keys arms by path.
			path: `${root}:${format}`,
			totals: totalsOf(iterations),
			cases,
			warnings,
		},
		details: extracted.map((entry) => entry.detail),
		rawFiles: {},
	};
}

/** One arm per format that the run has, old first, numbered from `firstArmIndex`. */
export async function extractNodeBuildingRun(
	root: string,
	firstArmIndex: number,
): Promise<ExtractedArm[]> {
	const runs = z.array(runResultSchema).parse(await readJson(join(root, 'results.json')));
	const formats = FORMATS.filter((format) => runs.some((run) => run.format === format));
	return await Promise.all(
		formats.map(async (format, i) => await extractFormat(root, runs, format, firstArmIndex + i)),
	);
}
