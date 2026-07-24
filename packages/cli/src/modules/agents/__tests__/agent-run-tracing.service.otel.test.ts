import type { AgentsConfig } from '@n8n/config';
import type { Tracer } from '@opentelemetry/api';
import { mock } from 'vitest-mock-extended';

import { OtelTestProvider } from '@/modules/otel/__tests__/support/otel-test-provider';

import { AgentRunTracingService } from '../agent-run-tracing.service';

// Deliberately does not mock '@opentelemetry/api': agent-run-tracing.service.test.ts
// already covers the built-metadata/branching logic against a stubbed tracer. This
// file proves the real OTel path end-to-end — that a registered provider actually
// records the span the service's tracer produces, and that a disabled OTel module
// (no provider registered) or disabled agent tracing both emit nothing.
describe('AgentRunTracingService (real OTel provider)', () => {
	const baseMetadata = {
		agentId: 'agent-1',
		projectId: 'project-1',
		threadId: 'thread-1',
		source: 'slack',
	};

	it('produces a tracer that records a real span with the built metadata as attributes', async () => {
		const otel = OtelTestProvider.create();
		try {
			const agentsConfig = mock<AgentsConfig>({ tracingEnabled: true });
			const service = new AgentRunTracingService(agentsConfig);

			const built = await service.build(baseMetadata);
			expect(built).toBeDefined();

			(built?.tracer as Tracer).startActiveSpan(
				'test-span',
				{ attributes: built?.metadata },
				(span) => {
					span.end();
				},
			);

			const spans = otel.getFinishedSpans();
			expect(spans).toHaveLength(1);
			expect(spans[0].name).toBe('test-span');
			expect(spans[0].attributes).toEqual({
				agent_id: 'agent-1',
				project_id: 'project-1',
				thread_id: 'thread-1',
				source: 'slack',
			});
		} finally {
			await otel.shutdown();
		}
	});

	it('emits no spans when the OTel module has no provider registered', async () => {
		const agentsConfig = mock<AgentsConfig>({ tracingEnabled: true });
		const service = new AgentRunTracingService(agentsConfig);

		const built = await service.build(baseMetadata);
		expect(built).toBeDefined();

		// No provider registered — the global tracer falls back to OTel's
		// no-op implementation, so starting a span records nothing anywhere.
		(built?.tracer as Tracer).startActiveSpan('test-span', (span) => {
			expect(span.isRecording()).toBe(false);
			span.end();
		});
	});

	it('emits no spans when agent tracing is disabled, even with a provider registered', async () => {
		const otel = OtelTestProvider.create();
		try {
			const agentsConfig = mock<AgentsConfig>({ tracingEnabled: false });
			const service = new AgentRunTracingService(agentsConfig);

			const built = await service.build(baseMetadata);
			expect(built).toBeUndefined();
			expect(otel.getFinishedSpans()).toHaveLength(0);
		} finally {
			await otel.shutdown();
		}
	});
});
