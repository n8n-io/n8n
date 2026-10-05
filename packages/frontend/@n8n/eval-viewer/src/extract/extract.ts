/**
 * Builds the viewer data of one eval run folder (one arm). A run folder holds one
 * sub-folder per eval suite; a pool folder holds symlinks to sub-folders of several runs.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile, realpath } from 'node:fs/promises';
import { basename, join } from 'node:path';

import {
	MODEL_TIME_KEY,
	TEXT_ANSWER_KEY,
	type Arm,
	type ArmCase,
	type BuildTotals,
	type Expectation,
	type IterationDetail,
	type IterationSummary,
	type ScenarioRun,
	type ToolStat,
	type TrialMetrics,
	type Turn,
	type TranscriptItem,
} from '../schema';
import { parseDebugHtml, turnOfRuns, type DebugThread } from './debug-html';
import { firstBuildOf, scenarioPassesByWorkflow } from './first-build';
import {
	BUILD_ONLY_SCENARIO,
	evalResultsSchema,
	evalRowSchema,
	isToolCallStep,
	runSummarySchema,
	type EvalRow,
	type RunSummary,
	type SummaryCounts,
	type SummaryMetrics,
	type SummaryTrial,
	type TranscriptTurn,
} from './inputs';
import { scenarioTitle } from './scenario-title';

export const DEBUG_HTML = 'workflow-eval-llm-debug.html';

export interface ExtractedArm {
	arm: Arm;
	details: IterationDetail[];
	/** Raw debug page id -> absolute path, for the local server only. */
	rawFiles: Record<string, string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export function toMetrics(source: SummaryMetrics): TrialMetrics {
	return {
		wallSeconds: source.wall_s ?? null,
		harnessBuildSeconds: source.harness_build_s ?? null,
		turns: source.turns ?? null,
		toolCalls: source.tool_calls ?? null,
		toolFailed: source.tool_failed ?? null,
		buildCalls: source.build_calls ?? null,
		buildFailed: source.build_failed ?? null,
		tscErrors: source.tsc_errors ?? null,
		inputTokens: source.input ?? null,
		noCacheTokens: source.no_cache ?? null,
		cacheReadTokens: source.cache_read ?? null,
		cacheWriteTokens: source.cache_write ?? null,
		outputTokens: source.output ?? null,
		cost: source.cost ?? null,
	};
}

function toTotals(source: SummaryCounts): BuildTotals {
	return {
		builds: source.builds,
		built: source.built,
		scenPass: source.scen_pass,
		scenN: source.scen_n,
		scenExcluded: source.scen_excluded,
		scenMock: source.scen_mock,
		expPass: source.exp_pass,
		expN: source.exp_n,
		expExcluded: source.exp_excluded,
		median: toMetrics(source.median),
		sum: toMetrics(source.sum),
	};
}

/** The rows of one build: by thread id, else by case and iteration index. */
export function rowsOfIteration(
	rows: EvalRow[],
	caseName: string,
	thread: string | null,
	index: number,
): EvalRow[] {
	return rows.filter(
		(row) =>
			row.inputs.testCaseFile === caseName &&
			(thread && row.outputs.threadId
				? row.outputs.threadId === thread
				: (row.inputs._iteration ?? -1) === index),
	);
}

export function scenarioRunOf(row: EvalRow): ScenarioRun {
	const { inputs, outputs } = row;
	return {
		slug: inputs.scenarioName,
		title: scenarioTitle(inputs.scenarioName, inputs.scenarioDescription),
		description: inputs.scenarioDescription || null,
		dataSetup: inputs.dataSetup || null,
		successCriteria: inputs.successCriteria || null,
		passed: outputs.passed === true,
		score: outputs.score ?? null,
		failureCategory: outputs.failureCategory ?? null,
		attribution: outputs.attribution ?? null,
		reasoning: outputs.reasoning ?? null,
		rootCause: outputs.rootCause ?? null,
		execErrors: outputs.execErrors ?? [],
		workflowId: outputs.workflowId ?? null,
	};
}

