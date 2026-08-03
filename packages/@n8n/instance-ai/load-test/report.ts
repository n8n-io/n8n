// ---------------------------------------------------------------------------
// Report: derived per-user memory numbers, sweep fit, JSON + human output
//
// The headline metric is RSS, because RSS is what OOM-kills a pod; heap is the
// diagnostic that explains it. Negative deltas are surfaced rather than clamped
// to zero — a negative "cost per user" means the reading is untrustworthy
// (usually the heap hadn't settled), and hiding it would manufacture confidence.
// ---------------------------------------------------------------------------

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { LoadTestArgs } from './args';
import type { MetricSample, SamplerCapabilities, StabilizedReading } from './sampler';
import type { VirtualUserResult, CleanupTally } from './virtual-user';

export const PHASE_NAMES = [
	'baseline',
	'threads-open',
	'load-peak',
	'post-load-idle',
	'sse-closed',
	'post-cleanup',
] as const;

export type PhaseName = (typeof PHASE_NAMES)[number];

export type PhaseReadings = Partial<Record<PhaseName, StabilizedReading>>;

export interface MemoryPair {
	heapMB: number | null;
	rssMB: number | null;
}

export interface Derived {
	users: number;
	/** Cost of an idle user holding an open SSE connection and an empty thread. */
	perUserIdle: MemoryPair;
	/** Extra cost at peak, above the idle-connection baseline. */
	perUserPeakMarginal: MemoryPair;
	/** Total peak cost per user, relative to an empty server. */
	perUserPeakTotal: MemoryPair;
	/** Still held after the user's conversation finished — the interesting one. */
	perUserRetained: MemoryPair;
	/** Attributable to the live SSE connection itself. */
	perSseConnection: MemoryPair;
	/** Released by deleting the thread. */
	freedByDeleteThread: MemoryPair;
	/** Absolute residual after full teardown. */
	residualLeak: MemoryPair;
	residualPerUser: MemoryPair;
}

export interface SweepPoint {
	users: number;
	rssMB: number | null;
	heapMB: number | null;
}

export interface LinearFit {
	/** Memory per concurrent user — the deliverable. */
	slopeMBPerUser: number;
	interceptMB: number;
	r2: number;
	points: number;
}

export interface SweepFit {
	rss?: LinearFit;
	heap?: LinearFit;
	/** Never extrapolate beyond 2x the largest measured N. */
	maxTrustedUsers: number;
}

export interface RunLevelReport {
	users: number;
	/** No messages were sent, so load/peak/plateau numbers are absent by design. */
	dryRun: boolean;
	readings: PhaseReadings;
	derived: Derived;
	userResults: VirtualUserResult[];
	cleanup: CleanupTally;
	maxConcurrentRunsObserved: number | null;
	plateauReached: boolean;
	costUsdDelta: number | null;
	eventLoopLagMaxMs: number | null;
	driverConfounded: boolean;
	driverRssGrowthMB: number | null;
	serverRssGrowthMB: number | null;
	phaseTimestamps: Array<{ phase: string; startedAt: string; endedAt: string }>;
	heapSnapshots: string[];
	notes: string[];
}

