// ---------------------------------------------------------------------------
// Computer-use scenario runner.
//
// External-daemon mode: the daemon is expected to be already running. Per
// scenario: surgical pre-clean of paths the scenario will seed or grade,
// snapshot n8n resources, optionally seed a fixture workflow, run chat,
// grade. We never restart or kill the daemon, and we don't post-clean files
// on disk — the user inspects them and wipes the sandbox dir manually when
// they want a clean slate.
//
// The n8n side (workflows / credentials / data tables) IS still cleaned via
// snapshot+diff so the local n8n instance stays in the state it started in.
// ---------------------------------------------------------------------------

import { jsonParse } from 'n8n-workflow';
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { runChat } from './chat';
import { cleanupDelta, snapshotResources } from './cleanup';
import type { DaemonInfo } from './daemon';
import { applyGrader } from './graders';
import { findFiles } from './graders/fs';
import { isContained } from './path-utils';
import type { GraderResult, Scenario, ScenarioResult, ScenarioTrace } from './types';
import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';

const DEFAULT_TIMEOUT_MS = 600_000;

export interface RunScenarioOptions {
	client: N8nClient;
	scenario: Scenario;
	daemon: DaemonInfo;
	fixturesDir: string;
	logger: EvalLogger;
	timeoutMs?: number;
	/** When true, skip post-run cleanup of n8n state and chat threads (default: false). */
	keepData?: boolean;
}

