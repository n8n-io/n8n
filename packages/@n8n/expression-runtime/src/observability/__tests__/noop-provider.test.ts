import { describe, expect, it } from 'vitest';

import { NoOpProvider } from '../noop-provider';

describe('NoOpProvider', () => {
	it('returns a provider with all three APIs', () => {
		expect(NoOpProvider.metrics).toBeDefined();
		expect(NoOpProvider.traces).toBeDefined();
		expect(NoOpProvider.logs).toBeDefined();
	});

	it('metrics methods do not throw', () => {
		expect(() => NoOpProvider.metrics.counter('x', 1)).not.toThrow();
		expect(() => NoOpProvider.metrics.gauge('x', 1)).not.toThrow();
		expect(() => NoOpProvider.metrics.histogram('x', 1)).not.toThrow();
	});

	it('traces.startSpan returns a span whose methods do not throw', () => {
		const span = NoOpProvider.traces.startSpan('test');
		expect(() => span.setStatus('ok')).not.toThrow();
		expect(() => span.setAttribute('k', 'v')).not.toThrow();
		expect(() => span.recordException(new Error('boom'))).not.toThrow();
		expect(() => span.end()).not.toThrow();
	});

	it('log methods do not throw', () => {
		expect(() => NoOpProvider.logs.error('x')).not.toThrow();
		expect(() => NoOpProvider.logs.warn('x')).not.toThrow();
		expect(() => NoOpProvider.logs.info('x')).not.toThrow();
		expect(() => NoOpProvider.logs.debug('x')).not.toThrow();
	});
});
