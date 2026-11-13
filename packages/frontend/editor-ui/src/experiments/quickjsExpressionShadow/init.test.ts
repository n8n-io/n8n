import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { ExpressionShadowContext, ExpressionShadowRunner } from 'n8n-workflow';
import { Expression } from 'n8n-workflow';

import {
	DEFAULT_SAMPLE_RATE,
	DEFAULT_TIMEOUT_MS,
	initializeQuickJsExpressionShadow,
	preloadQuickJsExpressionShadow,
	readShadowSettings,
	stopQuickJsExpressionShadow,
} from './init';

const { settingsStore, postHogStore, track, evaluator } = vi.hoisted(() => ({
	settingsStore: { isCloudDeployment: true },
	postHogStore: {
		waitForFeatureFlags: vi.fn(async () => {}),
		isFeatureEnabled: vi.fn(() => true),
		getFeatureFlagPayload: vi.fn((): unknown => undefined),
	},
	track: vi.fn(),
	evaluator: {
		evaluate: vi.fn(() => ({ ok: true as const, value: 1 })),
		dispose: vi.fn(async () => {}),
	},
}));

vi.mock('n8n-workflow', async (importOriginal) => ({
	...(await importOriginal<typeof import('n8n-workflow')>()),
	Expression: {
		getActiveImplementation: vi.fn(() => 'legacy'),
		loadQuickJsWasm: vi.fn(async () => {}),
		createQuickJsShadowEvaluator: vi.fn(async () => evaluator),
		setShadowRunner: vi.fn(),
	},
}));
vi.mock('@n8n/stores/settings.store', () => ({ useSettingsStore: () => settingsStore }));
vi.mock('@/app/stores/posthog.store', () => ({ usePostHog: () => postHogStore }));
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));
vi.mock('@n8n/expression-runtime/runtime-bundle.iife.js?raw', () => ({
	default: '/* runtime bundle */',
}));

class FakePerformanceObserver {
	static last: FakePerformanceObserver | undefined;

	queued: PerformanceEntry[] = [];

	observe = vi.fn();

	disconnect = vi.fn();

	constructor(readonly callback: (list: { getEntries: () => PerformanceEntry[] }) => void) {
		FakePerformanceObserver.last = this;
	}

	deliver(...entries: PerformanceEntry[]) {
		this.callback({ getEntries: () => entries });
	}

	takeRecords() {
		const records = this.queued;
		this.queued = [];
		return records;
	}
}

const installedRunner = () =>
	vi.mocked(Expression.setShadowRunner).mock.calls.at(-1)?.[0] as ExpressionShadowRunner;