export async function runScenario(options: RunScenarioOptions): Promise<ScenarioResult> {
	const { client, scenario, daemon, logger } = options;
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const sandboxDir = daemon.directory;

	logger.info(`[${scenario.id}] start (${scenario.category})`);

	await preClean(sandboxDir, scenario, logger);
	await seedFiles(sandboxDir, scenario, options.fixturesDir, logger);

	const before = await snapshotResources(client);
	let trace: ScenarioTrace | undefined;
	let runError: string | undefined;

	try {
		await maybeSeedWorkflow(client, scenario, options.fixturesDir, logger);
		trace = await runChat({ client, prompt: scenario.prompt, timeoutMs, logger });
	} catch (error) {
		runError = error instanceof Error ? error.message : String(error);
		logger.error(`[${scenario.id}] run failed: ${runError}`);
	}

	const graderResults = trace ? await runGraders(scenario, trace, sandboxDir) : [];
	const pass = !runError && graderResults.every((r) => r.pass);

	for (const r of graderResults) {
		const tag = r.pass ? 'PASS' : 'FAIL';
		const message = `[${scenario.id}] ${tag} ${r.grader.type}: ${r.reason}`;
		if (r.pass) {
			logger.verbose(message);
		} else {
			logger.info(message);
		}
	}

	if (!options.keepData) {
		await cleanupDelta(client, before, logger);
		if (trace?.threadId) {
			try {
				await client.deleteThread(trace.threadId);
				logger.verbose(`[${scenario.id}] deleted chat thread ${trace.threadId}`);
			} catch (error) {
				logger.verbose(
					`[${scenario.id}] failed to delete chat thread ${trace.threadId}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	} else if (trace?.threadId) {
		logger.info(`[${scenario.id}] keeping chat thread ${trace.threadId} (--keep-data)`);
	}

	return {
		scenario,
		pass,
		graderResults,
		durationMs: trace?.durationMs ?? 0,
		toolCallCount: trace?.toolCalls.length ?? 0,
		toolCalls: (trace?.toolCalls ?? []).map((tc, i) => ({
			name: tc.toolName,
			args: tc.args,
			argTokensEst: trace?.tokens.perCall[i]?.argTokensEst ?? 0,
			resultTokensEst: trace?.tokens.perCall[i]?.resultTokensEst ?? 0,
		})),
		tokens: trace?.tokens ?? {
			perCall: [],
			totalArgsEst: 0,
			totalResultsEst: 0,
			largestResultEst: 0,
			estimated: true,
		},
		finalText: (trace?.finalText ?? '').slice(0, 4000),
		confirmations: trace?.confirmations ?? [],
		sandboxDir,
		error: runError,
	};
}

// ---------------------------------------------------------------------------
// Surgical pre-clean
//
// Deletes ONLY the paths this scenario is about to seed or grade. Anything
// else in the daemon's working dir is left alone — important when the user
// has unrelated files in the sandbox they care about.
// ---------------------------------------------------------------------------

async function preClean(sandboxDir: string, scenario: Scenario, logger: EvalLogger): Promise<void> {
	const paths = new Set<string>();

	for (const seed of scenario.setup?.seedFiles ?? []) {
		paths.add(seed.to);
	}

	for (const grader of scenario.graders) {
		if (grader.type === 'fs.fileExists' || grader.type === 'fs.fileMatches') {
			const matches = await findFiles(sandboxDir, grader.glob);
			for (const m of matches) paths.add(m);
		}
	}

	for (const p of paths) {
		const full = resolveInside(sandboxDir, p, 'sandbox path');
		await rm(full, { recursive: true, force: true });
	}

	if (paths.size > 0) {
		logger.verbose(`[${scenario.id}] pre-cleaned ${String(paths.size)} path(s) under sandbox`);
	}
}

async function seedFiles(
	sandboxDir: string,
	scenario: Scenario,
	fixturesDir: string,
	logger: EvalLogger,
): Promise<void> {
	const seeds = scenario.setup?.seedFiles ?? [];
	for (const seed of seeds) {
		const src = resolveInside(fixturesDir, seed.from, 'fixture path');
		const dest = resolveInside(sandboxDir, seed.to, 'sandbox path');
		await mkdir(dirname(dest), { recursive: true });
		await copyFile(src, dest);
	}
	if (seeds.length > 0) {
		logger.verbose(`[${scenario.id}] seeded ${String(seeds.length)} file(s)`);
	}
}

function resolveFixture(fixturesDir: string, fixturePath: string): string {
	return resolveInside(fixturesDir, fixturePath, 'fixture path');
}

/**
 * Join `candidate` onto `root` and assert the result stays within `root`.
 * Throws if the resolved path escapes (e.g. via `..`). Used to keep scenario
 * authors honest when declaring fixture paths and sandbox destinations.
 *
 * Exported for unit testing — keep the import surface narrow.
 */
export function resolveInside(root: string, candidate: string, label: string): string {
	const rootResolved = resolve(root);
	const fullResolved = resolve(rootResolved, candidate);
	// Allow the root itself (e.g. empty candidate) as a no-op destination;
	// otherwise require strict containment.
	if (fullResolved !== rootResolved && !isContained(rootResolved, fullResolved)) {
		throw new Error(`${label} "${candidate}" escapes ${root}`);
	}
	return fullResolved;
}

// ---------------------------------------------------------------------------
// Optional pre-seeded workflow (for scenarios that say "look at my workflow X")
// ---------------------------------------------------------------------------

async function maybeSeedWorkflow(
	client: N8nClient,
	scenario: Scenario,
	fixturesDir: string,
	logger: EvalLogger,
): Promise<void> {
	const path = scenario.setup?.seedWorkflow;
	if (!path) return;

	const fixturePath = resolveFixture(fixturesDir, path);
	const raw = await readFile(fixturePath, 'utf-8');
	const parsed = jsonParse<Record<string, unknown>>(raw, {
		errorMessage: `Invalid workflow JSON: ${path}`,
	});

	const { id } = await client.createWorkflow(parsed);
	logger.verbose(`[${scenario.id}] seeded workflow ${id}`);

	if (scenario.setup?.activateSeededWorkflow) {
		await client.activateWorkflow(id);
		logger.verbose(`[${scenario.id}] activated workflow ${id}`);
	}
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

async function runGraders(
	scenario: Scenario,
	trace: ScenarioTrace,
	sandboxDir: string,
): Promise<GraderResult[]> {
	const results: GraderResult[] = [];
	for (const grader of scenario.graders) {
		try {
			results.push(await applyGrader(grader, { sandboxDir, trace }));
		} catch (error) {
			results.push({
				grader,
				pass: false,
				reason: `grader threw: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	}
	return results;
}
