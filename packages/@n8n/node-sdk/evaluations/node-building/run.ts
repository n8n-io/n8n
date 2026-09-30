import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { DEFAULT_MODEL, runAgent, type AgentMetrics } from './agent';
import { grade, type GradeResult } from './grade';
import { ensureMockServer } from './mock-server';
import { FORMATS, promptOf, taskById, TASKS, type Format } from './tasks';
import { isRecord, median } from './util';
import { copyTemplate, prepareTemplate, workspaceEnv } from './workspace';

const USAGE = `Usage:
  tsx run.ts --task <id|all> --format <old|new|both> [--iterations 1] [--concurrency 1] --out <dir> [--model ${DEFAULT_MODEL}] [--timeout-min 15]
  tsx run.ts --grade <run dir or workspace> [--task <id> --format <old|new>] [--out <dir>]
Tasks: ${TASKS.map(({ id }) => id).join(', ')}`;

interface RunMeta {
	readonly task: string;
	readonly format: Format;
	readonly iteration: number;
}

type RunResult = RunMeta &
	Omit<GradeResult, 'seconds'> &
	Partial<Omit<AgentMetrics, 'calls' | 'turnTokens'>> & {
		readonly gradeSeconds: number;
		readonly error?: string;
	};

const META_FILE = 'eval-run.json';

const isFormat = (value: unknown): value is Format => value === 'old' || value === 'new';

