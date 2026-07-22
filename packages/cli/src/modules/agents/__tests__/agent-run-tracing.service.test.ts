import type { AgentsConfig } from '@n8n/config';
import { trace } from '@opentelemetry/api';
import { mock } from 'vitest-mock-extended';

import { AgentRunTracingService, modelIdFromSnapshot } from '../agent-run-tracing.service';

vi.mock('@opentelemetry/api', () => ({
	trace: { getTracer: vi.fn(() => ({ startActiveSpan: vi.fn() })) },
}));

describe('AgentRunTracingService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const baseMetadata = {
		agentId: 'agent-1',
		projectId: 'project-1',
		threadId: 'thread-1',
		source: 'slack',
	};

	it('exposes whether tracing is enabled via the `enabled` getter', () => {
		expect(new AgentRunTracingService(mock<AgentsConfig>({ tracingEnabled: true })).enabled).toBe(
			true,
		);
		expect(new AgentRunTracingService(mock<AgentsConfig>({ tracingEnabled: false })).enabled).toBe(
			false,
		);
	});

	it('returns undefined when agent tracing is disabled, without touching the tracer', async () => {
		const agentsConfig = mock<AgentsConfig>({ tracingEnabled: false });
		const service = new AgentRunTracingService(agentsConfig);

		const built = await service.build(baseMetadata);

		expect(built).toBeUndefined();
		expect(trace.getTracer).not.toHaveBeenCalled();
	});

	it('builds telemetry from a fresh tracer fetch when tracing is enabled', async () => {
		const agentsConfig = mock<AgentsConfig>({ tracingEnabled: true });
		const service = new AgentRunTracingService(agentsConfig);

		await service.build(baseMetadata);
		await service.build(baseMetadata);

		expect(trace.getTracer).toHaveBeenCalledTimes(2);
		expect(trace.getTracer).toHaveBeenCalledWith('@n8n/agents');
	});

	it('never marks the built telemetry as LangSmith, so root spans stay generic', async () => {
		const agentsConfig = mock<AgentsConfig>({ tracingEnabled: true });
		const service = new AgentRunTracingService(agentsConfig);

		const built = await service.build(baseMetadata);

		expect(built?.isLangSmith).toBeUndefined();
		expect(built?.credentialName).toBeUndefined();
	});

	it('includes execution_id/workflow_id/node_id only when source is "workflow"', async () => {
		const agentsConfig = mock<AgentsConfig>({ tracingEnabled: true });
		const service = new AgentRunTracingService(agentsConfig);

		const workflowBuilt = await service.build({
			...baseMetadata,
			source: 'workflow',
			executionId: 'exec-1',
			workflowId: 'wf-1',
			nodeId: 'My Agent Node',
		});
		expect(workflowBuilt?.metadata).toEqual({
			agent_id: 'agent-1',
			project_id: 'project-1',
			thread_id: 'thread-1',
			source: 'workflow',
			execution_id: 'exec-1',
			workflow_id: 'wf-1',
			node_id: 'My Agent Node',
		});

		const slackBuilt = await service.build({
			...baseMetadata,
			source: 'slack',
		});
		expect(slackBuilt?.metadata).toEqual({
			agent_id: 'agent-1',
			project_id: 'project-1',
			thread_id: 'thread-1',
			source: 'slack',
		});
	});

	it('omits execution_id/workflow_id/node_id individually when not provided, even for a workflow source', async () => {
		const agentsConfig = mock<AgentsConfig>({ tracingEnabled: true });
		const service = new AgentRunTracingService(agentsConfig);

		const noneProvided = await service.build({
			...baseMetadata,
			source: 'workflow',
		});
		expect(noneProvided?.metadata).toEqual({
			agent_id: 'agent-1',
			project_id: 'project-1',
			thread_id: 'thread-1',
			source: 'workflow',
		});

		const onlyExecutionId = await service.build({
			...baseMetadata,
			source: 'workflow',
			executionId: 'exec-1',
		});
		expect(onlyExecutionId?.metadata).toEqual({
			agent_id: 'agent-1',
			project_id: 'project-1',
			thread_id: 'thread-1',
			source: 'workflow',
			execution_id: 'exec-1',
		});

		const onlyWorkflowId = await service.build({
			...baseMetadata,
			source: 'workflow',
			workflowId: 'wf-1',
		});
		expect(onlyWorkflowId?.metadata).toEqual({
			agent_id: 'agent-1',
			project_id: 'project-1',
			thread_id: 'thread-1',
			source: 'workflow',
			workflow_id: 'wf-1',
		});

		const onlyNodeId = await service.build({
			...baseMetadata,
			source: 'workflow',
			nodeId: 'My Agent Node',
		});
		expect(onlyNodeId?.metadata).toEqual({
			agent_id: 'agent-1',
			project_id: 'project-1',
			thread_id: 'thread-1',
			source: 'workflow',
			node_id: 'My Agent Node',
		});
	});

	it('rejects workflow-only fields at compile time for a non-workflow source', async () => {
		const agentsConfig = mock<AgentsConfig>({ tracingEnabled: true });
		const service = new AgentRunTracingService(agentsConfig);

		// @ts-expect-error executionId only exists on the 'workflow' branch of
		// the AgentRunTracingMetadata union — a non-workflow source can't carry
		// it, enforced at compile time rather than filtered at runtime.
		await service.build({ ...baseMetadata, source: 'slack', executionId: 'exec-1' });
	});

	it('includes user_id and model_id only when provided', async () => {
		const agentsConfig = mock<AgentsConfig>({ tracingEnabled: true });
		const service = new AgentRunTracingService(agentsConfig);

		const built = await service.build({
			...baseMetadata,
			userId: 'user-1',
			modelId: 'openai/gpt-4o-mini',
		});

		expect(built?.metadata).toEqual({
			agent_id: 'agent-1',
			project_id: 'project-1',
			thread_id: 'thread-1',
			source: 'slack',
			user_id: 'user-1',
			model_id: 'openai/gpt-4o-mini',
		});
	});
});

describe('modelIdFromSnapshot', () => {
	it('formats provider/name when both are present', () => {
		expect(modelIdFromSnapshot({ provider: 'openai', name: 'gpt-4o-mini' })).toBe(
			'openai/gpt-4o-mini',
		);
	});

	it('returns undefined when either half is missing', () => {
		expect(modelIdFromSnapshot({ provider: null, name: 'gpt-4o-mini' })).toBeUndefined();
		expect(modelIdFromSnapshot({ provider: 'openai', name: null })).toBeUndefined();
		expect(modelIdFromSnapshot({ provider: null, name: null })).toBeUndefined();
	});
});
