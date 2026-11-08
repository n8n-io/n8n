// Experiment cleanup: remove this folder with 126_quickjs_expression_shadow.
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { isRecord } from '@n8n/utils/is-record';
import { Expression } from 'n8n-workflow';
import type { ShadowEvaluator } from 'n8n-workflow';

import { QUICKJS_EXPRESSION_SHADOW_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

import { emptyReport, LATENCY_BUCKET_BOUNDS_MS, QuickJsExpressionShadow } from './shadowRunner';
import type { ShadowReport } from './shadowRunner';

export const DEFAULT_SAMPLE_RATE = 10;
export const DEFAULT_TIMEOUT_MS = 100;
export const REPORT_INTERVAL_MS = 5 * 60 * 1000;
export const IDLE_START_TIMEOUT_MS = 10_000;

const MIN_TIMEOUT_MS = 10;
// A shadow run blocks the main thread for up to this long, so keep it short.
const MAX_TIMEOUT_MS = 500;

let started = false;

// Counts logouts, so a start that finishes after one does not install itself.
let session = 0;

let stopActiveRun: (() => void) | undefined;

/**
 * When the shadow engine starts.
 * - `boot`: at once, while the editor loads.
 * - `idle`: later, after the editor start, when the browser has no other work to do.
 * - `boot_only`: at once, because the browser cannot wait for idle time.
 */
type StartVariant = 'boot' | 'idle' | 'boot_only';

interface StartupTimings {
	bundleImportMs?: number;
	wasmReadyMs?: number;
	bridgeReadyMs?: number;
}

/**
 * A/B test: each page load picks `boot` or `idle` at random, half and half.
 * The reports then tell if a later start makes the engine start faster.
 * Safari has no `requestIdleCallback`, so it gets `boot_only` and stays out of the test.
 */
function pickStartVariant(): StartVariant {
	if (typeof window.requestIdleCallback !== 'function') {
		return 'boot_only';
	}
	return Math.random() < 0.5 ? 'idle' : 'boot';
}

let markEditorReady: () => void = () => {};

const createEditorReady = async () =>
	await new Promise<void>((resolve) => {
		markEditorReady = resolve;
	});

// Resolves when the editor finishes its start after login. A logout replaces it.
let editorReady = createEditorReady();

/** Tell the shadow run that the editor finished its start after login. */
export function notifyQuickJsShadowEditorReady() {
	markEditorReady();
}

/** Wait until the editor finishes its start after login, then until the browser is idle. */
async function waitForEditorThenIdle(): Promise<void> {
	// requestIdleCallback alone can fire while the startup requests still run.
	// The timeout ends the wait when the editor start fails or does not end.
	let editorTimeout: ReturnType<typeof setTimeout> | undefined;
	await Promise.race([
		editorReady,
		new Promise<void>((resolve) => {
			editorTimeout = setTimeout(resolve, IDLE_START_TIMEOUT_MS);
		}),
	]);
	clearTimeout(editorTimeout);
	await new Promise<void>((resolve) => {
		window.requestIdleCallback(() => resolve(), { timeout: IDLE_START_TIMEOUT_MS });
	});
}

/** Watch the tab visibility. The returned function stops the watch and tells whether the tab stayed visible. */
function watchVisibility(): () => boolean {
	let visible = document.visibilityState === 'visible';
	const onVisibilityChange = () => {
		if (document.visibilityState !== 'visible') {
			visible = false;
		}
	};
	document.addEventListener('visibilitychange', onVisibilityChange);
	return () => {
		document.removeEventListener('visibilitychange', onVisibilityChange);
		return visible;
	};
}

type FileSource = 'cache' | 'revalidated' | 'network';

const QUICKJS_WASM_FILE = /\/emscripten-module[^/]*\.wasm(\?|$)/;

function fileSource(entry: PerformanceResourceTiming): FileSource {
	if (entry.transferSize === 0) {
		return 'cache';
	}
	return entry.transferSize < entry.encodedBodySize ? 'revalidated' : 'network';
}

function isQuickJsWasm(entry: PerformanceEntry): entry is PerformanceResourceTiming {
	return 'transferSize' in entry && QUICKJS_WASM_FILE.test(entry.name);
}

/**
 * Watch the files that the page loads from now on.
 *
 * The returned function stops the watch and tells where the browser got the QuickJS WASM file:
 * - from its cache
 * - from its cache after a check with the server
 * - or from the network.
 * `undefined` when the page did not load the file, or the browser has no size for it.
 */
function watchWasmSource(): () => FileSource | undefined {
	// An observer, not `performance.getEntriesByType()`: the browser drops entries
	// from that list once it holds 250, but an observer still gets them.
	const entries: PerformanceResourceTiming[] = [];
	const collect = (list: PerformanceEntry[]) => entries.push(...list.filter(isQuickJsWasm));
	const observer = new PerformanceObserver((list) => collect(list.getEntries()));
	observer.observe({ type: 'resource' });
	return () => {
		collect(observer.takeRecords());
		observer.disconnect();
		const entry = entries.at(-1);
		// A file from another origin without `Timing-Allow-Origin` reports every size as 0.
		return entry && entry.encodedBodySize > 0 ? fileSource(entry) : undefined;
	};
}

export interface ShadowSettings {
	sampleRate: number;
	timeoutMs: number;
}

// Every report field, with the telemetry prefix. A field added to the report
// fails the typecheck below until it is also sent.
type PrefixedReport = { [K in keyof ShadowReport as `quickjs_fe_${K}`]: ShadowReport[K] };

function toTelemetryProperties(report: ShadowReport): PrefixedReport {
	return {
		quickjs_fe_evaluations: report.evaluations,
		quickjs_fe_same: report.same,
		quickjs_fe_different: report.different,
		quickjs_fe_unchecked: report.unchecked,
		quickjs_fe_legacy_ok_quickjs_error: report.legacy_ok_quickjs_error,
		quickjs_fe_legacy_error_quickjs_ok: report.legacy_error_quickjs_ok,
		quickjs_fe_both_error: report.both_error,
		quickjs_fe_legacy_missing_input: report.legacy_missing_input,
		quickjs_fe_quickjs_timeouts: report.quickjs_timeouts,
		quickjs_fe_legacy_latency_buckets: report.legacy_latency_buckets,
		quickjs_fe_quickjs_latency_buckets: report.quickjs_latency_buckets,
		quickjs_fe_mismatches: report.mismatches,
	};
}

/** Read the shadow settings from the flag payload, so they change without a release. */
export function readShadowSettings(payload: unknown): ShadowSettings {
	const settings: Record<string, unknown> = isRecord(payload) ? payload : {};
	const { sampleRate, timeoutMs } = settings;
	return {
		sampleRate:
			typeof sampleRate === 'number' && Number.isFinite(sampleRate) && sampleRate >= 1
				? Math.floor(sampleRate)
				: DEFAULT_SAMPLE_RATE,
		timeoutMs:
			typeof timeoutMs === 'number' && timeoutMs >= MIN_TIMEOUT_MS && timeoutMs <= MAX_TIMEOUT_MS
				? timeoutMs
				: DEFAULT_TIMEOUT_MS,
	};
}

/**
 * Run the QuickJS engine next to the legacy engine on a sample of expressions,
 * and report how they compare. Only on Cloud, only while the legacy engine is
 * active, and only when the PostHog flag is on. The legacy engine still gives
 * every result.
 */
export async function initializeQuickJsExpressionShadow(): Promise<void> {
	if (started) return;

	const settingsStore = useSettingsStore();
	if (!settingsStore.isCloudDeployment) return;
	if (Expression.getActiveImplementation() !== 'legacy') return;

	// Read before the wait, so a logout during the wait stops this start.
	const startSession = session;
	const postHogStore = usePostHog();
	await postHogStore.waitForFeatureFlags();
	if (startSession !== session) return;
	if (!postHogStore.isFeatureEnabled(QUICKJS_EXPRESSION_SHADOW_EXPERIMENT.name)) return;

	// Checked again after the wait, so two calls cannot both start a run.
	if (started) return;
	started = true;

	const settings = readShadowSettings(
		postHogStore.getFeatureFlagPayload(QUICKJS_EXPRESSION_SHADOW_EXPERIMENT.name),
	);
	const startVariant = pickStartVariant();
	// Started before the idle wait, because a hidden tab also makes that wait longer.
	const stopVisibilityWatch = watchVisibility();
	let idleWaitMs: number | undefined;
	if (startVariant === 'idle') {
		const waitStart = performance.now();
		await waitForEditorThenIdle();
		idleWaitMs = performance.now() - waitStart;
		if (startSession !== session) {
			stopVisibilityWatch();
			return;
		}
	}

	const telemetry = useTelemetry();
	const timings: StartupTimings = {};
	let initDurationMs = 0;
	let startupVisible = false;
	let wasmSource: FileSource | undefined;

	const send = (initStatus: 'ready' | 'failed', report: ShadowReport, startupReport = false) => {
		telemetry.track(TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED, {
			quickjs_fe_init_status: initStatus,
			quickjs_fe_startup_report: startupReport,
			quickjs_fe_init_duration_ms: initDurationMs,
			quickjs_fe_start_variant: startVariant,
			quickjs_fe_idle_wait_ms: idleWaitMs,
			quickjs_fe_bundle_import_ms: timings.bundleImportMs,
			quickjs_fe_wasm_ready_ms: timings.wasmReadyMs,
			quickjs_fe_bridge_ready_ms: timings.bridgeReadyMs,
			quickjs_fe_startup_visible: startupVisible,
			quickjs_fe_wasm_source: wasmSource,
			quickjs_fe_sample_rate: settings.sampleRate,
			quickjs_fe_timeout_ms: settings.timeoutMs,
			quickjs_fe_latency_bucket_bounds_ms: LATENCY_BUCKET_BOUNDS_MS,
			...toTelemetryProperties(report),
		});
	};

	const timed = async <T>(step: keyof StartupTimings, run: () => Promise<T>): Promise<T> => {
		const stepStart = performance.now();
		const result = await run();
		timings[step] = performance.now() - stepStart;
		return result;
	};

	const stopWasmSourceWatch = watchWasmSource();
	const initStart = performance.now();
	let evaluator: ShadowEvaluator;
	try {
		const { default: runtimeBundle } = await timed(
			'bundleImportMs',
			async () => await import('@n8n/expression-runtime/runtime-bundle.iife.js?raw'),
		);
		await timed('wasmReadyMs', async () => await Expression.loadQuickJsWasm());
		evaluator = await timed(
			'bridgeReadyMs',
			async () =>
				await Expression.createQuickJsShadowEvaluator({
					bridgeTimeout: settings.timeoutMs,
					bridgeMemoryLimit: 128,
					maxCodeCacheSize: 1024,
					runtimeBundle,
				}),
		);
	} catch {
		// A policy that blocks WASM ends here; the editor keeps working on legacy.
		initDurationMs = performance.now() - initStart;
		startupVisible = stopVisibilityWatch();
		wasmSource = stopWasmSourceWatch();
		if (startSession === session) send('failed', emptyReport(), true);
		return;
	}
	startupVisible = stopVisibilityWatch();
	wasmSource = stopWasmSourceWatch();
	initDurationMs = performance.now() - initStart;

	// The user may have logged out, or the main engine switched, while the shadow engine loaded.
	if (startSession !== session || Expression.getActiveImplementation() !== 'legacy') {
		await evaluator.dispose().catch(() => {});
		return;
	}
	const shadow = new QuickJsExpressionShadow({ evaluator, sampleRate: settings.sampleRate });
	Expression.setShadowRunner(shadow);
	// Sent at once, so a start without sampled expressions is still in the startup data.
	send('ready', emptyReport(), true);

	const flush = () => {
		const report = shadow.takeReport();
		if (report) send('ready', report);
	};
	const onVisibilityChange = () => {
		if (document.visibilityState === 'hidden') flush();
	};
	const interval = setInterval(flush, REPORT_INTERVAL_MS);
	document.addEventListener('visibilitychange', onVisibilityChange);
	window.addEventListener('pagehide', flush);

	stopActiveRun = () => {
		Expression.setShadowRunner(undefined);
		flush();
		clearInterval(interval);
		document.removeEventListener('visibilitychange', onVisibilityChange);
		window.removeEventListener('pagehide', flush);
		void evaluator.dispose().catch(() => {});
	};
}

/**
 * Stop the shadow run and send what it collected. Call it on logout, before
 * telemetry forgets the user, so the last report keeps its instance and user.
 */
export function stopQuickJsExpressionShadow() {
	session += 1;
	started = false;
	markEditorReady();
	editorReady = createEditorReady();
	stopActiveRun?.();
	stopActiveRun = undefined;
}