async function writeJson(file: string, value: unknown) {
	await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Runs `work` on every item with at most `size` at a time; results keep the item order. */
async function pool<T, R>(items: readonly T[], size: number, work: (item: T) => Promise<R>) {
	const results: R[] = [];
	const queue = items.entries();
	const worker = async () => {
		for (const [index, item] of queue) results[index] = await work(item);
	};
	await Promise.all(Array.from({ length: Math.max(1, size) }, worker));
	return results;
}

async function runOne(
	out: string,
	meta: RunMeta,
	options: { model: string; timeoutMs: number },
): Promise<RunResult> {
	const task = taskById(meta.task);
	const runDir = path.join(out, 'runs', `${meta.task}-${meta.format}-${meta.iteration}`);
	const workspace = path.join(runDir, 'workspace');
	await mkdir(runDir, { recursive: true });
	await writeJson(path.join(runDir, META_FILE), meta);
	await copyTemplate(path.join(out, 'templates', meta.format, meta.task), workspace);
	console.log(`▶ ${meta.task} ${meta.format} #${meta.iteration}`);
	const { calls, turnTokens, ...agent } = await runAgent({
		cwd: workspace,
		prompt: promptOf(task, meta.format),
		env: workspaceEnv(workspace),
		eventsFile: path.join(runDir, 'events.jsonl'),
		model: options.model,
		timeoutMs: options.timeoutMs,
	});
	const graded = await grade(workspace, task, meta.format);
	const result: RunResult = {
		...meta,
		pass: graded.pass,
		checks: graded.checks,
		gradeSeconds: graded.seconds,
		...agent,
	};
	await writeJson(path.join(runDir, 'results.json'), { ...result, turnTokens, calls });
	console.log(
		`${result.pass ? '✔' : '✘'} ${meta.task} ${meta.format} #${meta.iteration}: ` +
			`${agent.seconds.toFixed(0)} s, ${agent.turns} turns, $${agent.tokens.cost.toFixed(2)}`,
	);
	return result;
}

const fixed = (value: number | undefined, digits = 0) =>
	value === undefined ? '-' : value.toFixed(digits);

/** A markdown table per format and task, with medians over the iterations. */
export function summaryTable(results: readonly RunResult[]): string {
	const groups = [...new Set(results.map(({ format, task }) => `${format}|${task}`))];
	const header = [
		'| format | task | pass | seconds | turns | tool calls | input | output | cache read | cache write | cost $ | builds | checks | tests | first pass turn |',
		'|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
	];
	const rows = groups.map((group) => {
		const [format, task] = group.split('|');
		const runs = results.filter((run) => run.format === format && run.task === task);
		const med = (value: (run: RunResult) => number | undefined, digits = 0) =>
			fixed(median(runs.map(value).filter((item) => item !== undefined)), digits);
		return `| ${format} | ${task} | ${runs.filter(({ pass }) => pass).length}/${runs.length} | ${[
			med((run) => run.seconds),
			med((run) => run.turns),
			med((run) => run.toolCalls),
			med((run) => run.tokens?.input),
			med((run) => run.tokens?.output),
			med((run) => run.tokens?.cacheRead),
			med((run) => run.tokens?.cacheWrite),
			med((run) => run.tokens?.cost, 2),
			med((run) => run.commands?.build),
			med((run) => run.commands?.check),
			med((run) => run.commands?.test),
			med((run) => run.firstPassTurn),
		].join(' | ')} |`;
	});
	return [...header, ...rows].join('\n');
}

async function regrade(target: string, values: { task?: string; format?: string; out?: string }) {
	const metaFile = path.join(target, META_FILE);
	const meta: unknown = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
	const saved = isRecord(meta) ? meta : {};
	const taskId = values.task ?? saved.task;
	const format = values.format ?? saved.format;
	if (typeof taskId !== 'string' || !isFormat(format)) {
		throw new Error(`Pass --task and --format, or a run dir with ${META_FILE}`);
	}
	const workspace = existsSync(path.join(target, 'workspace'))
		? path.join(target, 'workspace')
		: target;
	const graded = await grade(workspace, taskById(taskId), format);
	const out = values.out ?? target;
	await mkdir(out, { recursive: true });
	await writeJson(path.join(out, 'grade.json'), { task: taskId, format, ...graded });
	for (const { name, pass, reason } of graded.checks) {
		console.log(`${pass ? '✔' : '✘'} ${name}${reason ? `: ${reason.slice(0, 400)}` : ''}`);
	}
	console.log(
		`${graded.pass ? 'PASS' : 'FAIL'} ${taskId} ${format} (${graded.seconds.toFixed(1)} s)`,
	);
}

async function main() {
	const { values } = parseArgs({
		options: {
			task: { type: 'string' },
			format: { type: 'string' },
			iterations: { type: 'string', default: '1' },
			concurrency: { type: 'string', default: '1' },
			out: { type: 'string' },
			model: { type: 'string', default: DEFAULT_MODEL },
			'timeout-min': { type: 'string', default: '15' },
			grade: { type: 'string' },
			help: { type: 'boolean' },
		},
	});
	if (values.help) return console.log(USAGE);
	const mock = await ensureMockServer();
	try {
		if (values.grade) return await regrade(path.resolve(values.grade), values);
		if (!values.task || !values.format || !values.out) throw new Error(USAGE);
		const out = path.resolve(values.out);
		const tasks = values.task === 'all' ? TASKS : [taskById(values.task)];
		const formats = values.format === 'both' ? FORMATS : [values.format].filter(isFormat);
		if (formats.length === 0) throw new Error(USAGE);
		for (const task of tasks) {
			for (const format of formats)
				await prepareTemplate(path.join(out, 'templates'), task, format);
		}
		const iterations = Number(values.iterations);
		const jobs = tasks.flatMap((task) =>
			formats.flatMap((format) =>
				Array.from({ length: iterations }, (_, index) => ({
					task: task.id,
					format,
					iteration: index + 1,
				})),
			),
		);
		const options = { model: values.model, timeoutMs: Number(values['timeout-min']) * 60_000 };
		const results = await pool(
			jobs,
			Number(values.concurrency),
			async (job) =>
				await runOne(out, job, options).catch(
					(error: unknown): RunResult => ({
						...job,
						pass: false,
						checks: [],
						gradeSeconds: 0,
						error: error instanceof Error ? error.message : String(error),
					}),
				),
		);
		const table = summaryTable(results);
		await writeJson(path.join(out, 'results.json'), results);
		await writeFile(path.join(out, 'summary.md'), `${table}\n`);
		console.log(table);
	} finally {
		await mock?.close();
	}
}

if (require.main === module) {
	main().then(
		() => process.exit(0),
		(error: unknown) => {
			console.error(error instanceof Error ? error.message : error);
			process.exit(1);
		},
	);
}
