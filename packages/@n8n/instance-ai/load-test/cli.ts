// ---------------------------------------------------------------------------
// Instance AI load test — phase orchestrator
//
// Measures backend memory per concurrent user by walking a fixed phase
// sequence and taking a comparable reading at each boundary:
//
//   baseline -> threads-open -> load -> post-load-idle -> sse-closed -> post-cleanup
//
// The phases are the design. `post-load-idle` in particular holds every SSE
// connection open and every thread alive *after* the conversations finish,
// because "what does a finished thread still retain" is the question that
// actually matters for an instance with real users on it.
// ---------------------------------------------------------------------------

import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { MAX_USERS, parseArgs, USAGE, type LoadTestArgs } from './args';
import { selectCases, type BuildCase } from './cases';
import {
	deleteProvisionedUsers,
	provisionUsers,
	type LoadTestUser,
	type ProvisionResult,
} from './provision';
import {
	assessDriverConfound,
	deriveResults,
	fitSweep,
	formatHumanSummary,
	writeReport,
	type LoadTestReport,
	type PhaseName,
	type PhaseReadings,
	type RunLevelReport,
	type SweepPoint,
} from './report';
import {
	describeError,
	Sampler,
	type MetricSample,
	type SamplerCapabilities,
	type StabilizedReading,
} from './sampler';
import {
	cancelRun,
	cleanupResources,
	closeSse,
	deleteThread,
	emptyTally,
	openVirtualUser,
	runVirtualUser,
	type VirtualUser,
	type VirtualUserResult,
} from './virtual-user';
import { N8nClient } from '../evaluations/clients/n8n-client';
import { runWithConcurrency } from '../evaluations/harness/cleanup';
import { createLogger, type EvalLogger } from '../evaluations/harness/logger';

/** Opening N sessions is I/O-bound; 8 at a time avoids a login stampede. */
const OPEN_CONCURRENCY = 8;

/** How long to wait for runs to drain before giving up on post-load-idle. */
const IDLE_WAIT_MS = 120_000;

/** Rough per-turn cost, for the preflight estimate only. */
const ESTIMATED_USD_PER_TURN = 0.25;

