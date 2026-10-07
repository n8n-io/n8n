// Experiment cleanup: remove this folder with 126_quickjs_expression_shadow.
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { isRecord } from '@n8n/utils/is-record';
import { Expression } from 'n8n-workflow';
import type { ShadowEvaluator } from 'n8n-workflow';

import { QUICKJS_EXPRESSION_SHADOW_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

import { LATENCY_BUCKET_BOUNDS_MS, QuickJsExpressionShadow } from './shadowRunner';
import type { ShadowReport } from './shadowRunner';

export const DEFAULT_SAMPLE_RATE = 10;
export const DEFAULT_TIMEOUT_MS = 100;
export const REPORT_INTERVAL_MS = 5 * 60 * 1000;

const MIN_TIMEOUT_MS = 10;
const MAX_TIMEOUT_MS = 5000;

let started = false;

export interface ShadowSettings {
	sampleRate: number;
	timeoutMs: number;
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

	const postHogStore = usePostHog();
	await postHogStore.waitForFeatureFlags();
	if (!postHogStore.isFeatureEnabled(QUICKJS_EXPRESSION_SHADOW_EXPERIMENT.name)) return;

	// Checked again after the wait, so two calls cannot both start a run.
	if (started) return;
	started = true;

	const settings = readShadowSettings(
		postHogStore.getFeatureFlagPayload(QUICKJS_EXPRESSION_SHADOW_EXPERIMENT.name),
	);
	const telemetry = useTelemetry();
	const initStart = performance.now();
	let initDurationMs = 0;

	const send = (initStatus: 'ready' | 'failed', report: ShadowReport) => {
		telemetry.track(TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED, {
			init_status: initStatus,
			init_duration_ms: initDurationMs,
			sample_rate: settings.sampleRate,
			timeout_ms: settings.timeoutMs,
			latency_bucket_bounds_ms: LATENCY_BUCKET_BOUNDS_MS,
			...report,
		});
	};

	let evaluator: ShadowEvaluator;
	try {
		const { default: runtimeBundle } = await import(
			'@n8n/expression-runtime/runtime-bundle.iife.js?raw'
		);
		evaluator = await Expression.createQuickJsShadowEvaluator({
			bridgeTimeout: settings.timeoutMs,
			bridgeMemoryLimit: 128,
			maxCodeCacheSize: 1024,
			runtimeBundle,
		});
	} catch {
		// A policy that blocks WASM ends here; the editor keeps working on legacy.
		initDurationMs = performance.now() - initStart;
		send('failed', emptyReport());
		return;
	}
	initDurationMs = performance.now() - initStart;

	// The main engine may have switched while the shadow engine loaded.
	if (Expression.getActiveImplementation() !== 'legacy') {
		await evaluator.dispose().catch(() => {});
		return;
	}
	const shadow = new QuickJsExpressionShadow({ evaluator, sampleRate: settings.sampleRate });
	Expression.setShadowRunner(shadow);

	const flush = () => {
		const report = shadow.takeReport();
		if (report) send('ready', report);
	};
	setInterval(flush, REPORT_INTERVAL_MS);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') flush();
	});
	window.addEventListener('pagehide', flush);
}

function emptyReport(): ShadowReport {
	return {
		evaluations: 0,
		same: 0,
		different: 0,
		unchecked: 0,
		legacy_ok_quickjs_error: 0,
		legacy_error_quickjs_ok: 0,
		both_error: 0,
		legacy_latency_buckets: [],
		quickjs_latency_buckets: [],
		mismatches: [],
	};
}

/** For tests: forget that a shadow run started. */
export function resetQuickJsExpressionShadow() {
	started = false;
	Expression.setShadowRunner(undefined);
}
