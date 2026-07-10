/* eslint-disable import-x/order */
import type { OrchestrationContext } from '../../../types';

const mockCreateDetachedSubAgentTraceContext = vi.fn<(arg: unknown) => Promise<unknown>>();

vi.mock('../../../tracing/langsmith-tracing', () => ({
	createDetachedSubAgentTraceContext: async (options: unknown): Promise<unknown> =>
		await mockCreateDetachedSubAgentTraceContext(options),
	getCurrentOtelSpanContext: vi.fn(() => undefined),
	getCurrentTraceToolCallId: vi.fn(() => undefined),
	mergeCurrentTraceMetadata: vi.fn(),
}));

import { createDetachedSubAgentTraceFactory } from '../tracing-utils';

describe('createDetachedSubAgentTraceFactory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('propagates parent version metadata to detached sub-agent traces', async () => {
		mockCreateDetachedSubAgentTraceContext.mockResolvedValue({
			rootRun: { id: 'sub-root', traceId: 'sub-trace' },
		});
		const context = {
			threadId: 'thread-1',
			messageGroupId: 'group-1',
			runId: 'run-1',
			userId: 'user-1',
			modelId: 'model-1',
			orchestratorAgentId: 'orchestrator-1',
			tracingProxyConfig: { getAuthHeaders: vi.fn() },
			tracing: {
				projectName: 'project-1',
				rootRun: { traceId: 'root-trace' },
				actorRun: {
					id: 'actor-run',
					metadata: {
						message_id: 'message-1',
						conversation_id: 'conversation-1',
						agent_id: 'agent-1',
						n8n_version: '1.123.4',
						workflow_sdk_version: '0.13.0',
					},
				},
			},
		} as unknown as OrchestrationContext;

		const createTrace = createDetachedSubAgentTraceFactory(context, {
			agentId: 'sub-agent',
			role: 'builder',
			kind: 'background',
			inputs: { task: 'build' },
			metadata: { task_id: 'task-1' },
		});

		await createTrace();

		expect(mockCreateDetachedSubAgentTraceContext).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: { task_id: 'task-1' },
				n8nVersion: '1.123.4',
				workflowSdkVersion: '0.13.0',
			}),
		);
	});
});