async function main(): Promise<void> {
	const argv = process.argv.slice(2);
	if (argv.includes('--help') || argv.includes('-h')) {
		console.log(USAGE);
		return;
	}

	const args = parseArgs(argv);
	const logger = createLogger(args.verbose);
	const cases = selectCases(args.caseNames);
	const startedAt = new Date().toISOString();
	const timestamp = startedAt.replace(/[:.]/g, '-');

	await mkdir(args.outputDir, { recursive: true });

	// -- owner session + capability probe -----------------------------------

	const ownerClient = new N8nClient(args.baseUrl);
	try {
		await ownerClient.login(args.ownerEmail, args.ownerPassword);
	} catch (error) {
		throw new Error(
			`Owner login failed at ${args.baseUrl} — set --email/--password or N8N_EVAL_EMAIL/N8N_EVAL_PASSWORD (${describeError(error)})`,
		);
	}

	const capabilities = await Sampler.probe(
		args.baseUrl,
		logger,
		async () => await probeInstanceAi(ownerClient),
	);
	const effectiveCapabilities: SamplerCapabilities = args.noMetrics
		? { ...capabilities, metrics: false, pss: false }
		: capabilities;

	printPreflight(args, cases, effectiveCapabilities, logger);

	if (!effectiveCapabilities.instanceAiEnabled) {
		throw new Error(
			'The instance-ai module is not enabled on the target — set N8N_ENABLED_MODULES=instance-ai',
		);
	}
	if (!effectiveCapabilities.metrics && !args.noMetrics) {
		throw new Error(
			'/metrics is unreachable, so memory cannot be sampled. Re-run with --no-metrics to ' +
				'record phase timestamps only (then read the numbers off Grafana), or enable ' +
				'N8N_METRICS=true and expose /metrics.',
		);
	}

	const estimatedUsd = Math.max(...args.userCounts) * args.maxTurns * ESTIMATED_USD_PER_TURN;
	if (!args.dryRun && !args.yes && estimatedUsd > args.maxCostUsd) {
		throw new Error(
			`Estimated spend ~$${estimatedUsd.toFixed(2)} exceeds --max-cost-usd ${args.maxCostUsd}. ` +
				'Re-run with --yes to accept, or lower --users/--max-turns.',
		);
	}

	// -- run each concurrency level -----------------------------------------

	const runs: RunLevelReport[] = [];
	const sweepPoints: SweepPoint[] = [];
	let provisioning: ProvisionResult | undefined;
	const allUsers = new Map<string, LoadTestUser>();

	const rootAbort = new AbortController();
	const wallClockTimer = setTimeout(() => {
		logger.warn(`Wall-clock limit of ${args.maxWallClockMs}ms reached — winding down`);
		rootAbort.abort();
	}, args.maxWallClockMs);
	wallClockTimer.unref();

	process.on('SIGINT', () => {
		logger.warn('SIGINT — cancelling runs, cleaning up, and writing a partial report');
		rootAbort.abort();
	});

	const identitySuffix = args.resetUsers ? timestamp.slice(-8) : undefined;

	try {
		for (const users of args.userCounts) {
			logger.info(`=== Concurrency level: ${users} user(s) ===`);

			const provisioned = await provisionUsers({
				baseUrl: args.baseUrl,
				count: users,
				password: args.userPassword,
				logger,
				ownerClient,
				identitySuffix,
				usersFile: args.usersFile,
			});
			provisioning = mergeProvisioning(provisioning, provisioned);
			for (const user of provisioned.users) allUsers.set(user.email, user);

			if (provisioned.users.length === 0) {
				throw new Error('No users could be provisioned — see the failures above');
			}

			const run = await runLevel({
				args,
				users: provisioned.users,
				cases,
				capabilities: effectiveCapabilities,
				logger,
				timestamp,
				abortSignal: rootAbort.signal,
			});
			runs.push(run);

			const peak = run.readings['post-load-idle'] ?? run.readings['load-peak'];
			sweepPoints.push({
				users: run.users,
				rssMB: peak?.rssMB ?? null,
				heapMB: peak?.heapUsedMB ?? null,
			});

			if (rootAbort.signal.aborted) {
				logger.warn('Aborted — skipping remaining concurrency levels');
				break;
			}
		}
	} finally {
		clearTimeout(wallClockTimer);

		if (args.deleteUsers && args.usersFile === undefined) {
			const deleted = await deleteProvisionedUsers(ownerClient, [...allUsers.values()], logger);
			logger.info(`Deleted ${deleted} provisioned user(s)`);
		}
	}

	// -- report -------------------------------------------------------------

	const { ownerPassword: _op, userPassword: _up, ...safeConfig } = args;
	const report: LoadTestReport = {
		startedAt,
		finishedAt: new Date().toISOString(),
		baseUrl: args.baseUrl,
		capabilities: effectiveCapabilities,
		stabilizeMethod: effectiveCapabilities.gc ? 'forced-gc' : 'min-of-window',
		config: safeConfig,
		caseNames: cases.map((buildCase) => buildCase.name),
		runs,
		sweep: sweepPoints.length > 1 ? fitSweep(sweepPoints) : undefined,
		provisioning: {
			invited: provisioning?.invited ?? 0,
			reused: provisioning?.reused ?? 0,
			failed: provisioning?.failed.length ?? 0,
		},
	};

	const reportPath = await writeReport(report, args.outputDir, timestamp);
	console.log(formatHumanSummary(report));
	logger.success(`Report: ${reportPath}`);
}

// ---------------------------------------------------------------------------
// One concurrency level
// ---------------------------------------------------------------------------

