import { ModuleRegistry } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { resolveExecutionTraceLink } from '../execution-trace-link';

describe('resolveExecutionTraceLink', () => {
	const tracingContext = { traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' };
	const startedAt = new Date('2026-11-18T10:00:00.000Z');
	const stoppedAt = new Date('2026-11-18T10:00:02.000Z');
	const link = { traceId: '4bf92f3577b34da6a3ce929d0e0e4736', url: 'https://jaeger.example.com/x' };

	const registryWith = (otelContext?: Record<string, unknown>) => {
		const registry = new ModuleRegistry(mock(), mock(), mock(), mock(), mock());
		if (otelContext) registry.context.set('otel', otelContext);
		return registry;
	};

	it('should return the link that the otel module builds', () => {
		const buildTraceLink = vi.fn().mockReturnValue(link);

		const result = resolveExecutionTraceLink(registryWith({ buildTraceLink }), {
			tracingContext,
			startedAt,
			stoppedAt,
		});

		expect(result).toEqual(link);
		expect(buildTraceLink).toHaveBeenCalledWith(tracingContext, { startedAt, stoppedAt });
	});

	it('should return undefined when the otel module is not loaded', () => {
		expect(resolveExecutionTraceLink(registryWith(), { tracingContext })).toBeUndefined();
	});

	it('should return undefined when the execution has no tracing context', () => {
		const buildTraceLink = vi.fn().mockReturnValue(link);

		expect(
			resolveExecutionTraceLink(registryWith({ buildTraceLink }), { tracingContext: null }),
		).toBeUndefined();
		expect(buildTraceLink).not.toHaveBeenCalled();
	});

	it('should ignore a result that is not a trace link', () => {
		const buildTraceLink = vi.fn().mockReturnValue({ url: 42 });

		expect(
			resolveExecutionTraceLink(registryWith({ buildTraceLink }), { tracingContext }),
		).toBeUndefined();
	});
});
