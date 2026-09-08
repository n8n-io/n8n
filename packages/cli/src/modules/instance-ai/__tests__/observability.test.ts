import type { InstanceAiTraceContext, ModelConfig } from '@n8n/instance-ai';

import { buildInstanceAiObservabilityContext, runMetricsModelLabel } from '../observability';

describe('Instance AI observability', () => {
	it('builds a flat correlation context from run and trace details', () => {
		const tracing = {
			rootRun: {
				otelTraceId: 'otel-trace-1',
				traceId: 'langsmith-trace-1',
			},
		} as unknown as InstanceAiTraceContext;

		expect(
			buildInstanceAiObservabilityContext({
				threadId: 'thread-1',
				runId: 'run-1',
				tracing,
				agentId: 'agent-1',
				userId: 'user-1',
				messageGroupId: 'group-1',
				messageId: 'message-1',
			}),
		).toEqual({
			source: 'instance-ai',
			threadId: 'thread-1',
			runId: 'run-1',
			traceId: 'otel-trace-1',
			langsmithTraceId: 'langsmith-trace-1',
			agentId: 'agent-1',
			userId: 'user-1',
			messageGroupId: 'group-1',
			messageId: 'message-1',
		});
	});

	it('omits runId when absent and includes projectId for thread creation', () => {
		expect(
			buildInstanceAiObservabilityContext({
				threadId: 'thread-1',
				userId: 'user-1',
				projectId: 'project-1',
			}),
		).toEqual({
			source: 'instance-ai',
			threadId: 'thread-1',
			userId: 'user-1',
			projectId: 'project-1',
		});
	});
});

describe('runMetricsModelLabel', () => {
	it('reports managed model ids as-is', () => {
		expect(runMetricsModelLabel('anthropic/claude-sonnet-4-6')).toBe('anthropic/claude-sonnet-4-6');
	});

	it('reports the model id of a proxy-built AI SDK instance', () => {
		const proxyModel = {
			specificationVersion: 'v4',
			modelId: 'kimi-k3',
			config: { provider: 'moonshotai.chat' },
		} as unknown as ModelConfig;

		expect(runMetricsModelLabel(proxyModel)).toBe('moonshotai/kimi-k3');
	});

	it("collapses user-configured endpoints and unknown configs to 'custom'", () => {
		expect(
			runMetricsModelLabel({
				id: 'custom/some-self-hosted-model',
				url: 'https://llm.example.com/v1',
			}),
		).toBe('custom');
		expect(runMetricsModelLabel(undefined)).toBe('custom');
		expect(runMetricsModelLabel({} as unknown as ModelConfig)).toBe('custom');
	});
});