interface RunLevelOptions {
	args: LoadTestArgs;
	users: LoadTestUser[];
	cases: BuildCase[];
	capabilities: SamplerCapabilities;
	logger: EvalLogger;
	timestamp: string;
	abortSignal: AbortSignal;
}

async function runLevel(options: RunLevelOptions): Promise<RunLevelReport> {
	const { args, users, cases, logger } = options;
	const userCount = users.length;

	const sampler = new Sampler({
		baseUrl: args.baseUrl,
		logger,
		capabilities: options.capabilities,
		sampleIntervalMs: args.sampleIntervalMs,
		jsonlPath: join(args.outputDir, `loadtest-${options.timestamp}-n${userCount}-samples.jsonl`),
		stableThresholdMB: args.stableThresholdMB,
		stableMaxWaitMs: args.stableMaxWaitMs,
		quietWindowMs: args.quietWindowMs,
	});

	const readings: PhaseReadings = {};
	const notes: string[] = [];
	const heapSnapshots: string[] = [];
	const phaseTimestamps: RunLevelReport['phaseTimestamps'] = [];
	const cleanup = emptyTally();

	const measure = async (phase: PhaseName): Promise<StabilizedReading> => {
		const startedAt = new Date().toISOString();
		logger.info(`[phase] ${phase}`);
		const reading = await sampler.stabilize(phase);
		readings[phase] = reading;
		phaseTimestamps.push({ phase, startedAt, endedAt: new Date().toISOString() });

		if (args.heapSnapshots) {
			const path = await sampler.takeHeapSnapshot(`n${userCount}-${phase}`, args.outputDir);
			if (path) heapSnapshots.push(path);
		}
		return reading;
	};

	// Phase 1 — baseline: nothing connected.
	sampler.start('baseline');
	const baseline = await measure('baseline');
	const baselineCost = sampler.latestCostUsd();

	// Phase 2 — threads-open: sessions + threads + SSE, but no messages. All
	// connections settle before load starts, which makes the idle-connection
	// cost separately measurable.
	sampler.setPhase('threads-open');
	const virtualUsers = await runWithConcurrency(
		users,
		async (user) => await openVirtualUser(user, user.index, { logger, cases, eventCap: 4_000 }),
		Math.min(OPEN_CONCURRENCY, userCount),
	);
	await measure('threads-open');

	// Phase 3 — load.
	let userResults: VirtualUserResult[] = [];
	if (args.dryRun) {
		notes.push('dry run — no messages sent, so load/peak numbers are absent');
		logger.info('[phase] load (skipped: --dry-run)');
	} else {
		userResults = await runLoadPhase(sampler, virtualUsers, options, baselineCost, notes);

		const peak = peakReading(sampler.samples, 'load');
		if (peak) {
			readings['load-peak'] = peak;
			if (args.heapSnapshots) {
				const path = await sampler.takeHeapSnapshot(`n${userCount}-load-peak`, args.outputDir);
				if (path) heapSnapshots.push(path);
			}
		}
	}

	// Phase 4 — post-load-idle: conversations done, SSE STILL OPEN, threads
	// still alive. This is the reading that answers "what is retained".
	sampler.setPhase('post-load-idle');
	if (!(await sampler.waitForIdle(IDLE_WAIT_MS))) {
		notes.push('runs had not gone idle before post-load-idle was measured');
	}
	await measure('post-load-idle');

	// Phase 5 — sse-closed: streams aborted, threads still alive.
	sampler.setPhase('sse-closed');
	for (const virtualUser of virtualUsers) await closeSse(virtualUser);
	await measure('sse-closed');

	// Phase 6 — post-cleanup: threads deleted. Deliberately *only* the thread
	// delete, so the memory it frees is attributable.
	sampler.setPhase('post-cleanup');
	for (const virtualUser of virtualUsers) await deleteThread(virtualUser, cleanup, logger);
	await measure('post-cleanup');

	// Phase 7 — hygiene: not measured, just don't leave litter behind.
	if (!args.keepWorkflows) {
		logger.info('[phase] resource cleanup (not measured)');
		for (const virtualUser of virtualUsers) {
			await cleanupResources(virtualUser, cleanup, logger);
		}
	}

	sampler.stop();

	// -- validity checks ----------------------------------------------------

	const maxConcurrentRunsObserved = sampler.maxActiveRuns();
	const plateauReached =
		maxConcurrentRunsObserved !== null && maxConcurrentRunsObserved >= userCount;
	if (!plateauReached && !args.dryRun) {
		notes.push(
			`peak concurrency was ${maxConcurrentRunsObserved ?? 'unknown'} of ${userCount} — runs were serialized, so per-user numbers are not trustworthy`,
		);
	}
	if (cleanup.failures.length > 0) {
		notes.push('cleanup failures make the residual-leak number unreliable');
	}

	const serverRssGrowthMB =
		readings['load-peak']?.rssMB !== undefined &&
		readings['load-peak']?.rssMB !== null &&
		baseline.rssMB !== null
			? readings['load-peak'].rssMB - baseline.rssMB
			: null;
	const { driverConfounded, driverRssGrowthMB } = assessDriverConfound(
		sampler.samples,
		serverRssGrowthMB,
	);
	if (driverConfounded) {
		notes.push('driver memory growth is a large fraction of server growth — treat with suspicion');
	}

	const finalCost = sampler.latestCostUsd();
	const costUsdDelta =
		finalCost !== null && baselineCost !== null ? round2(finalCost - baselineCost) : null;

	return {
		users: userCount,
		dryRun: args.dryRun,
		readings,
		derived: deriveResults(userCount, readings),
		userResults,
		cleanup,
		maxConcurrentRunsObserved,
		plateauReached,
		costUsdDelta,
		eventLoopLagMaxMs: maxOf(sampler.samples.map((sample) => sample.eventLoopLagMs)),
		driverConfounded,
		driverRssGrowthMB,
		serverRssGrowthMB: serverRssGrowthMB === null ? null : round2(serverRssGrowthMB),
		phaseTimestamps,
		heapSnapshots,
		notes,
	};
}

