import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Agent, AgentEvent, type AgentMessage, McpClient } from '@n8n/agents';

import {
	benchmarkRunSchema,
	type BenchmarkJudge,
	type BenchmarkRun,
	type BenchmarkTask,
	type ToolCallRecord,
} from './benchmark.schema';
import { benchmarkTasks } from './cases';
import { mapWithConcurrency } from './concurrency';
import { NODE_MCP_EVAL_CASE_HEADER } from './eval-context';
import { BENCHMARK_JUDGE_MODEL, BENCHMARK_JUDGE_VERSION, judgeToolCallCorrectness } from './judge';
import { renderBenchmarkReport } from './report';
import { classifyToolCall, classifyToolOutcome, scoreRun } from './scoring';
import { summarizeRuns } from './summary';
import { BENCHMARK_VARIANTS, getBenchmarkVariant } from './variants';

const DEFAULT_VARIANTS = BENCHMARK_VARIANTS.map((variant) => variant.id);

interface CliOptions {
	baseUrl: string;
	models: string[];
	variants: string[];
	repetitions: number;
	concurrency: number;
	outputDir: string;
	reportOnly: boolean;
}

function optionValue(name: string) {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function commaList(value: string | undefined, fallback: string[]) {
	return value
		? value
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean)
		: fallback;
}

function parseOptions(): CliOptions {
	const repetitions = Number(optionValue('--repetitions') ?? '1');
	if (!Number.isInteger(repetitions) || repetitions < 1) {
		throw new Error('--repetitions must be a positive integer');
	}
	const concurrency = Number(
		optionValue('--concurrency') ?? process.env.N8N_NODE_MCP_EVAL_CONCURRENCY ?? '1',
	);
	if (!Number.isInteger(concurrency) || concurrency < 1) {
		throw new Error('--concurrency must be a positive integer');
	}
	return {
		baseUrl: (optionValue('--base-url') ?? 'http://127.0.0.1:5678').replace(/\/+$/, ''),
		models: commaList(optionValue('--models') ?? process.env.N8N_NODE_MCP_EVAL_MODELS, [
			'anthropic/claude-sonnet-5',
		]),
		variants: commaList(optionValue('--variants'), DEFAULT_VARIANTS),
		repetitions,
		concurrency,
		outputDir: path.resolve(optionValue('--output-dir') ?? '.data/node-mcp-eval'),
		reportOnly: process.argv.includes('--report-only'),
	};
}

function extractFinalAnswer(messages: AgentMessage[]) {
	let answer = '';
	for (const message of messages) {
		if (message.type === 'custom' || message.role !== 'assistant') continue;
		const text = message.content
			.filter((part) => part.type === 'text')
			.map((part) => part.text)
			.join('\n');
		if (text) answer = text;
	}
	return answer;
}

function appendInvalidToolCalls(messages: AgentMessage[], records: ToolCallRecord[]) {
	for (const message of messages) {
		if (message.type === 'custom') continue;
		for (const part of message.content) {
			if (part.type !== 'invalid-tool-call') continue;
			const now = Date.now();
			records.push({
				toolCallId: part.toolCallId ?? `invalid-${String(records.length + 1)}`,
				toolName: part.name ?? 'unknown',
				category: classifyToolCall(part.name ?? ''),
				input: part.args,
				output: part.error,
				outcome: 'protocol_invalid',
				startedAt: now,
				finishedAt: now,
				durationMs: 0,
			});
		}
	}
}

