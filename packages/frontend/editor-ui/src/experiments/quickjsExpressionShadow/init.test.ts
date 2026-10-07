import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { ExpressionShadowContext, ExpressionShadowRunner } from 'n8n-workflow';
import { Expression } from 'n8n-workflow';

import {
	DEFAULT_SAMPLE_RATE,
	DEFAULT_TIMEOUT_MS,
	initializeQuickJsExpressionShadow,
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
		vi.mocked(Expression.createQuickJsShadowEvaluator).mockResolvedValue(evaluator);
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
			expect.objectContaining({ evaluations: 1 }),
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
			expect.objectContaining({ init_status: 'failed', evaluations: 0 }),
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
				init_status: 'ready',
				sample_rate: 1,
				timeout_ms: 50,
				evaluations: 1,
				same: 1,
			}),
		);
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
	});
});
