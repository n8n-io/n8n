import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpressionEvaluator } from '../expression-evaluator';
import type { RuntimeBridge, ObservabilityProvider } from '../../types';

function createMockBridge(): RuntimeBridge {
	return {
		initialize: vi.fn().mockResolvedValue(undefined),
		execute: vi.fn().mockReturnValue('result'),
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

describe('ExpressionEvaluator cache', () => {
	let bridge: RuntimeBridge;
	let observability: ObservabilityProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		bridge = createMockBridge();
		observability = createMockObservability();
	});

	it('should emit cache miss on first evaluation', async () => {
		const evaluator = new ExpressionEvaluator({ bridge, observability, maxCodeCacheSize: 1024 });
		await evaluator.initialize();
		evaluator.evaluate('={{ $json.email }}', {});
		expect(observability.metrics.counter).toHaveBeenCalledWith('expression.code_cache.miss', 1);
	});

	it('should emit cache hit on repeated evaluation', async () => {
		const evaluator = new ExpressionEvaluator({ bridge, observability, maxCodeCacheSize: 1024 });
		await evaluator.initialize();
		evaluator.evaluate('={{ $json.email }}', {});
		evaluator.evaluate('={{ $json.email }}', {});
		expect(observability.metrics.counter).toHaveBeenCalledWith('expression.code_cache.hit', 1);
	});

	it('should emit eviction when cache is full', async () => {
		const evaluator = new ExpressionEvaluator({
			bridge,
			observability,
			maxCodeCacheSize: 2,
		});
		await evaluator.initialize();
		evaluator.evaluate('={{ $json.a }}', {});
		evaluator.evaluate('={{ $json.b }}', {});
		evaluator.evaluate('={{ $json.c }}', {}); // evicts first
		expect(observability.metrics.counter).toHaveBeenCalledWith('expression.code_cache.eviction', 1);
	});

	it('should work without observability', async () => {
		const evaluator = new ExpressionEvaluator({ bridge, maxCodeCacheSize: 1024 });
		await evaluator.initialize();
		expect(() => {
			evaluator.evaluate('={{ $json.email }}', {});
			evaluator.evaluate('={{ $json.email }}', {});
		}).not.toThrow();
	});

	it('should emit cache size gauge on cache miss', async () => {
		const evaluator = new ExpressionEvaluator({ bridge, observability, maxCodeCacheSize: 1024 });
		await evaluator.initialize();
		evaluator.evaluate('={{ $json.email }}', {});
		expect(observability.metrics.gauge).toHaveBeenCalledWith('expression.code_cache.size', 1);
	});

	it('should emit cache size gauge of 0 on dispose', async () => {
		const evaluator = new ExpressionEvaluator({ bridge, observability, maxCodeCacheSize: 1024 });
		await evaluator.initialize();
		evaluator.evaluate('={{ $json.email }}', {});
		vi.clearAllMocks();
		await evaluator.dispose();
		expect(observability.metrics.gauge).toHaveBeenCalledWith('expression.code_cache.size', 0);
	});

	it('should evict least recently used and report miss on re-access', async () => {
		const evaluator = new ExpressionEvaluator({ bridge, observability, maxCodeCacheSize: 2 });
		await evaluator.initialize();
		evaluator.evaluate('={{ $json.a }}', {});
		evaluator.evaluate('={{ $json.b }}', {});
		evaluator.evaluate('={{ $json.c }}', {});
		expect(observability.metrics.counter).toHaveBeenCalledWith('expression.code_cache.eviction', 1);
		vi.clearAllMocks();
		evaluator.evaluate('={{ $json.a }}', {});
		expect(observability.metrics.counter).toHaveBeenCalledWith('expression.code_cache.miss', 1);
	});
});