function expectationsOf(rows: EvalRow[]): Expectation[] {
	const source = rows.find((row) => row.outputs.expectationResults)?.outputs.expectationResults;
	return (source ?? []).map((item) => ({
		expectation: item.expectation ?? '',
		pass: item.pass === true,
		reason: item.reason ?? null,
	}));
}

/** Same rule as view.py: a tool result with `success: false`, `ok: false` or an `error` key failed. */
export function isFailedResult(result: unknown): boolean {
	return isRecord(result) && (result.success === false || result.ok === false || 'error' in result);
}

function itemsOf(turn: TranscriptTurn, turnIndex: number): TranscriptItem[] {
	return turn.steps.map((step, i): TranscriptItem => {
		if (isToolCallStep(step)) {
			const hasResult = 'result' in step;
			return {
				kind: 'tool',
				id: step.toolCallId ?? `turn-${turnIndex}-step-${i}`,
				tool: step.toolName,
				args: step.args,
				hasResult,
				result: step.result,
				failed: hasResult && isFailedResult(step.result),
			};
		}
		if (step.kind === 'agent-text' && 'text' in step && typeof step.text === 'string') {
			return { kind: 'text', text: step.text };
		}
		const { kind, ...data } = step;
		return { kind: 'event', type: kind, data };
	});
}

export function turnsOf(transcript: TranscriptTurn[], debug: DebugThread | undefined): Turn[] {
	const runs = debug?.runs ?? [];
	const owners = turnOfRuns(
		transcript.map((turn) => turn.runIds?.length ?? 1),
		runs.length,
	);
	return transcript.map((turn, turnIndex) => ({
		userMessage: turn.userMessage ?? '',
		items: itemsOf(turn, turnIndex),
		steps: runs.filter((_, run) => owners[run] === turnIndex).flatMap((run) => run.steps),
	}));
}

/** Calls and failures from the transcript; time and tokens from the model steps (derived, see ToolStat). */
export function toolStatsOf(turns: Turn[]): ToolStat[] {
	const stats = new Map<string, ToolStat>();
	const add = (tool: string, change: Partial<Omit<ToolStat, 'tool'>>) => {
		const current = stats.get(tool) ?? { tool, calls: 0, failed: 0, timeMs: 0, tokens: 0 };
		stats.set(tool, {
			tool,
			calls: current.calls + (change.calls ?? 0),
			failed: current.failed + (change.failed ?? 0),
			timeMs: current.timeMs + (change.timeMs ?? 0),
			tokens: current.tokens + (change.tokens ?? 0),
		});
	};
	for (const turn of turns) {
		for (const item of turn.items) {
			if (item.kind === 'tool') add(item.tool, { calls: 1, failed: item.failed ? 1 : 0 });
		}
		for (const step of turn.steps) {
			const tokens = step.usage ? step.usage.input + step.usage.output : 0;
			const share = step.toolCalls.length;
			add(MODEL_TIME_KEY, { timeMs: step.modelMs });
			if (share === 0) add(TEXT_ANSWER_KEY, { tokens });
			for (const call of step.toolCalls) {
				add(call.tool, { timeMs: (step.toolWindowMs ?? 0) / share, tokens: tokens / share });
			}
		}
	}
	return [...stats.values()];
}

const safeId = (text: string) => text.replace(/[^A-Za-z0-9._-]+/g, '_');

async function readSummary(root: string): Promise<RunSummary | null> {
	const path = join(root, 'summary.json');
	if (!existsSync(path)) return null;
	const raw: unknown = JSON.parse(await readFile(path, 'utf8'));
	return runSummarySchema.parse(raw);
}

async function readRows(dir: string): Promise<EvalRow[]> {
	const path = join(dir, 'eval-rows.jsonl');
	if (!existsSync(path)) return [];
	const lines = (await readFile(path, 'utf8')).split('\n').filter((line) => line.trim());
	return lines.map((line) => {
		const raw: unknown = JSON.parse(line);
		return evalRowSchema.parse(raw).run;
	});
}

async function subFoldersOf(root: string): Promise<string[]> {
	const entries = await readdir(root);
	return entries.filter((name) => existsSync(join(root, name, 'eval-results.json'))).sort();
}

