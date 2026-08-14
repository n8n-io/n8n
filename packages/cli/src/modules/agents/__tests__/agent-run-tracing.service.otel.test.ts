import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { context, type Tracer } from '@opentelemetry/api';
import { mock } from 'vitest-mock-extended';

import { OtelTestProvider } from '@/modules/otel/__tests__/support/otel-test-provider';
import { ExecutionLevelTracer } from '@/modules/otel/execution-level-tracer';
import type { OtelSettingsService } from '@/modules/otel/otel-settings.service';

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

	it('nests a workflow-sourced agent run under the calling node span instead of starting a disconnected trace', async () => {
		const otel = OtelTestProvider.create({ withContextManager: true });
		try {
			const executionLevelTracer = new ExecutionLevelTracer(
				mock<OtelSettingsService>({ getSettings: () => ({ injectOutbound: false }) as never }),
				mock<Logger>(),
			);
			const executionId = 'exec-1';
			const node = { id: 'node-1', name: 'Message an Agent', type: 'test', typeVersion: 1 };

			executionLevelTracer.startWorkflow({
				executionId,
				workflow: { id: 'wf-1', name: 'Test workflow', versionId: 'v1', nodeCount: 1 },
			});
			executionLevelTracer.startNode({ executionId, node });

			const agentsConfig = mock<AgentsConfig>({ tracingEnabled: true });
			const agentRunTracingService = new AgentRunTracingService(agentsConfig);

			const parentCtx = executionLevelTracer.getActiveContext(executionId, node.name);
			expect(parentCtx).toBeDefined();

			// Mirrors `RuntimeTelemetry.withRootSpan`'s root-anchoring logic in
			// `@n8n/agents`: `root: true` unless `rootAnchored === false`.
			await context.with(parentCtx!, async () => {
				const built = await agentRunTracingService.build({
					agentId: 'agent-1',
					projectId: 'project-1',
					threadId: 'thread-1',
					source: 'workflow',
					executionId,
					workflowId: 'wf-1',
					nodeId: node.id,
					hasParentContext: true,
				});
				expect(built?.rootAnchored).toBe(false);

				(built?.tracer as Tracer).startActiveSpan(
					'agent.stream',
					{ ...(built?.rootAnchored === false ? {} : { root: true }) },
					(span) => {
						span.end();
					},
				);
			});

			executionLevelTracer.endNode({ executionId, node, inputItemCount: 1, outputItemCount: 1 });
			executionLevelTracer.endWorkflow({
				executionId,
				status: 'success',
				mode: 'manual',
				isRetry: false,
			});

			const spans = otel.getFinishedSpans();
			const nodeSpan = spans.find((s) => s.name === 'node.execute')!;
			const agentSpan = spans.find((s) => s.name === 'agent.stream')!;
			expect(nodeSpan).toBeDefined();
			expect(agentSpan).toBeDefined();
			expect(agentSpan.parentSpanContext?.spanId).toBe(nodeSpan.spanContext().spanId);
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
