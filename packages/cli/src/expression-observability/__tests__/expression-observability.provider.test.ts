/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import { ExpressionEngineConfig, type GlobalConfig } from '@n8n/config';
import { EXPRESSION_METRICS } from '@n8n/expression-runtime';
import { trace } from '@opentelemetry/api';
import { mock } from 'jest-mock-extended';
import promClient from 'prom-client';

import { ExpressionObservabilityProvider } from '../expression-observability.provider';

const scopedLogger = mock<Logger>();

function buildConfig(overrides: Partial<ExpressionEngineConfig> = {}): ExpressionEngineConfig {
	const config = new ExpressionEngineConfig();
	// The provider is a no-op unless engine === 'vm'. Default tests to the active
	// engine so shared assertions exercise the real code path.
	return Object.assign(config, { engine: 'vm' as const, ...overrides });
}

function buildLogger(): Logger {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(scopedLogger as unknown as Logger);
	return logger;
}

function buildGlobalConfig(prefix = 'n8n_'): GlobalConfig {
	return { endpoints: { metrics: { prefix } } } as GlobalConfig;
}

describe('ExpressionObservabilityProvider', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		promClient.register.clear();
	});

	describe('when disabled', () => {
		it('delegates to NoOpProvider when observabilityEnabled=false', () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig({ observabilityEnabled: false }),
				buildLogger(),
				buildGlobalConfig(),
			);

			expect(() => {
				provider.metrics.counter(EXPRESSION_METRICS.poolAcquired.name, 1);
				provider.metrics.gauge(EXPRESSION_METRICS.codeCacheSize.name, 5);
				provider.metrics.histogram(EXPRESSION_METRICS.evaluationDuration.name, 10);
				provider.logs.info('hello');
				provider.traces.startSpan('x').end();
			}).not.toThrow();
		});

		it('delegates to NoOpProvider when engine is not vm', async () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig({ engine: 'legacy' }),
				buildLogger(),
				buildGlobalConfig(),
			);

			provider.metrics.counter(EXPRESSION_METRICS.poolAcquired.name, 1);

			const output = await promClient.register.metrics();
			expect(output).not.toContain('n8n_expression_');
		});
	});

	describe('metrics adapter', () => {
		it('registers a prom counter with _total suffix', async () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig(),
				buildLogger(),
				buildGlobalConfig(),
			);
			provider.metrics.counter(EXPRESSION_METRICS.poolAcquired.name, 2);

			const metric = promClient.register.getSingleMetric('n8n_expression_pool_acquired_total');
			expect(metric).toBeDefined();
			const output = await promClient.register.metrics();
			expect(output).toContain('n8n_expression_pool_acquired_total 2');
		});

		it('registers a prom gauge with the cleaned name', async () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig(),
				buildLogger(),
				buildGlobalConfig(),
			);
			provider.metrics.gauge(EXPRESSION_METRICS.codeCacheSize.name, 42);

			const output = await promClient.register.metrics();
			expect(output).toContain('n8n_expression_code_cache_size 42');
		});

		it('registers a prom histogram with bucketed observations', async () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig(),
				buildLogger(),
				buildGlobalConfig(),
			);
			provider.metrics.histogram(EXPRESSION_METRICS.evaluationDuration.name, 3, {
				status: 'success',
				type: 'none',
			});

			const output = await promClient.register.metrics();
			expect(output).toContain('n8n_expression_evaluation_duration_seconds_bucket');
			expect(output).toContain('n8n_expression_evaluation_duration_seconds_count');
		});
	});

	describe('tail sampling', () => {
		const startSpanMock = jest.fn().mockReturnValue({
			setStatus: jest.fn(),
			setAttribute: jest.fn(),
			recordException: jest.fn(),
			end: jest.fn(),
		});

		beforeEach(() => {
			startSpanMock.mockClear();
			jest.spyOn(trace, 'getTracer').mockReturnValue({
				startSpan: startSpanMock,
			} as unknown as ReturnType<typeof trace.getTracer>);
		});

		it('drops healthy spans under the slow threshold', () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig({ slowEvaluationThresholdMs: 50, tracesSampleRate: 0 }),
				buildLogger(),
				buildGlobalConfig(),
			);
			provider.metrics.histogram(EXPRESSION_METRICS.evaluationDuration.name, 0.01, {
				status: 'success',
				type: 'none',
			});
			expect(startSpanMock).not.toHaveBeenCalled();
		});

		it('keeps spans that exceed the slow threshold', () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig({ slowEvaluationThresholdMs: 50 }),
				buildLogger(),
				buildGlobalConfig(),
			);
			provider.metrics.histogram(EXPRESSION_METRICS.evaluationDuration.name, 0.1, {
				status: 'success',
				type: 'none',
			});
			expect(startSpanMock).toHaveBeenCalledWith(
				'expression.evaluate',
				expect.objectContaining({
					attributes: expect.objectContaining({
						'expression.outcome': 'slow',
						'expression.engine': 'vm',
					}),
				}),
			);
		});

		it('keeps spans when status is error, regardless of duration', () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig({ slowEvaluationThresholdMs: 50 }),
				buildLogger(),
				buildGlobalConfig(),
			);
			provider.metrics.histogram(EXPRESSION_METRICS.evaluationDuration.name, 0.005, {
				status: 'error',
				type: 'timeout',
			});
			expect(startSpanMock).toHaveBeenCalledWith(
				'expression.evaluate',
				expect.objectContaining({
					attributes: expect.objectContaining({
						'expression.outcome': 'error',
						'expression.error.type': 'timeout',
					}),
				}),
			);
		});

		it('does not start spans when tracesEnabled=false', () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig({ tracesEnabled: false, slowEvaluationThresholdMs: 10 }),
				buildLogger(),
				buildGlobalConfig(),
			);
			provider.metrics.histogram(EXPRESSION_METRICS.evaluationDuration.name, 0.5, {
				status: 'error',
				type: 'timeout',
			});
			expect(startSpanMock).not.toHaveBeenCalled();
		});
	});

	describe('label-set stability (eager registration)', () => {
		it('logs a warning and does not throw when an unknown metric is emitted', () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig(),
				buildLogger(),
				buildGlobalConfig(),
			);
			expect(() => {
				provider.metrics.counter('test.unknown', 1);
			}).not.toThrow();
			expect(scopedLogger.warn).toHaveBeenCalledWith('Emitted unknown expression metric', {
				name: 'test.unknown',
			});
		});

		it('uses the schema-registered label set regardless of call order', async () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig(),
				buildLogger(),
				buildGlobalConfig(),
			);

			provider.metrics.histogram(EXPRESSION_METRICS.evaluationDuration.name, 0.01, {
				status: 'error',
				type: 'timeout',
			});
			provider.metrics.histogram(EXPRESSION_METRICS.evaluationDuration.name, 0.02, {
				status: 'success',
				type: 'none',
			});

			const output = await promClient.register.metrics();
			const countLines = output
				.split('\n')
				.filter((line) => line.startsWith('n8n_expression_evaluation_duration_seconds_count{'));
			expect(countLines.length).toBeGreaterThan(0);
			for (const line of countLines) {
				expect(line).toContain('status=');
				expect(line).toContain('type=');
			}
		});
	});

	describe('logs adapter', () => {
		it('delegates to scoped logger', () => {
			const provider = new ExpressionObservabilityProvider(
				buildConfig(),
				buildLogger(),
				buildGlobalConfig(),
			);
			provider.logs.info('hello', { k: 'v' });
			provider.logs.warn('warn', { k: 'v' });
			provider.logs.error('boom', new Error('x'), { k: 'v' });

			expect(scopedLogger.info).toHaveBeenCalledWith('hello', { k: 'v' });
			expect(scopedLogger.warn).toHaveBeenCalledWith('warn', { k: 'v' });
			expect(scopedLogger.error).toHaveBeenCalledWith(
				'boom',
				expect.objectContaining({ error: expect.any(Error), k: 'v' }),
			);
		});
	});
});
