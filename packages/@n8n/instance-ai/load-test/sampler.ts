// ---------------------------------------------------------------------------
// Memory sampler
//
// Scrapes n8n's Prometheus /metrics endpoint on an interval and tags each
// sample with the current load-test phase. Every sample also records the
// *driver's* own memory so we can prove the harness isn't the thing leaking.
//
// Two stabilization tiers, chosen by capability probe rather than by flag:
//   - forced-gc     (local): POST /rest/e2e/gc, then poll until the heap settles
//   - min-of-window (cloud): take the trough of a quiet sampling window
// ---------------------------------------------------------------------------

import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

import {
	parsePromText,
	readFirstAvailable,
	readSum,
	readSumWhere,
	readValue,
	type PromSnapshot,
} from './prom';
import type { EvalLogger } from '../evaluations/harness/logger';

const BYTES_PER_MB = 1024 * 1024;

/** prom-client's exact lag series name depends on its version, so try in order. */
const EVENT_LOOP_LAG_CANDIDATES = [
	'n8n_nodejs_eventloop_lag_p99_seconds',
	'n8n_nodejs_eventloop_lag_mean_seconds',
	'n8n_nodejs_eventloop_lag_seconds',
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SamplerCapabilities {
	/** /metrics reachable and exposing the default (heap/RSS) series. */
	metrics: boolean;
	/** n8n_process_pss_bytes present (Linux only). */
	pss: boolean;
	/** POST /rest/e2e/gc available AND --expose-gc actually enabled. */
	gc: boolean;
	/** POST /rest/e2e/heap-snapshot available (same controller as gc). */
	heapSnapshot: boolean;
	/** GET /rest/instance-ai/test/idle available (E2E_TESTS builds only). */
	idleProbe: boolean;
	/** The instance-ai module is enabled at all. */
	instanceAiEnabled: boolean;
}

export interface MetricSample {
	at: string;
	phase: string;
	// Server memory
	heapUsedMB: number | null;
	heapTotalMB: number | null;
	externalMB: number | null;
	rssMB: number | null;
	pssMB: number | null;
	/** rss - heapTotal: catches native growth the JS heap doesn't show. */
	nonHeapOverheadMB: number | null;
	// Server saturation
	eventLoopLagMs: number | null;
	gcCount: number | null;
	// Instance AI load truth
	activeRuns: number | null;
	runsTotal: number | null;
	runsErrored: number | null;
	costUsd: number | null;
	tokensInput: number | null;
	tokensOutput: number | null;
	durableLogRows: number | null;
	durableLogBytes: number | null;
	// Driver self-measurement — guards against the harness confounding the result
	driverRssMB: number;
	driverHeapUsedMB: number;
}

export type StabilizeMethod = 'forced-gc' | 'min-of-window';

export interface StabilizedReading {
	phase: string;
	method: StabilizeMethod;
	heapUsedMB: number | null;
	heapTotalMB: number | null;
	rssMB: number | null;
	pssMB: number | null;
	externalMB: number | null;
	nonHeapOverheadMB: number | null;
	/** How many samples the reading was derived from. */
	sampleCount: number;
	/** Natural GCs observed during the window (min-of-window confidence signal). */
	naturalGcCount: number | null;
	waitedMs: number;
	/** True when forced-gc gave up before the heap settled. */
	timedOut: boolean;
	at: string;
}

export interface SamplerOptions {
	baseUrl: string;
	logger: EvalLogger;
	capabilities: SamplerCapabilities;
	sampleIntervalMs: number;
	/** Append every sample here as JSONL so an aborted run still yields data. */
	jsonlPath?: string;
	/** forced-gc: heap movement below this across 2 readings counts as settled. */
	stableThresholdMB?: number;
	/** forced-gc: give up waiting after this long. */
	stableMaxWaitMs?: number;
	/** min-of-window: how long a quiet window to observe. */
	quietWindowMs?: number;
}

// ---------------------------------------------------------------------------
// Sampler
// ---------------------------------------------------------------------------

export class Sampler {
	private readonly collected: MetricSample[] = [];

	private timer?: NodeJS.Timeout;

	private phase = 'init';

	private sampling = false;

	private readonly stableThresholdMB: number;

	private readonly stableMaxWaitMs: number;

	private readonly quietWindowMs: number;

	constructor(private readonly options: SamplerOptions) {
		this.stableThresholdMB = options.stableThresholdMB ?? 2;
		this.stableMaxWaitMs = options.stableMaxWaitMs ?? 60_000;
		this.quietWindowMs = options.quietWindowMs ?? 60_000;
	}

	get samples(): readonly MetricSample[] {
		return this.collected;
	}

	get method(): StabilizeMethod {
		return this.options.capabilities.gc ? 'forced-gc' : 'min-of-window';
	}

	// -- capability probe ---------------------------------------------------

	/**
	 * Discover what the target exposes. Everything downstream branches off this
	 * rather than off an operator-supplied flag, so pointing the CLI at a cloud
	 * instance degrades automatically instead of failing confusingly.
	 */
	static async probe(
		baseUrl: string,
		logger: EvalLogger,
		threadStatusProbe: () => Promise<boolean>,
	): Promise<SamplerCapabilities> {
		const metricsText = await fetchText(`${baseUrl}/metrics`);
		const metrics = metricsText?.includes('n8n_process_resident_memory_bytes') ?? false;
		const pss = metricsText?.includes('n8n_process_pss_bytes') ?? false;

		if (!metrics) {
			logger.warn(
				metricsText === undefined
					? 'GET /metrics unreachable — memory sampling unavailable'
					: 'GET /metrics reachable but has no default metrics (N8N_METRICS_INCLUDE_DEFAULT_METRICS?)',
			);
		}

		// A 200 with success:false means the endpoint exists but --expose-gc is
		// missing, so check the body rather than just the status.
		const gcBody = await fetchJson(`${baseUrl}/rest/e2e/gc`, { method: 'POST' });
		const gc = parseBody(gcBody, SuccessBody)?.success === true;
		if (gcBody !== undefined && !gc) {
			logger.warn('POST /rest/e2e/gc present but GC unavailable — start n8n with --expose-gc');
		}

		const idleBody = await fetchJson(`${baseUrl}/rest/instance-ai/test/idle`);
		const idleProbe = idleBody !== undefined;

		const instanceAiEnabled = await threadStatusProbe();

		return { metrics, pss, gc, heapSnapshot: gc, idleProbe, instanceAiEnabled };
	}

	// -- scraping -----------------------------------------------------------

	private async scrape(): Promise<PromSnapshot | undefined> {
		if (!this.options.capabilities.metrics) return undefined;
		const text = await fetchText(`${this.options.baseUrl}/metrics`);
		return text === undefined ? undefined : parsePromText(text);
	}

	/** Take one sample immediately, tagged with the current phase. */
	async sample(phase: string = this.phase): Promise<MetricSample> {
		const snapshot = await this.scrape();
		const driver = process.memoryUsage();

		const heapUsedMB = toMB(readValue(snapshot, 'n8n_nodejs_heap_size_used_bytes'));
		const heapTotalMB = toMB(readValue(snapshot, 'n8n_nodejs_heap_size_total_bytes'));
		const rssMB = toMB(readValue(snapshot, 'n8n_process_resident_memory_bytes'));
		const lagSeconds = readFirstAvailable(snapshot, EVENT_LOOP_LAG_CANDIDATES);

		const sample: MetricSample = {
			at: new Date().toISOString(),
			phase,
			heapUsedMB,
			heapTotalMB,
			externalMB: toMB(readValue(snapshot, 'n8n_nodejs_external_memory_bytes')),
			rssMB,
			pssMB: toMB(readValue(snapshot, 'n8n_process_pss_bytes')),
			nonHeapOverheadMB:
				rssMB !== null && heapTotalMB !== null ? round2(rssMB - heapTotalMB) : null,
			eventLoopLagMs: lagSeconds === null ? null : round2(lagSeconds * 1000),
			gcCount: readSum(snapshot, 'n8n_nodejs_gc_duration_seconds_count'),
			activeRuns: readValue(snapshot, 'n8n_instance_ai_active_runs'),
			runsTotal: readSum(snapshot, 'n8n_instance_ai_runs_total'),
			runsErrored: readSumWhere(snapshot, 'n8n_instance_ai_runs_total', { status: 'error' }),
			costUsd: readSum(snapshot, 'n8n_instance_ai_cost_usd_total'),
			tokensInput: readSumWhere(snapshot, 'n8n_instance_ai_tokens_total', { type: 'input' }),
			tokensOutput: readSumWhere(snapshot, 'n8n_instance_ai_tokens_total', { type: 'output' }),
			durableLogRows: readSum(snapshot, 'n8n_instance_ai_durable_log_rows_total'),
			durableLogBytes: readSum(snapshot, 'n8n_instance_ai_durable_log_bytes_total'),
			driverRssMB: round2(driver.rss / BYTES_PER_MB),
			driverHeapUsedMB: round2(driver.heapUsed / BYTES_PER_MB),
		};

		this.collected.push(sample);
		this.appendJsonl(sample);
		return sample;
	}

	private appendJsonl(sample: MetricSample): void {
		if (!this.options.jsonlPath) return;
		try {
			appendFileSync(this.options.jsonlPath, `${JSON.stringify(sample)}\n`);
		} catch (error) {
			// Losing the JSONL trail must never abort a run that has already spent money.
			this.options.logger.warn(`Failed to append sample JSONL: ${describeError(error)}`);
		}
	}

	// -- continuous sampling ------------------------------------------------

	start(phase: string): void {
		this.phase = phase;
		if (this.timer) return;
		this.timer = setInterval(() => {
			// Skip if the previous scrape is still in flight, so a slow /metrics
			// can't pile up overlapping requests.
			if (this.sampling) return;
			this.sampling = true;
			void this.sample()
				.catch((error: unknown) => {
					this.options.logger.verbose(`Sample failed: ${describeError(error)}`);
				})
				.finally(() => {
					this.sampling = false;
				});
		}, this.options.sampleIntervalMs);
		// Don't hold the process open on the sampling interval alone.
		this.timer.unref();
	}

	setPhase(phase: string): void {
		this.phase = phase;
	}

	stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	// -- stabilized readings ------------------------------------------------

	/**
	 * Produce a comparable memory reading for a phase boundary. Uses forced GC
	 * where available, otherwise the trough of a quiet window (V8's sawtooth
	 * means the minimum of a quiet window tracks the live set closely).
	 */
	async stabilize(phase: string): Promise<StabilizedReading> {
		this.setPhase(phase);
		return this.options.capabilities.gc
			? await this.stabilizeWithGc(phase)
			: await this.stabilizeWithQuietWindow(phase);
	}

	private async stabilizeWithGc(phase: string): Promise<StabilizedReading> {
		const startedAt = Date.now();
		await this.triggerGc();

		const readings: MetricSample[] = [await this.sample(phase)];
		let settledStreak = 0;
		let timedOut = true;

		while (Date.now() - startedAt < this.stableMaxWaitMs) {
			await delay(this.options.sampleIntervalMs);
			const next = await this.sample(phase);
			const previous = readings[readings.length - 1];
			readings.push(next);

			if (next.heapUsedMB === null || previous.heapUsedMB === null) continue;

			if (Math.abs(next.heapUsedMB - previous.heapUsedMB) < this.stableThresholdMB) {
				settledStreak++;
				// Two consecutive quiet deltas — one can be coincidence mid-collection.
				if (settledStreak >= 2) {
					timedOut = false;
					break;
				}
			} else {
				settledStreak = 0;
			}
		}

		if (timedOut) {
			this.options.logger.warn(
				`Heap did not settle within ${this.stableMaxWaitMs}ms in phase "${phase}" — reading is approximate`,
			);
		}

		const last = readings[readings.length - 1];
		return {
			phase,
			method: 'forced-gc',
			heapUsedMB: last.heapUsedMB,
			heapTotalMB: last.heapTotalMB,
			rssMB: last.rssMB,
			pssMB: last.pssMB,
			externalMB: last.externalMB,
			nonHeapOverheadMB: last.nonHeapOverheadMB,
			sampleCount: readings.length,
			naturalGcCount: gcDelta(readings),
			waitedMs: Date.now() - startedAt,
			timedOut,
			at: last.at,
		};
	}

	private async stabilizeWithQuietWindow(phase: string): Promise<StabilizedReading> {
		const startedAt = Date.now();
		const readings: MetricSample[] = [];

		while (Date.now() - startedAt < this.quietWindowMs) {
			readings.push(await this.sample(phase));
			await delay(this.options.sampleIntervalMs);
		}
		if (readings.length === 0) readings.push(await this.sample(phase));

		// Heap: the trough approximates the live set. RSS: median, because RSS
		// does not shrink promptly and its minimum would be misleadingly low.
		return {
			phase,
			method: 'min-of-window',
			heapUsedMB: min(readings.map((r) => r.heapUsedMB)),
			heapTotalMB: median(readings.map((r) => r.heapTotalMB)),
			rssMB: median(readings.map((r) => r.rssMB)),
			pssMB: median(readings.map((r) => r.pssMB)),
			externalMB: median(readings.map((r) => r.externalMB)),
			nonHeapOverheadMB: median(readings.map((r) => r.nonHeapOverheadMB)),
			sampleCount: readings.length,
			naturalGcCount: gcDelta(readings),
			waitedMs: Date.now() - startedAt,
			timedOut: false,
			at: readings[readings.length - 1].at,
		};
	}

	// -- server-side helpers ------------------------------------------------

	async triggerGc(): Promise<boolean> {
		if (!this.options.capabilities.gc) return false;
		const body = await fetchJson(`${this.options.baseUrl}/rest/e2e/gc`, { method: 'POST' });
		return parseBody(body, SuccessBody)?.success === true;
	}

	/**
	 * Ask the server to write a heap snapshot and stream it back locally.
	 * Returns the local path, or undefined when unavailable.
	 */
	async takeHeapSnapshot(label: string, outDir: string): Promise<string | undefined> {
		if (!this.options.capabilities.heapSnapshot) return undefined;

		const body = await fetchJson(`${this.options.baseUrl}/rest/e2e/heap-snapshot`, {
			method: 'POST',
		});
		const filename = parseBody(body, HeapSnapshotBody)?.filePath;
		if (!filename) {
			this.options.logger.warn(`Heap snapshot request failed for "${label}"`);
			return undefined;
		}

		const response = await fetchRaw(`${this.options.baseUrl}/rest/e2e/heap-snapshot/${filename}`);
		if (!response?.ok) {
			this.options.logger.warn(`Heap snapshot download failed for "${label}"`);
			return undefined;
		}

		const localPath = join(outDir, `${label}-${randomUUID().slice(0, 8)}.heapsnapshot`);
		await writeFile(localPath, Buffer.from(await response.arrayBuffer()));
		this.options.logger.info(`Heap snapshot written: ${localPath}`);
		return localPath;
	}

	/**
	 * Wait until no Instance AI run is active. Uses the /test/idle probe when
	 * present, otherwise requires active_runs to read 0 on consecutive scrapes
	 * (one zero can land between a finish and a resume).
	 */
	async waitForIdle(timeoutMs: number): Promise<boolean> {
		const deadline = Date.now() + timeoutMs;
		let zeroStreak = 0;

		while (Date.now() < deadline) {
			if (this.options.capabilities.idleProbe) {
				const body = await fetchJson(`${this.options.baseUrl}/rest/instance-ai/test/idle`);
				if (parseBody(body, IdleBody)?.idle === true) return true;
			} else {
				const sample = await this.sample();
				if (sample.activeRuns === 0) {
					zeroStreak++;
					if (zeroStreak >= 3) return true;
				} else {
					zeroStreak = 0;
				}
			}
			await delay(this.options.sampleIntervalMs);
		}

		this.options.logger.warn(`Instance AI did not go idle within ${timeoutMs}ms`);
		return false;
	}

	/** Highest cost seen so far, for the spend kill-switch. */
	latestCostUsd(): number | null {
		for (let i = this.collected.length - 1; i >= 0; i--) {
			const cost = this.collected[i].costUsd;
			if (cost !== null) return cost;
		}
		return null;
	}

	/** Peak concurrent runs observed — validates that the ramp produced a plateau. */
	maxActiveRuns(): number | null {
		const values = this.collected
			.map((sample) => sample.activeRuns)
			.filter((value): value is number => value !== null);
		return values.length === 0 ? null : Math.max(...values);
	}
}

// ---------------------------------------------------------------------------
// HTTP helpers
//
// These endpoints are all `skipAuth`, so no cookie plumbing is needed. Every
// helper swallows transport errors into `undefined`: an unreachable probe is a
// capability answer, not a crash.
// ---------------------------------------------------------------------------

async function fetchRaw(url: string, init?: RequestInit): Promise<Response | undefined> {
	try {
		return await fetch(url, init);
	} catch {
		return undefined;
	}
}

async function fetchText(url: string, init?: RequestInit): Promise<string | undefined> {
	const response = await fetchRaw(url, init);
	if (!response?.ok) return undefined;
	try {
		return await response.text();
	} catch {
		return undefined;
	}
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
	const text = await fetchText(url, init);
	if (text === undefined) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

// -- response readers --------------------------------------------------------
//
// Responses are Zod-validated rather than cast, so a shape change on the n8n
// side reads as "capability absent" instead of a runtime TypeError mid-run.

const SuccessBody = z.object({ success: z.boolean() });
const HeapSnapshotBody = z.object({ filePath: z.string().min(1) });
const IdleBody = z.object({ idle: z.boolean() });

/** n8n wraps controller returns as `{ data: ... }`; SSE/raw routes don't. */
function unwrapData(body: unknown): unknown {
	const envelope = z.object({ data: z.unknown() }).safeParse(body);
	return envelope.success ? envelope.data.data : body;
}

function parseBody<T>(body: unknown, schema: z.ZodType<T>): T | undefined {
	const result = schema.safeParse(unwrapData(body));
	return result.success ? result.data : undefined;
}

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

function toMB(bytes: number | null): number | null {
	return bytes === null ? null : round2(bytes / BYTES_PER_MB);
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

function present(values: Array<number | null>): number[] {
	return values.filter((value): value is number => value !== null);
}

function min(values: Array<number | null>): number | null {
	const available = present(values);
	return available.length === 0 ? null : Math.min(...available);
}

function median(values: Array<number | null>): number | null {
	const available = present(values).sort((a, b) => a - b);
	if (available.length === 0) return null;
	const mid = Math.floor(available.length / 2);
	return available.length % 2 === 0
		? round2((available[mid - 1] + available[mid]) / 2)
		: available[mid];
}

/** GC count observed across a window — confidence signal for min-of-window. */
function gcDelta(readings: MetricSample[]): number | null {
	const counts = present(readings.map((reading) => reading.gcCount));
	if (counts.length < 2) return null;
	return counts[counts.length - 1] - counts[0];
}

export function describeError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export async function delay(ms: number): Promise<void> {
	if (ms <= 0) return;
	await new Promise((resolve) => setTimeout(resolve, ms));
}