describe('initializeQuickJsExpressionShadow', () => {
	beforeEach(() => {
		stopQuickJsExpressionShadow();
		vi.clearAllMocks();
		settingsStore.isCloudDeployment = true;
		postHogStore.isFeatureEnabled.mockReturnValue(true);
		postHogStore.getFeatureFlagPayload.mockReturnValue(undefined);
		vi.mocked(Expression.getActiveImplementation).mockReturnValue('legacy');
		vi.mocked(Expression.loadQuickJsWasm).mockResolvedValue(undefined);
		vi.mocked(Expression.createQuickJsShadowEvaluator).mockResolvedValue(evaluator);
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		vi.stubGlobal('PerformanceObserver', FakePerformanceObserver);
	});

	it('starts the shadow run on Cloud when the flag is on', async () => {
		await initializeQuickJsExpressionShadow();

		expect(Expression.createQuickJsShadowEvaluator).toHaveBeenCalledWith(
			expect.objectContaining({
				bridgeTimeout: DEFAULT_TIMEOUT_MS,
				runtimeBundle: '/* runtime bundle */',
			}),
		);
		expect(Expression.setShadowRunner).toHaveBeenCalledTimes(1);
	});

	it('does nothing on a self-hosted instance, whatever the flag says', async () => {
		settingsStore.isCloudDeployment = false;

		await initializeQuickJsExpressionShadow();

		expect(postHogStore.waitForFeatureFlags).not.toHaveBeenCalled();
		expect(Expression.createQuickJsShadowEvaluator).not.toHaveBeenCalled();
	});

	it('does nothing when the flag is off', async () => {
		postHogStore.isFeatureEnabled.mockReturnValue(false);

		await initializeQuickJsExpressionShadow();

		expect(Expression.createQuickJsShadowEvaluator).not.toHaveBeenCalled();
	});

	it('does nothing when QuickJS is already the main engine', async () => {
		vi.mocked(Expression.getActiveImplementation).mockReturnValue('quickjs');

		await initializeQuickJsExpressionShadow();

		expect(Expression.createQuickJsShadowEvaluator).not.toHaveBeenCalled();
	});

	it('drops the shadow engine when QuickJS becomes the main engine while it loads', async () => {
		vi.mocked(Expression.createQuickJsShadowEvaluator).mockImplementation(async () => {
			vi.mocked(Expression.getActiveImplementation).mockReturnValue('quickjs');
			return evaluator;
		});

		await initializeQuickJsExpressionShadow();

		expect(evaluator.dispose).toHaveBeenCalledTimes(1);
		expect(Expression.setShadowRunner).not.toHaveBeenCalled();
	});

	it('drops the shadow engine when the user logs out while it loads', async () => {
		vi.mocked(Expression.createQuickJsShadowEvaluator).mockImplementation(async () => {
			stopQuickJsExpressionShadow();
			return evaluator;
		});

		await initializeQuickJsExpressionShadow();

		expect(evaluator.dispose).toHaveBeenCalledTimes(1);
		expect(Expression.setShadowRunner).not.toHaveBeenCalledWith(expect.anything());
	});

	it('does not start when the user logs out while the flags load', async () => {
		postHogStore.waitForFeatureFlags.mockImplementationOnce(async () => {
			stopQuickJsExpressionShadow();
		});

		await initializeQuickJsExpressionShadow();

		expect(Expression.createQuickJsShadowEvaluator).not.toHaveBeenCalled();
	});

	it('sends the collected results and stops on logout', async () => {
		postHogStore.getFeatureFlagPayload.mockReturnValue({ sampleRate: 1 });
		await initializeQuickJsExpressionShadow();
		const finish = installedRunner().beforeLegacy({
			expression: '{{ 1 }}',
			source: '{{ 1 }}',
			data: {} as ExpressionShadowContext['data'],
			timezone: 'UTC',
		});
		finish?.({ ok: true, value: 1 });

		stopQuickJsExpressionShadow();

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED,
			expect.objectContaining({ quickjs_fe_evaluations: 1 }),
		);
		expect(Expression.setShadowRunner).toHaveBeenLastCalledWith(undefined);
		expect(evaluator.dispose).toHaveBeenCalledTimes(1);

		// The next login can start a new run.
		await initializeQuickJsExpressionShadow();
		expect(Expression.createQuickJsShadowEvaluator).toHaveBeenCalledTimes(2);
	});

	it('starts only once', async () => {
		await Promise.all([initializeQuickJsExpressionShadow(), initializeQuickJsExpressionShadow()]);
		await initializeQuickJsExpressionShadow();

		expect(Expression.createQuickJsShadowEvaluator).toHaveBeenCalledTimes(1);
	});

	it('reports a failed start and leaves the legacy engine alone', async () => {
		vi.mocked(Expression.createQuickJsShadowEvaluator).mockRejectedValue(new Error('no wasm'));

		await initializeQuickJsExpressionShadow();

		expect(Expression.setShadowRunner).not.toHaveBeenCalled();
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED,
			expect.objectContaining({
				quickjs_fe_init_status: 'failed',
				quickjs_fe_startup_report: true,
				quickjs_fe_evaluations: 0,
			}),
		);
	});

	it('sends one startup report when the engine is ready, before any expression runs', async () => {
		await initializeQuickJsExpressionShadow();
		stopQuickJsExpressionShadow();

		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED,
			expect.objectContaining({
				quickjs_fe_event_version: '2',
				quickjs_fe_init_status: 'ready',
				quickjs_fe_startup_report: true,
				quickjs_fe_evaluations: 0,
				quickjs_fe_init_duration_ms: expect.any(Number),
			}),
		);
	});

	it('sends the collected results when the tab is hidden', async () => {
		postHogStore.getFeatureFlagPayload.mockReturnValue({ sampleRate: 1, timeoutMs: 50 });
		await initializeQuickJsExpressionShadow();

		const finish = installedRunner().beforeLegacy({
			expression: '{{ 1 }}',
			source: '{{ 1 }}',
			data: {} as ExpressionShadowContext['data'],
			timezone: 'UTC',
		});
		finish?.({ ok: true, value: 1 });

		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
		document.dispatchEvent(new Event('visibilitychange'));

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED,
			expect.objectContaining({
				quickjs_fe_init_status: 'ready',
				quickjs_fe_sample_rate: 1,
				quickjs_fe_timeout_ms: 50,
				quickjs_fe_startup_report: false,
				quickjs_fe_evaluations: 1,
				quickjs_fe_same: 1,
				quickjs_fe_legacy_missing_input: 0,
			}),
		);
	});

	it('sends the startup step durations and the visibility', async () => {
		postHogStore.getFeatureFlagPayload.mockReturnValue({ sampleRate: 1 });
		await initializeQuickJsExpressionShadow();
		installedRunner().beforeLegacy({
			expression: '{{ 1 }}',
			source: '{{ 1 }}',
			data: {} as ExpressionShadowContext['data'],
			timezone: 'UTC',
		})?.({ ok: true, value: 1 });

		stopQuickJsExpressionShadow();

		expect(Expression.loadQuickJsWasm).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED,
			expect.objectContaining({
				quickjs_fe_bundle_import_ms: expect.any(Number),
				quickjs_fe_wasm_ready_ms: expect.any(Number),
				quickjs_fe_bridge_ready_ms: expect.any(Number),
				quickjs_fe_startup_visible: true,
			}),
		);
	});

	it('reports a tab that was hidden during the startup', async () => {
		const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
		vi.mocked(Expression.loadQuickJsWasm).mockImplementation(async () => {
			visibility.mockReturnValue('hidden');
			document.dispatchEvent(new Event('visibilitychange'));
			visibility.mockReturnValue('visible');
			document.dispatchEvent(new Event('visibilitychange'));
		});
		vi.mocked(Expression.createQuickJsShadowEvaluator).mockRejectedValue(new Error('no wasm'));

		await initializeQuickJsExpressionShadow();

		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED,
			expect.objectContaining({ quickjs_fe_startup_visible: false }),
		);
	});

	it('reports only the steps that finished when the start fails', async () => {
		vi.mocked(Expression.loadQuickJsWasm).mockRejectedValue(new Error('no wasm'));

		await initializeQuickJsExpressionShadow();

		const properties = track.mock.calls.at(-1)?.[1] as Record<string, unknown>;
		expect(properties).toMatchObject({
			quickjs_fe_init_status: 'failed',
			quickjs_fe_bundle_import_ms: expect.any(Number),
		});
		expect(properties.quickjs_fe_wasm_ready_ms).toBeUndefined();
		expect(properties.quickjs_fe_bridge_ready_ms).toBeUndefined();
		expect(Expression.createQuickJsShadowEvaluator).not.toHaveBeenCalled();
	});

	describe('WASM file source', () => {
		const resource = (name: string, transferSize: number, encodedBodySize: number) =>
			({ name, transferSize, encodedBodySize }) as PerformanceResourceTiming;

		const reportedSource = async (...entries: PerformanceResourceTiming[]) => {
			vi.mocked(Expression.loadQuickJsWasm).mockImplementation(async () => {
				FakePerformanceObserver.last?.deliver(...entries);
			});
			vi.mocked(Expression.createQuickJsShadowEvaluator).mockRejectedValue(new Error('stop'));
			await initializeQuickJsExpressionShadow();
			const properties = track.mock.calls.at(-1)?.[1] as Record<string, unknown>;
			return properties.quickjs_fe_wasm_source;
		};

		const wasmUrl = 'https://acme.app.n8n.cloud/assets/emscripten-module-B1g2L2eS.wasm';

		it('reports a file from the browser cache', async () => {
			expect(await reportedSource(resource(wasmUrl, 0, 503_000))).toBe('cache');
		});

		it('reports a cached file that the server confirmed', async () => {
			expect(await reportedSource(resource(wasmUrl, 300, 503_000))).toBe('revalidated');
		});

		it('reports a file from the network', async () => {
			expect(await reportedSource(resource(wasmUrl, 503_300, 503_000))).toBe('network');
		});

		it('ignores other WASM files', async () => {
			const other = resource('https://acme.app.n8n.cloud/assets/wa-sqlite-DDTbX34h.wasm', 0, 1);
			expect(await reportedSource(other)).toBeUndefined();
		});

		it('reports nothing when the browser hides the file sizes', async () => {
			expect(await reportedSource(resource(wasmUrl, 0, 0))).toBeUndefined();
		});

		it('reads an entry that the observer has not delivered yet, then stops watching', async () => {
			vi.mocked(Expression.loadQuickJsWasm).mockImplementation(async () => {
				FakePerformanceObserver.last?.queued.push(resource(wasmUrl, 0, 503_000));
			});
			vi.mocked(Expression.createQuickJsShadowEvaluator).mockRejectedValue(new Error('stop'));

			await initializeQuickJsExpressionShadow();

			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED,
				expect.objectContaining({ quickjs_fe_wasm_source: 'cache' }),
			);
			expect(FakePerformanceObserver.last?.observe).toHaveBeenCalledWith({ type: 'resource' });
			expect(FakePerformanceObserver.last?.disconnect).toHaveBeenCalled();
		});
	});

	describe('preload', () => {
		const flagOn = { '126_quickjs_expression_shadow': true };

		const resource = (transferSize: number) =>
			({
				name: 'https://acme.app.n8n.cloud/assets/emscripten-module-B1g2L2eS.wasm',
				transferSize,
				encodedBodySize: 503_000,
			}) as PerformanceResourceTiming;

		it('loads the WASM file before the shadow run starts', () => {
			preloadQuickJsExpressionShadow(flagOn);

			expect(Expression.loadQuickJsWasm).toHaveBeenCalledTimes(1);
			expect(Expression.createQuickJsShadowEvaluator).not.toHaveBeenCalled();
		});

		it('does nothing when the flag is off', () => {
			preloadQuickJsExpressionShadow({ '126_quickjs_expression_shadow': false });
			preloadQuickJsExpressionShadow(undefined);

			expect(Expression.loadQuickJsWasm).not.toHaveBeenCalled();
		});

		it('preloads and starts without waiting for an idle callback', async () => {
			vi.stubGlobal('requestIdleCallback', vi.fn());
			vi.spyOn(Math, 'random').mockReturnValue(0);

			preloadQuickJsExpressionShadow(flagOn);
			expect(Expression.loadQuickJsWasm).toHaveBeenCalledTimes(1);

			await initializeQuickJsExpressionShadow();

			expect(Expression.setShadowRunner).toHaveBeenCalledWith(expect.anything());
			expect(window.requestIdleCallback).not.toHaveBeenCalled();
		});

		it('loads the files only once when it is called again', () => {
			preloadQuickJsExpressionShadow(flagOn);
			preloadQuickJsExpressionShadow(flagOn);

			expect(Expression.loadQuickJsWasm).toHaveBeenCalledTimes(1);
		});

		it('reports the source of a WASM file that loaded before the start', async () => {
			preloadQuickJsExpressionShadow(flagOn);
			const preloadObserver = FakePerformanceObserver.last;
			preloadObserver?.deliver(resource(503_300));
			vi.mocked(Expression.createQuickJsShadowEvaluator).mockRejectedValue(new Error('stop'));

			await initializeQuickJsExpressionShadow();

			expect(FakePerformanceObserver.last).toBe(preloadObserver);
			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED,
				expect.objectContaining({ quickjs_fe_wasm_source: 'network' }),
			);
		});

		it.each([
			['a start after a preload', true],
			['a start without a preload', false],
		])('reports %s', async (_, preloaded) => {
			if (preloaded) {
				preloadQuickJsExpressionShadow(flagOn);
			}

			await initializeQuickJsExpressionShadow();

			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED,
				expect.objectContaining({ quickjs_fe_preloaded: preloaded }),
			);
		});

		it.each([
			['the instance is not on Cloud', () => (settingsStore.isCloudDeployment = false)],
			[
				'QuickJS is the main engine',
				() => vi.mocked(Expression.getActiveImplementation).mockReturnValue('quickjs'),
			],
			['PostHog has the flag off', () => postHogStore.isFeatureEnabled.mockReturnValue(false)],
		])('stops the watch of the WASM file when %s', async (_, preventStart) => {
			preloadQuickJsExpressionShadow(flagOn);
			preventStart();

			await initializeQuickJsExpressionShadow();

			expect(FakePerformanceObserver.last?.disconnect).toHaveBeenCalledTimes(1);
		});

		it('does not throw when the browser cannot watch the files', () => {
			vi.stubGlobal(
				'PerformanceObserver',
				vi.fn(() => {
					throw new Error('not supported');
				}),
			);

			expect(() => preloadQuickJsExpressionShadow(flagOn)).not.toThrow();
		});

		it('stops the watch of the WASM file on logout', () => {
			preloadQuickJsExpressionShadow(flagOn);

			stopQuickJsExpressionShadow();

			expect(FakePerformanceObserver.last?.disconnect).toHaveBeenCalledTimes(1);
		});
	});

	it('sends every property with the quickjs_fe_ prefix', async () => {
		postHogStore.getFeatureFlagPayload.mockReturnValue({ sampleRate: 1 });
		await initializeQuickJsExpressionShadow();
		installedRunner().beforeLegacy({
			expression: '{{ 1 }}',
			source: '{{ 1 }}',
			data: {} as ExpressionShadowContext['data'],
			timezone: 'UTC',
		})?.({ ok: true, value: 1 });

		stopQuickJsExpressionShadow();

		const properties = track.mock.calls.at(-1)?.[1] as Record<string, unknown>;
		expect(Object.keys(properties).filter((key) => !key.startsWith('quickjs_fe_'))).toEqual([]);
		expect(properties).not.toHaveProperty('quickjs_fe_start_variant');
		expect(properties).not.toHaveProperty('quickjs_fe_idle_wait_ms');
		expect(
			TELEMETRY_EVENT.EXPRESSIONS.EXPRESSION_ENGINE_SHADOW_RUN_REPORTED.getValidationError(
				properties,
			),
		).toBeNull();
	});
});

describe('readShadowSettings', () => {
	it('uses the defaults without a payload', () => {
		expect(readShadowSettings(undefined)).toEqual({
			sampleRate: DEFAULT_SAMPLE_RATE,
			timeoutMs: DEFAULT_TIMEOUT_MS,
		});
	});

	it('reads valid values from the payload', () => {
		expect(readShadowSettings({ sampleRate: 4.7, timeoutMs: 200 })).toEqual({
			sampleRate: 4,
			timeoutMs: 200,
		});
	});

	it('ignores values that would block the editor or never sample', () => {
		expect(readShadowSettings({ sampleRate: 0, timeoutMs: 60_000 })).toEqual({
			sampleRate: DEFAULT_SAMPLE_RATE,
			timeoutMs: DEFAULT_TIMEOUT_MS,
		});
		expect(readShadowSettings({ timeoutMs: 1000 }).timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
	});
});
