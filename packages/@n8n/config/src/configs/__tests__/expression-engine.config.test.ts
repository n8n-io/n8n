import { Container } from '@n8n/di';

import { ExpressionEngineConfig } from '../expression-engine.config';

describe('ExpressionEngineConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.resetAllMocks();
		vi.unstubAllEnvs();
	});

	describe('defaults', () => {
		test('bridgeTimeout defaults to 5000', () => {
			expect(Container.get(ExpressionEngineConfig).bridgeTimeout).toBe(5000);
		});

		test('bridgeMemoryLimit defaults to 128', () => {
			expect(Container.get(ExpressionEngineConfig).bridgeMemoryLimit).toBe(128);
		});
	});

	describe('N8N_EXPRESSION_ENGINE_IDLE_TIMEOUT', () => {
		test('overrides idleTimeout', () => {
			vi.stubEnv('N8N_EXPRESSION_ENGINE_IDLE_TIMEOUT', '60');
			const config = Container.get(ExpressionEngineConfig);
			expect(config.idleTimeout).toBe(60);
		});

		test('parses "0" as the number 0 (distinct from undefined/unset)', () => {
			vi.stubEnv('N8N_EXPRESSION_ENGINE_IDLE_TIMEOUT', '0');
			const config = Container.get(ExpressionEngineConfig);
			expect(config.idleTimeout).toBe(0);
			expect(config.idleTimeout).not.toBeUndefined();
		});
	});

	describe('N8N_EXPRESSION_ENGINE_TIMEOUT', () => {
		test('overrides bridgeTimeout', () => {
			vi.stubEnv('N8N_EXPRESSION_ENGINE_TIMEOUT', '1000');
			expect(Container.get(ExpressionEngineConfig).bridgeTimeout).toBe(1000);
		});

		test('falls back to default on non-numeric value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('N8N_EXPRESSION_ENGINE_TIMEOUT', 'not-a-number');
			expect(Container.get(ExpressionEngineConfig).bridgeTimeout).toBe(5000);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});

	describe('N8N_EXPRESSION_ENGINE_MEMORY_LIMIT', () => {
		test('overrides bridgeMemoryLimit', () => {
			vi.stubEnv('N8N_EXPRESSION_ENGINE_MEMORY_LIMIT', '64');
			expect(Container.get(ExpressionEngineConfig).bridgeMemoryLimit).toBe(64);
		});

		test('falls back to default on non-numeric value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('N8N_EXPRESSION_ENGINE_MEMORY_LIMIT', 'not-a-number');
			expect(Container.get(ExpressionEngineConfig).bridgeMemoryLimit).toBe(128);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});

	describe('observability defaults', () => {
		test('observabilityEnabled defaults to true', () => {
			expect(Container.get(ExpressionEngineConfig).observabilityEnabled).toBe(true);
		});

		test('tracesEnabled defaults to true', () => {
			expect(Container.get(ExpressionEngineConfig).tracesEnabled).toBe(true);
		});

		test('slowEvaluationThresholdMs defaults to 50', () => {
			expect(Container.get(ExpressionEngineConfig).slowEvaluationThresholdMs).toBe(50);
		});

		test('tracesSampleRate defaults to 0', () => {
			expect(Container.get(ExpressionEngineConfig).tracesSampleRate).toBe(0);
		});
	});

	describe('observability overrides', () => {
		test('N8N_EXPRESSION_ENGINE_OBSERVABILITY_ENABLED disables observability', () => {
			vi.stubEnv('N8N_EXPRESSION_ENGINE_OBSERVABILITY_ENABLED', 'false');
			expect(Container.get(ExpressionEngineConfig).observabilityEnabled).toBe(false);
		});

		test('N8N_EXPRESSION_ENGINE_SLOW_EVAL_THRESHOLD_MS overrides threshold', () => {
			vi.stubEnv('N8N_EXPRESSION_ENGINE_SLOW_EVAL_THRESHOLD_MS', '100');
			expect(Container.get(ExpressionEngineConfig).slowEvaluationThresholdMs).toBe(100);
		});

		test('N8N_EXPRESSION_ENGINE_SLOW_EVAL_THRESHOLD_MS falls back to default on non-positive value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('N8N_EXPRESSION_ENGINE_SLOW_EVAL_THRESHOLD_MS', '0');
			expect(Container.get(ExpressionEngineConfig).slowEvaluationThresholdMs).toBe(50);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});

		test('N8N_EXPRESSION_ENGINE_TRACES_SAMPLE_RATE overrides sample rate', () => {
			vi.stubEnv('N8N_EXPRESSION_ENGINE_TRACES_SAMPLE_RATE', '0.25');
			expect(Container.get(ExpressionEngineConfig).tracesSampleRate).toBe(0.25);
		});

		test('N8N_EXPRESSION_ENGINE_TRACES_SAMPLE_RATE falls back to default on out-of-range value', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			vi.stubEnv('N8N_EXPRESSION_ENGINE_TRACES_SAMPLE_RATE', '1.5');
			expect(Container.get(ExpressionEngineConfig).tracesSampleRate).toBe(0);
			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});
});
