import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExpressionEvaluator } from '../expression-evaluator';
import type { ObservabilityProvider, RuntimeBridge } from '../../types';
import { MemoryLimitError, SecurityViolationError, SyntaxError, TimeoutError } from '../../types';

function createMockBridge(execute: RuntimeBridge['execute']): RuntimeBridge {
	return {
		initialize: vi.fn().mockResolvedValue(undefined),
		execute,
		dispose: vi.fn().mockResolvedValue(undefined),
		isDisposed: vi.fn().mockReturnValue(false),
	};
}

function createMockObservability(): ObservabilityProvider {
	return {
		metrics: {
			counter: vi.fn(),
			gauge: vi.fn(),
			histogram: vi.fn(),
		},
		traces: {
			startSpan: vi.fn().mockReturnValue({
				setStatus: vi.fn(),
				setAttribute: vi.fn(),
				recordException: vi.fn(),
				end: vi.fn(),
			}),
		},
		logs: {
			error: vi.fn(),
			warn: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
		},
	};
}

describe('ExpressionEvaluator metrics', () => {
	let observability: ObservabilityProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		observability = createMockObservability();
	});

	it('emits duration histogram on successful evaluation', async () => {
		const bridge = createMockBridge(vi.fn().mockReturnValue('result'));
		const evaluator = new ExpressionEvaluator({
			createBridge: () => bridge,
			observability,
			maxCodeCacheSize: 1024,
		});
		await evaluator.initialize();
		const caller = {};
		await evaluator.acquire(caller);

		evaluator.evaluate('={{ $json.email }}', {}, caller);

		expect(observability.metrics.histogram).toHaveBeenCalledWith(
			'expression.evaluation.duration_seconds',
			expect.any(Number),
			{ status: 'success', type: 'none' },
		);
	});

	it.each([
		[new TimeoutError('t', {}), 'timeout'],
		[new MemoryLimitError('m', {}), 'memory_limit'],
		[new SecurityViolationError('s', {}), 'security'],
		[new SyntaxError('y', {}), 'syntax'],
		[new Error('anything'), 'unknown'],
	])('emits duration histogram with type=%s for %o', async (err, expectedType) => {
		const bridge = createMockBridge(
			vi.fn().mockImplementation(() => {
				throw err;
			}),
		);
		const evaluator = new ExpressionEvaluator({
			createBridge: () => bridge,
			observability,
			maxCodeCacheSize: 1024,
		});
		await evaluator.initialize();
		const caller = {};
		await evaluator.acquire(caller);

		expect(() => evaluator.evaluate('={{ fail() }}', {}, caller)).toThrow();

		expect(observability.metrics.histogram).toHaveBeenCalledWith(
			'expression.evaluation.duration_seconds',
			expect.any(Number),
			{ status: 'error', type: expectedType },
		);
	});
});