export async function extractArm(
	root: string,
	armIndex: number,
	log: (message: string) => void = () => {},
): Promise<ExtractedArm> {
	const warnings: string[] = [];
	const summary = await readSummary(root);
	if (!summary) warnings.push('No summary.json: run summarize.py on this folder to get metrics.');
	const trials = new Map<string, SummaryTrial>(
		Object.values(summary?.cases ?? {}).flatMap((entry) =>
			entry.trials.flatMap(
				(trial): Array<[string, SummaryTrial]> => (trial.thread ? [[trial.thread, trial]] : []),
			),
		),
	);
	const iterations: IterationSummary[] = [];
	const details: IterationDetail[] = [];
	const rawFiles: Record<string, string> = {};

	for (const sub of await subFoldersOf(root)) {
		const dir = await realpath(join(root, sub));
		log(`  ${sub}`);
		const resultsRaw: unknown = JSON.parse(await readFile(join(dir, 'eval-results.json'), 'utf8'));
		const results = evalResultsSchema.parse(resultsRaw);
		const rows = await readRows(dir);
		const debugPath = join(dir, DEBUG_HTML);
		const hasDebugFile = existsSync(debugPath);
		const debug = hasDebugFile
			? parseDebugHtml(await readFile(debugPath, 'utf8'))
			: new Map<string, DebugThread>();
		if (!hasDebugFile) warnings.push(`${sub}: no ${DEBUG_HTML}, so no model steps.`);
		const rawDebugId = hasDebugFile ? safeId(`${armIndex}-${sub}`) : null;
		if (rawDebugId) rawFiles[rawDebugId] = debugPath;

		for (const testCase of results.testCases) {
			const caseName = testCase.testCaseFile ?? testCase.name;
			const passesByWorkflow = scenarioPassesByWorkflow(testCase);
			(testCase.transcriptPerRun ?? []).forEach((maybeTranscript, index) => {
				const transcript = maybeTranscript ?? [];
				const thread = testCase.threadIds?.[index] ?? null;
				const buildRows = rowsOfIteration(rows, caseName, thread, index);
				const debugThread = thread ? debug.get(thread) : undefined;
				if (hasDebugFile && thread && !debugThread) {
					warnings.push(`${sub}/${caseName} #${index + 1}: thread not in ${DEBUG_HTML}.`);
				}
				const trial = thread ? trials.get(thread) : undefined;
				if (summary && !trial) {
					warnings.push(`${sub}/${caseName} #${index + 1}: thread not in summary.json.`);
				}
				const turns = turnsOf(transcript, debugThread);
				const id = safeId(`${armIndex}-${sub}-${caseName}-${index}`);
				iterations.push({
					id,
					arm: armIndex,
					caseName,
					sub,
					index,
					thread,
					built: trial?.built ?? buildRows[0]?.outputs.buildSuccess ?? null,
					buildError: testCase.buildErrorPerRun?.[index] ?? null,
					metrics: trial ? toMetrics(trial) : null,
					firstBuild: firstBuildOf(transcript, passesByWorkflow),
					scenarios: buildRows
						.filter((row) => row.inputs.scenarioName !== BUILD_ONLY_SCENARIO)
						.map(scenarioRunOf),
					expectations: expectationsOf(buildRows),
					toolStats: toolStatsOf(turns),
					hasDebug: debugThread !== undefined,
					rawDebugId,
				});
				details.push({
					id,
					turns,
					workflow: buildRows.find((row) => row.outputs.workflowJson)?.outputs.workflowJson ?? null,
				});
			});
		}
	}

	const caseNames = [...new Set(iterations.map((iteration) => iteration.caseName))].sort();
	const cases: ArmCase[] = caseNames.map((name) => {
		const totals = summary?.cases[name];
		return {
			name,
			totals: totals ? toTotals(totals) : null,
			iterations: iterations.filter((iteration) => iteration.caseName === name),
		};
	});
	return {
		arm: {
			name: basename(root),
			path: root,
			totals: summary ? toTotals(summary.totals) : null,
			cases,
			warnings,
		},
		details,
		rawFiles,
	};
}