async function judgeOrFailure(
	task: BenchmarkTask,
	calls: ToolCallRecord[],
): Promise<BenchmarkJudge> {
	try {
		return await judgeToolCallCorrectness(task, calls);
	} catch (error) {
		return {
			model: BENCHMARK_JUDGE_MODEL,
			version: BENCHMARK_JUDGE_VERSION,
			validExecution: false,
			matchingToolCallId: null,
			reason: `Judge failed: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

async function runOne(
	options: CliOptions,
	task: (typeof benchmarkTasks)[number],
	model: string,
	variant: string,
	repetition: number,
): Promise<BenchmarkRun> {
	const runId = `${task.id}::${model}::${variant}::${String(repetition)}`;
	const calls: ToolCallRecord[] = [];
	const callsById = new Map<string, ToolCallRecord>();
	const token = process.env.N8N_NODE_MCP_POC_TOKEN;
	const client = new McpClient([
		{
			name: 'node',
			url: `${options.baseUrl}/node-mcp-poc/${variant}/http`,
			transport: 'streamableHttp',
			headers: {
				[NODE_MCP_EVAL_CASE_HEADER]: task.id,
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			connectionTimeoutMs: 10_000,
		},
	]);
	const agent = new Agent(`node-mcp-eval-${variant}`)
		.model(model)
		.instructions(
			'Use the available n8n node tools to complete the user request. Resolve real resource values when tools provide resolvers. Do not claim success unless an execution tool succeeds. Be concise.',
		)
		.configuration({ maxIterations: 12 })
		.mcp(client);

	agent.on(AgentEvent.ToolExecutionStart, (event) => {
		if (event.type !== AgentEvent.ToolExecutionStart) return;
		const record: ToolCallRecord = {
			toolCallId: event.toolCallId,
			toolName: event.toolName,
			category: classifyToolCall(event.toolName),
			input: event.args,
			startedAt: Date.now(),
		};
		calls.push(record);
		callsById.set(event.toolCallId, record);
	});
	agent.on(AgentEvent.ToolExecutionEnd, (event) => {
		if (event.type !== AgentEvent.ToolExecutionEnd) return;
		const record = callsById.get(event.toolCallId);
		if (!record) return;
		record.finishedAt = Date.now();
		record.durationMs = record.finishedAt - record.startedAt;
		record.output = event.result;
		record.outcome = classifyToolOutcome(event.isError, event.result);
	});

	const startedAt = new Date();
	const started = performance.now();
	try {
		const result = await agent.generate(task.prompt, {
			abortSignal: AbortSignal.timeout(task.timeoutMs),
		});
		appendInvalidToolCalls(result.messages, calls);
		const finalAnswer = extractFinalAnswer(result.messages);
		const judge = await judgeOrFailure(task, calls);
		const verdict = scoreRun(task, judge, finalAnswer);
		return benchmarkRunSchema.parse({
			runId,
			taskId: task.id,
			model,
			variant,
			repetition,
			startedAt: startedAt.toISOString(),
			durationMs: performance.now() - started,
			finishReason: result.finishReason,
			finalAnswer,
			success: verdict.success,
			verdictReasons: verdict.reasons,
			usage: result.usage
				? {
						promptTokens: result.usage.promptTokens,
						completionTokens: result.usage.completionTokens,
						totalTokens: result.usage.totalTokens,
						cost: result.usage.cost,
						cacheReadTokens: result.usage.inputTokenDetails?.cacheRead,
						cacheWriteTokens: result.usage.inputTokenDetails?.cacheWrite,
					}
				: undefined,
			judge,
			toolCalls: calls,
		});
	} catch (error) {
		return benchmarkRunSchema.parse({
			runId,
			taskId: task.id,
			model,
			variant,
			repetition,
			startedAt: startedAt.toISOString(),
			durationMs: performance.now() - started,
			finishReason: 'error',
			finalAnswer: '',
			success: false,
			verdictReasons: [error instanceof Error ? error.message : String(error)],
			toolCalls: calls,
		});
	} finally {
		await client.close();
	}
}

async function readExistingRuns(file: string) {
	try {
		const contents = await readFile(file, 'utf8');
		return contents
			.split(/\r?\n/)
			.filter(Boolean)
			.map((line) => benchmarkRunSchema.parse(JSON.parse(line)));
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
		throw error;
	}
}

function csv(runs: BenchmarkRun[]) {
	const rows = [
		[
			'runId',
			'taskId',
			'evaluationName',
			'model',
			'variant',
			'variantName',
			'flavor',
			'repetition',
			'success',
			'durationMs',
			'toolCalls',
			'invalidCalls',
			'totalTokens',
			'costUsd',
		],
		...runs.map((run) => [
			run.runId,
			run.taskId,
			benchmarkTasks.find((task) => task.id === run.taskId)?.title ?? run.taskId,
			run.model,
			run.variant,
			getBenchmarkVariant(run.variant)?.name ?? run.variant,
			getBenchmarkVariant(run.variant)?.flavor ?? '',
			String(run.repetition),
			String(run.success),
			String(run.durationMs),
			String(run.toolCalls.length),
			String(
				run.toolCalls.filter((call) =>
					['protocol_invalid', 'semantic_invalid'].includes(call.outcome ?? ''),
				).length,
			),
			String(run.usage?.totalTokens ?? ''),
			String(run.usage?.cost ?? ''),
		]),
	];
	return rows.map((row) => row.map((value) => JSON.stringify(value)).join(',')).join('\n');
}

function markdown(summary: ReturnType<typeof summarizeRuns>) {
	const lines = [
		'# Node MCP evaluation',
		'',
		`Runs: ${String(summary.overall.runs)}`,
		`Success: ${(summary.overall.successRate * 100).toFixed(1)}%`,
		'',
		'| Evaluation | Model | Flavor | Success | Median latency | Calls | Invalid | Tokens | Cost |',
		'|---|---|---|---:|---:|---:|---:|---:|---:|',
		...summary.arms.map(
			(arm) =>
				`| ${arm.evaluationName ?? arm.taskId ?? ''} | ${arm.model ?? ''} | ${arm.flavor ?? ''} | ${(arm.successRate * 100).toFixed(1)}% | ${(arm.medianDurationMs / 1000).toFixed(2)}s | ${String(arm.medianToolCalls)} | ${(arm.invalidCallRate * 100).toFixed(1)}% | ${String(arm.medianTokens)} | $${arm.medianCostUsd.toFixed(4)} |`,
		),
	];
	return lines.join('\n');
}

async function rescoreRun(run: BenchmarkRun, task: BenchmarkTask) {
	const toolCalls = run.toolCalls.map((call) => ({
		...call,
		outcome: call.output === undefined ? call.outcome : classifyToolOutcome(false, call.output),
	}));
	const judge =
		run.judge?.model === BENCHMARK_JUDGE_MODEL && run.judge.version === BENCHMARK_JUDGE_VERSION
			? run.judge
			: await judgeOrFailure(task, toolCalls);
	const verdict = scoreRun(task, judge, run.finalAnswer);
	return benchmarkRunSchema.parse({
		...run,
		toolCalls,
		judge,
		success: verdict.success,
		verdictReasons: verdict.reasons,
	});
}

async function main() {
	const options = parseOptions();
	await mkdir(options.outputDir, { recursive: true });
	const runsFile = path.join(options.outputDir, 'runs.jsonl');
	const taskById = new Map(benchmarkTasks.map((task) => [task.id, task]));
	const allExisting = await readExistingRuns(runsFile);
	const eligibleExisting = allExisting.filter((run) => {
		const task = taskById.get(run.taskId);
		return (
			task !== undefined &&
			task.variants.includes(run.variant) &&
			options.variants.includes(run.variant) &&
			options.models.includes(run.model) &&
			run.repetition <= options.repetitions
		);
	});
	if (options.reportOnly && eligibleExisting.length === 0) {
		throw new Error(`No cached evaluation runs found in ${options.outputDir}`);
	}
	const existing = options.reportOnly
		? eligibleExisting
		: await mapWithConcurrency(eligibleExisting, options.concurrency, async (run) => {
				const task = taskById.get(run.taskId);
				return task ? await rescoreRun(run, task) : run;
			});
	const completed = new Set(existing.map((run) => run.runId));
	const runs = [...existing];
	const pending: Array<{
		task: (typeof benchmarkTasks)[number];
		model: string;
		variant: string;
		repetition: number;
		runId: string;
	}> = [];

	for (let repetition = 1; !options.reportOnly && repetition <= options.repetitions; repetition++) {
		for (const task of benchmarkTasks) {
			for (const model of options.models) {
				for (const variant of options.variants) {
					if (!task.variants.includes(variant)) continue;
					const runId = `${task.id}::${model}::${variant}::${String(repetition)}`;
					if (completed.has(runId)) continue;
					pending.push({ task, model, variant, repetition, runId });
				}
			}
		}
	}
	let appendQueue = Promise.resolve();
	const newRuns = await mapWithConcurrency(pending, options.concurrency, async (job) => {
		console.log(`[node-mcp-eval] ${job.runId}`);
		const run = await runOne(options, job.task, job.model, job.variant, job.repetition);
		appendQueue = appendQueue.then(
			async () => await appendFile(runsFile, `${JSON.stringify(run)}\n`),
		);
		await appendQueue;
		return run;
	});
	runs.push(...newRuns);

	const summary = summarizeRuns(runs, benchmarkTasks);
	const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
	const updatedRunsById = new Map(runs.map((run) => [run.runId, run]));
	const persistedRuns = [
		...allExisting.map((run) => updatedRunsById.get(run.runId) ?? run),
		...newRuns.filter((run) => !allExisting.some((existingRun) => existingRun.runId === run.runId)),
	];
	await Promise.all([
		writeFile(runsFile, `${persistedRuns.map((run) => JSON.stringify(run)).join('\n')}\n`),
		writeFile(path.join(options.outputDir, 'summary.json'), JSON.stringify(summary, null, 2)),
		writeFile(path.join(options.outputDir, 'report.html'), renderBenchmarkReport(summary)),
		writeFile(path.join(options.outputDir, 'report.md'), markdown(summary)),
		writeFile(path.join(options.outputDir, 'report.csv'), csv(runs)),
		writeFile(
			path.join(options.outputDir, 'manifest.json'),
			JSON.stringify({ ...options, gitSha, generatedAt: new Date().toISOString() }, null, 2),
		),
	]);
	console.log(`[node-mcp-eval] report: ${path.join(options.outputDir, 'report.html')}`);
}

void main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