export interface LoadTestReport {
	startedAt: string;
	finishedAt: string;
	baseUrl: string;
	capabilities: SamplerCapabilities;
	stabilizeMethod: string;
	config: Omit<LoadTestArgs, 'ownerPassword' | 'userPassword'>;
	caseNames: string[];
	runs: RunLevelReport[];
	sweep?: SweepFit;
	provisioning: { invited: number; reused: number; failed: number };
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

function diff(
	later: StabilizedReading | undefined,
	earlier: StabilizedReading | undefined,
	divisor = 1,
): MemoryPair {
	const heapMB = ratio(later?.heapUsedMB, earlier?.heapUsedMB, divisor);
	const rssMB = ratio(later?.rssMB, earlier?.rssMB, divisor);
	return { heapMB, rssMB };
}

function ratio(
	later: number | null | undefined,
	earlier: number | null | undefined,
	divisor: number,
): number | null {
	if (later === null || later === undefined) return null;
	if (earlier === null || earlier === undefined) return null;
	if (divisor === 0) return null;
	return round2((later - earlier) / divisor);
}

export function deriveResults(users: number, readings: PhaseReadings): Derived {
	const {
		baseline,
		'threads-open': threadsOpen,
		'load-peak': loadPeak,
		'post-load-idle': postLoadIdle,
		'sse-closed': sseClosed,
		'post-cleanup': postCleanup,
	} = readings;

	return {
		users,
		perUserIdle: diff(threadsOpen, baseline, users),
		perUserPeakMarginal: diff(loadPeak, threadsOpen, users),
		perUserPeakTotal: diff(loadPeak, baseline, users),
		perUserRetained: diff(postLoadIdle, threadsOpen, users),
		perSseConnection: diff(postLoadIdle, sseClosed, users),
		freedByDeleteThread: diff(sseClosed, postCleanup, users),
		residualLeak: diff(postCleanup, baseline),
		residualPerUser: diff(postCleanup, baseline, users),
	};
}

// ---------------------------------------------------------------------------
// Sweep fit
// ---------------------------------------------------------------------------

/**
 * Least-squares fit of memory against concurrency. A single concurrency level
 * cannot separate the server's fixed cost from its marginal per-user cost, so
 * the slope of a sweep is the only honest answer to "memory per user".
 */
export function fitLinear(points: Array<{ x: number; y: number }>): LinearFit | undefined {
	if (points.length < 2) return undefined;

	const n = points.length;
	const sumX = points.reduce((total, p) => total + p.x, 0);
	const sumY = points.reduce((total, p) => total + p.y, 0);
	const meanX = sumX / n;
	const meanY = sumY / n;

	let sxx = 0;
	let sxy = 0;
	for (const point of points) {
		sxx += (point.x - meanX) ** 2;
		sxy += (point.x - meanX) * (point.y - meanY);
	}
	// Every point at the same concurrency: no slope is identifiable.
	if (sxx === 0) return undefined;

	const slope = sxy / sxx;
	const intercept = meanY - slope * meanX;

	let ssRes = 0;
	let ssTot = 0;
	for (const point of points) {
		ssRes += (point.y - (intercept + slope * point.x)) ** 2;
		ssTot += (point.y - meanY) ** 2;
	}
	// A perfectly flat series has no variance to explain; call that a perfect fit.
	const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

	return {
		slopeMBPerUser: round2(slope),
		interceptMB: round2(intercept),
		r2: Math.round(r2 * 1000) / 1000,
		points: n,
	};
}

export function fitSweep(points: SweepPoint[]): SweepFit {
	const rssPoints = points
		.filter((point): point is SweepPoint & { rssMB: number } => point.rssMB !== null)
		.map((point) => ({ x: point.users, y: point.rssMB }));
	const heapPoints = points
		.filter((point): point is SweepPoint & { heapMB: number } => point.heapMB !== null)
		.map((point) => ({ x: point.users, y: point.heapMB }));

	return {
		rss: fitLinear(rssPoints),
		heap: fitLinear(heapPoints),
		maxTrustedUsers: points.length === 0 ? 0 : Math.max(...points.map((p) => p.users)) * 2,
	};
}

// ---------------------------------------------------------------------------
// Driver-confound check
// ---------------------------------------------------------------------------

/**
 * The driver prunes SSE events aggressively, but "we think it's fine" is not a
 * measurement. If the harness grew by a material fraction of what the server
 * grew, the run is flagged rather than quietly reported.
 */
export function assessDriverConfound(
	samples: readonly MetricSample[],
	serverRssGrowthMB: number | null,
): { driverConfounded: boolean; driverRssGrowthMB: number | null } {
	if (samples.length === 0) return { driverConfounded: false, driverRssGrowthMB: null };

	const driverValues = samples.map((sample) => sample.driverRssMB);
	const driverRssGrowthMB = round2(Math.max(...driverValues) - driverValues[0]);

	if (serverRssGrowthMB === null || serverRssGrowthMB <= 0) {
		return { driverConfounded: false, driverRssGrowthMB };
	}

	return {
		driverConfounded: driverRssGrowthMB > serverRssGrowthMB * 0.1,
		driverRssGrowthMB,
	};
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export async function writeReport(
	report: LoadTestReport,
	outputDir: string,
	timestamp: string,
): Promise<string> {
	await mkdir(outputDir, { recursive: true });
	const path = join(outputDir, `loadtest-${timestamp}.json`);
	await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
	return path;
}

function fmt(value: number | null, unit = ''): string {
	return value === null ? '—' : `${value}${unit}`;
}

function pair(label: string, value: MemoryPair): string {
	return `  ${label.padEnd(28)} rss ${fmt(value.rssMB).padStart(9)}   heap ${fmt(value.heapMB).padStart(9)}`;
}

export function formatHumanSummary(report: LoadTestReport): string {
	const lines: string[] = ['', '='.repeat(72), 'INSTANCE AI LOAD TEST', '='.repeat(72)];

	lines.push(
		`Target:      ${report.baseUrl}`,
		`Cases:       ${report.caseNames.join(', ')}`,
		`Stabilize:   ${report.stabilizeMethod}`,
		`Users:       provisioned ${report.provisioning.reused + report.provisioning.invited} (${report.provisioning.invited} invited, ${report.provisioning.reused} reused, ${report.provisioning.failed} failed)`,
		`Capability:  metrics=${report.capabilities.metrics} gc=${report.capabilities.gc} pss=${report.capabilities.pss} idleProbe=${report.capabilities.idleProbe}`,
	);

	for (const run of report.runs) {
		lines.push(
			'',
			'-'.repeat(72),
			`N = ${run.users} concurrent user(s)`,
			'-'.repeat(72),
			'Phase readings (MB)',
			`  ${'phase'.padEnd(20)} ${'rss'.padStart(9)} ${'heapUsed'.padStart(9)} ${'nonHeap'.padStart(9)}`,
		);

		for (const phase of PHASE_NAMES) {
			const reading = run.readings[phase];
			if (!reading) continue;
			lines.push(
				`  ${phase.padEnd(20)} ${fmt(reading.rssMB).padStart(9)} ${fmt(reading.heapUsedMB).padStart(9)} ${fmt(reading.nonHeapOverheadMB).padStart(9)}` +
					(reading.timedOut ? '  (did not settle)' : ''),
			);
		}

		lines.push(
			'',
			'Per-user cost (MB)',
			pair('idle (SSE open, no msgs)', run.derived.perUserIdle),
			pair('peak, marginal', run.derived.perUserPeakMarginal),
			pair('peak, total', run.derived.perUserPeakTotal),
			pair('retained after finishing', run.derived.perUserRetained),
			pair('live SSE connection', run.derived.perSseConnection),
			pair('freed by deleteThread', run.derived.freedByDeleteThread),
			pair('residual per user', run.derived.residualPerUser),
			'',
			'Residual leak after teardown (MB)',
			pair('absolute', run.derived.residualLeak),
			'',
			'Run validity',
			`  max concurrent runs observed  ${run.dryRun ? 'n/a (dry run)' : `${fmt(run.maxConcurrentRunsObserved)} / ${run.users}${run.plateauReached ? '' : '   <-- PLATEAU NOT REACHED'}`}`,
			`  conversations completed       ${run.userResults.filter((r) => r.completed).length} / ${run.userResults.length}`,
			`  event-loop lag max            ${fmt(run.eventLoopLagMaxMs, ' ms')}`,
			`  LLM cost this run             ${run.costUsdDelta === null ? '—' : `$${run.costUsdDelta.toFixed(4)}`}`,
			`  driver RSS growth             ${fmt(run.driverRssGrowthMB, ' MB')} (server ${fmt(run.serverRssGrowthMB, ' MB')})${run.driverConfounded ? '   <-- DRIVER MAY BE CONFOUNDING' : ''}`,
			`  cleanup                       ${run.cleanup.threadsDeleted} threads, ${run.cleanup.workflowsDeleted} workflows, ${run.cleanup.dataTablesDeleted} data tables, ${run.cleanup.failures.length} failures`,
		);

		for (const note of run.notes) lines.push(`  ! ${note}`);
	}

	if (report.sweep?.rss) {
		const { slopeMBPerUser, interceptMB, r2, points } = report.sweep.rss;
		lines.push(
			'',
			'='.repeat(72),
			'SWEEP FIT — rss(N) = intercept + slope * N',
			'='.repeat(72),
			`  memory per concurrent user   ${slopeMBPerUser} MB   <-- the answer`,
			`  fixed cost (intercept)       ${interceptMB} MB`,
			`  r²                           ${r2}${r2 < 0.9 ? '   <-- POOR FIT, treat slope as indicative only' : ''}`,
			`  points                       ${points}`,
			`  trust up to                  N = ${report.sweep.maxTrustedUsers} (2x largest measured)`,
		);
		if (report.sweep.heap) {
			lines.push(`  heap slope                   ${report.sweep.heap.slopeMBPerUser} MB/user`);
		}
	} else if (report.runs.length === 1) {
		lines.push(
			'',
			'Note: a single concurrency level cannot separate fixed from marginal cost.',
			'      Use --sweep 1,5,10 to fit memory per user.',
		);
	}

	lines.push('');
	return lines.join('\n');
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
