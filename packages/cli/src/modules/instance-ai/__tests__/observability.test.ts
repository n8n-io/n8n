import type { InstanceAiTraceContext } from '@n8n/instance-ai';

import { buildInstanceAiObservabilityContext } from '../observability';

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
});
