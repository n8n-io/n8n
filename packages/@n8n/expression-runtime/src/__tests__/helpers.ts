import { vi } from 'vitest';
import type { ObservabilityProvider, RuntimeBridge } from '../types';

export function createMockBridge(): RuntimeBridge {
	return {
		initialize: vi.fn().mockResolvedValue(undefined),
		execute: vi.fn().mockReturnValue('result'),
		dispose: vi.fn().mockResolvedValue(undefined),
		isDisposed: vi.fn().mockReturnValue(false),
	};
}

export function createMockObservability(): ObservabilityProvider {
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
