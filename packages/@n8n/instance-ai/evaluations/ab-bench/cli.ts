// A/B context benchmark for Instance AI.
//
// Benchmarks ONE running instance as an "arm": builds every case through the
// testmax runner (Instance AI only), drives the multi-turn case, and writes a
// context report from the run debug records. Run it once per arm, then compare.
//
//   pnpm eval:ab-bench run --arm base
//   pnpm eval:ab-bench report <threadId>
//   pnpm eval:ab-bench compare base branch
//
// See ./README.md for the instance flags and the caveats.

import { z } from 'zod';
import { spawn } from 'node:child_process';
import { closeSync, existsSync, openSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

import { renderComparisonTable, summarizeRun, type CaseArmRuns } from './comparison-table';
import { buildContextReport, type ContextReport } from './context-report';
import { N8nClient } from '../clients/n8n-client';
import { captureThreadRunDebug } from '../harness/capture-run-debug';
import { recordUserTurn, startSseConnection, waitForAllActivity } from '../harness/chat-loop';
import { createLogger } from '../harness/logger';
import type { CapturedEvent } from '../types';

const PACKAGE_DIR = path.resolve(__dirname, '..', '..');
const CASES_DIR = path.join(__dirname, 'cases');
const DEFAULT_RUNS_DIR = path.join(PACKAGE_DIR, '.output', 'ab-bench');
const DEFAULT_TESTMAX_DIR = path.resolve(
	PACKAGE_DIR,
	'../../..',
	'.agents/skills/testmax-n8n-ai/scripts',
);
const MULTI_TURN_TIMEOUT_MS = 30 * 60_000;

const runJsonSchema = z.object({ threadId: z.string() });
const turnsSchema = z.array(z.string()).min(1);
const reportSchema = z.object({
	llmCalls: z.number(),
	inputTokens: z.number(),
	firstCallInput: z.number(),
	maxCallInput: z.number(),
	outputTokens: z.number(),
	firstCallToolCount: z.number(),
});

interface RunOptions {
	arm: string;
	cases?: string[];
	reps: number;
	firstRep: number;
	runsDir: string;
	testmaxDir: string;
	python: string;
	gapSeconds: number;
}

const logger = createLogger(process.env.AB_BENCH_VERBOSE === '1');

function baseUrl(): string {
	return (process.env.N8N_BASE_URL ?? 'http://localhost:5678').replace(/\/$/, '');
}

async function loggedInClient(): Promise<N8nClient> {
	const client = new N8nClient(baseUrl());
	await client.login();
	return client;
}

async function readJson(file: string): Promise<unknown> {
	return JSON.parse(await readFile(file, 'utf8'));
}

// -- Context report ----------------------------------------------------------

async function writeContextReport(threadId: string, outFile?: string): Promise<ContextReport> {
	const client = await loggedInClient();
	const records = await captureThreadRunDebug(client, threadId, logger);
	if (records.length === 0) {
		throw new Error(
			`No run debug records for thread ${threadId}. Set N8N_INSTANCE_AI_RUN_DEBUG_ENABLED=true and do not restart the instance before the report.`,
		);
	}
	const report = buildContextReport(threadId, records);
	if (outFile) await writeFile(outFile, JSON.stringify(report, null, 2));
	return report;
}

async function reportRunDir(runDir: string): Promise<void> {
	const { threadId } = runJsonSchema.parse(await readJson(path.join(runDir, 'iai', 'run.json')));
	await writeContextReport(threadId, path.join(runDir, 'iai', 'context-report.json'));
}

// -- Cases -------------------------------------------------------------------

async function listCases(file: 'prompt.txt' | 'turns.json', only?: string[]): Promise<string[]> {
	const entries = await readdir(CASES_DIR, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isDirectory() && existsSync(path.join(CASES_DIR, entry.name, file)))
		.map((entry) => entry.name)
		.filter((name) => !only || only.includes(name))
		.sort();
}

// -- Single-turn cases (testmax compare.py) ----------------------------------

async function runCompare(options: RunOptions, caseName: string, runDir: string): Promise<void> {
	const caseDir = path.join(CASES_DIR, caseName);
	const args = [
		path.join(options.testmaxDir, 'compare.py'),
		...['--builders', 'iai', '--no-live', '--run-dir', runDir],
		...['--title', `${options.arm} ${caseName} ${path.basename(runDir)}`],
		...['--prompt-file', path.join(caseDir, 'prompt.txt')],
		...['--expected-file', path.join(caseDir, 'expected.txt')],
		...['--scenarios-file', path.join(caseDir, 'scenarios.json')],
	];
	await mkdir(path.dirname(runDir), { recursive: true });
	const log = openSync(`${runDir}.log`, 'w');
	try {
		const child = spawn(options.python, args, {
			env: { ...process.env, COMPARE_RECORD: '0', COMPARE_LIVE: '0' },
			stdio: ['ignore', log, log],
		});
		await new Promise<void>((resolve, reject) => {
			child.on('error', reject);
			child.on('close', () => resolve());
		});
	} finally {
		closeSync(log);
	}
}

async function runSingleTurn(options: RunOptions, caseName: string, rep: number): Promise<void> {
	const runDir = path.join(options.runsDir, options.arm, `${caseName}-r${rep}`);
	if (existsSync(runDir)) return logger.info(`skip ${options.arm} ${caseName} r${rep} (exists)`);
	await runCompare(options, caseName, runDir);
	try {
		await reportRunDir(runDir);
		logger.success(`done ${options.arm} ${caseName} r${rep}`);
	} catch (error) {
		logger.error(`failed ${options.arm} ${caseName} r${rep}: ${String(error)} (see ${runDir}.log)`);
	}
}

// -- Multi-turn cases --------------------------------------------------------

async function sendTurns(client: N8nClient, threadId: string, turns: string[], gapMs: number) {
	const events: CapturedEvent[] = [];
	const abort = new AbortController();
	void startSseConnection(client, threadId, events, abort.signal).catch(() => {});
	const startTime = Date.now();
	const wait = { client, threadId, events, approvedRequests: new Set<string>(), startTime, logger };
	try {
		for (const [index, message] of turns.entries()) {
			if (index > 0) await delay(gapMs);
			recordUserTurn(events, message);
			await client.sendMessage(threadId, message);
			await waitForAllActivity({ ...wait, timeoutMs: MULTI_TURN_TIMEOUT_MS });
			logger.info(`  turn ${index + 1}/${turns.length} finished`);
		}
	} finally {
		abort.abort();
	}
	return events;
}

async function runMultiTurn(options: RunOptions, caseName: string, rep: number): Promise<void> {
	const runDir = path.join(options.runsDir, options.arm, `${caseName}-r${rep}`);
	if (existsSync(runDir)) return logger.info(`skip ${options.arm} ${caseName} r${rep} (exists)`);
	const turns = turnsSchema.parse(await readJson(path.join(CASES_DIR, caseName, 'turns.json')));
	const client = await loggedInClient();
	const threadId = randomUUID();
	await client.ensureThread(threadId);
	try {
		const events = await sendTurns(client, threadId, turns, options.gapSeconds * 1000);
		await mkdir(path.join(runDir, 'iai'), { recursive: true });
		await writeFile(path.join(runDir, 'iai', 'events.json'), JSON.stringify(events));
		await writeFile(path.join(runDir, 'iai', 'run.json'), JSON.stringify({ threadId }, null, 2));
		await reportRunDir(runDir);
		logger.success(`done ${options.arm} ${caseName} r${rep}`);
	} catch (error) {
		logger.error(`failed ${options.arm} ${caseName} r${rep}: ${String(error)}`);
	}
}

async function runArm(options: RunOptions): Promise<void> {
	const lastRep = options.firstRep + options.reps - 1;
	for (const caseName of await listCases('prompt.txt', options.cases)) {
		for (let rep = options.firstRep; rep <= lastRep; rep++) {
			await runSingleTurn(options, caseName, rep);
		}
	}
	for (const caseName of await listCases('turns.json', options.cases)) {
		for (let rep = options.firstRep; rep <= lastRep; rep++) {
			await runMultiTurn(options, caseName, rep);
		}
	}
	logger.info(`arm ${options.arm} finished. Results: ${path.join(options.runsDir, options.arm)}`);
}

// -- Compare -----------------------------------------------------------------

async function loadRun(runDir: string) {
	const reportFile = path.join(runDir, 'iai', 'context-report.json');
	if (!existsSync(reportFile)) return undefined;
	const report = reportSchema.parse(await readJson(reportFile));
	const checksFile = path.join(runDir, 'iai', 'auto-checks.json');
	return summarizeRun(report, existsSync(checksFile) ? await readJson(checksFile) : undefined);
}

async function loadCaseArmRuns(runsDir: string, arm: string, caseName: string) {
	const armDir = path.join(runsDir, arm);
	const names = existsSync(armDir) ? await readdir(armDir) : [];
	const isRunOf = (name: string) => /^\d+$/.test(name.slice(`${caseName}-r`.length));
	const runDirs = names.filter((name) => name.startsWith(`${caseName}-r`) && isRunOf(name)).sort();
	const runs = await Promise.all(
		runDirs.map(async (name) => await loadRun(path.join(armDir, name))),
	);
	return { caseName, arm, runs: runs.filter((run) => run !== undefined) };
}

async function compareArms(runsDir: string, arms: string[]): Promise<string> {
	const cases = [...(await listCases('prompt.txt')), ...(await listCases('turns.json'))];
	const rows: CaseArmRuns[] = [];
	for (const caseName of cases) {
		for (const arm of arms) rows.push(await loadCaseArmRuns(runsDir, arm, caseName));
	}
	return renderComparisonTable(rows);
}

// -- Entry point -------------------------------------------------------------

function parseCli(argv: string[]) {
	return parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
			arm: { type: 'string' },
			cases: { type: 'string' },
			reps: { type: 'string', default: '2' },
			'first-rep': { type: 'string', default: '1' },
			'runs-dir': { type: 'string', default: process.env.AB_BENCH_RUNS_DIR ?? DEFAULT_RUNS_DIR },
			'testmax-dir': { type: 'string', default: process.env.TESTMAX_DIR ?? DEFAULT_TESTMAX_DIR },
			python: { type: 'string', default: process.env.PYTHON ?? 'python3' },
			'gap-seconds': { type: 'string', default: '30' },
			out: { type: 'string' },
		},
	});
}

async function main(): Promise<void> {
	const { values, positionals } = parseCli(process.argv.slice(2));
	const [command, ...rest] = positionals;
	const runsDir = path.resolve(values['runs-dir']);
	if (command === 'run') {
		if (!values.arm) throw new Error('Pass --arm <name>.');
		await runArm({
			arm: values.arm,
			cases: values.cases?.split(','),
			reps: Number(values.reps),
			firstRep: Number(values['first-rep']),
			runsDir,
			testmaxDir: path.resolve(values['testmax-dir']),
			python: values.python,
			gapSeconds: Number(values['gap-seconds']),
		});
	} else if (command === 'report' && rest[0]) {
		const { steps: _steps, ...summary } = await writeContextReport(rest[0], values.out);
		console.log(JSON.stringify(summary, null, 2));
	} else if (command === 'compare' && rest.length > 0) {
		console.log(await compareArms(runsDir, rest));
	} else {
		throw new Error('Usage: run --arm <name> | report <threadId> [--out file] | compare <arm>...');
	}
}

if (require.main === module) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