/**
 * Run every conversation concurrently with a staggered start, while a watcher
 * enforces the spend ceiling. `allSettled` so one user's failure never takes
 * the run down — a partial result plus a note beats no data.
 */
async function runLoadPhase(
	sampler: Sampler,
	virtualUsers: VirtualUser[],
	options: RunLevelOptions,
	baselineCost: number | null,
	notes: string[],
): Promise<VirtualUserResult[]> {
	const { args, logger } = options;
	sampler.setPhase('load');
	logger.info(`[phase] load — ${virtualUsers.length} user(s), ramp ${args.rampMs}ms`);

	const loadAbort = new AbortController();
	const propagate = (): void => loadAbort.abort();
	options.abortSignal.addEventListener('abort', propagate);

	const costWatcher = setInterval(
		() => {
			const current = sampler.latestCostUsd();
			if (current === null || baselineCost === null) return;
			if (current - baselineCost > args.maxCostUsd) {
				logger.warn(
					`Spend ceiling hit ($${(current - baselineCost).toFixed(2)} > $${args.maxCostUsd}) — cancelling runs`,
				);
				notes.push('aborted by the --max-cost-usd kill-switch');
				loadAbort.abort();
			}
		},
		Math.max(args.sampleIntervalMs, 1_000),
	);
	costWatcher.unref();

	const step = virtualUsers.length > 1 ? args.rampMs / (virtualUsers.length - 1) : 0;

	try {
		const settled = await Promise.allSettled(
			virtualUsers.map(
				async (virtualUser, index) =>
					await runVirtualUser(virtualUser, {
						logger,
						timeoutMs: args.timeoutMs,
						maxTurns: args.maxTurns,
						startDelayMs: Math.round(index * step),
						abortSignal: loadAbort.signal,
					}),
			),
		);

		// If the abort fired we may have left runs in flight; clear them before
		// measuring, or an active run's state pollutes every later phase.
		if (loadAbort.signal.aborted) {
			await Promise.all(virtualUsers.map(async (vu) => await cancelRun(vu, logger)));
		}

		return settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
	} finally {
		clearInterval(costWatcher);
		options.abortSignal.removeEventListener('abort', propagate);
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The peak of the load phase is a genuine maximum, not a stabilized reading —
 * forcing GC mid-load would distort the very thing being measured. Flagged as
 * such via `method`.
 */
function peakReading(
	samples: readonly MetricSample[],
	phase: string,
): StabilizedReading | undefined {
	const inPhase = samples.filter((sample) => sample.phase === phase && sample.rssMB !== null);
	if (inPhase.length === 0) return undefined;

	const peak = inPhase.reduce((max, sample) =>
		(sample.rssMB ?? 0) > (max.rssMB ?? 0) ? sample : max,
	);
	return {
		phase: 'load-peak',
		method: 'min-of-window',
		heapUsedMB: peak.heapUsedMB,
		heapTotalMB: peak.heapTotalMB,
		rssMB: peak.rssMB,
		pssMB: peak.pssMB,
		externalMB: peak.externalMB,
		nonHeapOverheadMB: peak.nonHeapOverheadMB,
		sampleCount: inPhase.length,
		naturalGcCount: null,
		waitedMs: 0,
		timedOut: false,
		at: peak.at,
	};
}

/** Cheap "is instance-ai mounted" probe: a bogus thread 404s, a missing module doesn't respond. */
async function probeInstanceAi(ownerClient: N8nClient): Promise<boolean> {
	try {
		await ownerClient.getThreadStatus('00000000-0000-0000-0000-000000000000');
		return true;
	} catch (error) {
		// A 404 for the thread means the route exists; anything else (route not
		// found, module disabled) means it does not.
		return describeError(error).includes('404');
	}
}

function mergeProvisioning(
	existing: ProvisionResult | undefined,
	next: ProvisionResult,
): ProvisionResult {
	if (!existing) return next;
	return {
		users: next.users,
		invited: existing.invited + next.invited,
		reused: existing.reused + next.reused,
		failed: [...existing.failed, ...next.failed],
	};
}

function printPreflight(
	args: LoadTestArgs,
	cases: BuildCase[],
	capabilities: SamplerCapabilities,
	logger: EvalLogger,
): void {
	logger.info(`Target:       ${args.baseUrl}`);
	logger.info(`Concurrency:  ${args.userCounts.join(', ')} (max ${MAX_USERS})`);
	logger.info(`Cases:        ${cases.map((c) => `${c.name} (${c.description})`).join(' | ')}`);
	logger.info(`Turns/user:   ${args.maxTurns}   ramp ${args.rampMs}ms`);
	logger.info(
		`Capabilities: metrics=${capabilities.metrics} gc=${capabilities.gc} pss=${capabilities.pss} ` +
			`idleProbe=${capabilities.idleProbe} instanceAi=${capabilities.instanceAiEnabled}`,
	);
	logger.info(
		`Stabilize:    ${capabilities.gc ? 'forced-gc (local)' : `min-of-window (${args.quietWindowMs}ms quiet window)`}`,
	);

	if (args.dryRun) {
		logger.info('Mode:         DRY RUN — no messages sent, zero LLM spend');
	} else {
		const upperBound = Math.max(...args.userCounts) * args.maxTurns;
		logger.info(
			`Spend:        up to ${upperBound} LLM turns, ceiling $${args.maxCostUsd}, wall clock ${args.maxWallClockMs}ms`,
		);
	}
}

function maxOf(values: Array<number | null>): number | null {
	const present = values.filter((value): value is number => value !== null);
	return present.length === 0 ? null : Math.max(...present);
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

main().catch((error: unknown) => {
	console.error(`\n${describeError(error)}\n`);
	process.exitCode = 1;
});
