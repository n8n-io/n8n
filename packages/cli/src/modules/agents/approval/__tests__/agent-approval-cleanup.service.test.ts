import type { SerializableAgentState } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';

import type { AgentBackgroundJobService } from '../../background/agent-background-job.service';
import type { AgentBackgroundJob } from '../../entities/agent-background-job.entity';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { AgentBackgroundJobRepository } from '../../repositories/agent-background-job.repository';
import type { AgentHitlWorkflowRepository } from '../../repositories/agent-hitl-workflow.repository';
import { AgentApprovalCleanupService } from '../agent-approval-cleanup.service';

function setup() {
	const jobs = mock<AgentBackgroundJobRepository>();
	const background = mock<AgentBackgroundJobService>();
	const checkpoints = mock<N8NCheckpointStorage>();
	const executions = mock<ExecutionPersistence>();
	const owners = mock<AgentHitlWorkflowRepository>();
	jobs.findUnconsumedApprovalsForAgent.mockResolvedValue([
		mock<AgentBackgroundJob>({ parentRunId: 'run', parentThreadId: 'thread' }),
	]);
	return {
		jobs,
		background,
		checkpoints,
		executions,
		owners,
		service: new AgentApprovalCleanupService(jobs, background, checkpoints, executions, owners),
	};
}

it('cancels a pending checkpoint before stopping and deleting its execution owner', async () => {
	const { service, checkpoints, background, executions, owners } = setup();
	checkpoints.getStatus.mockResolvedValue({
		status: 'active',
		checkpoint: mock<SerializableAgentState>({ status: 'suspended' }),
	});
	checkpoints.cancelSuspended.mockResolvedValue(true);
	await service.cleanupAgent('agent', 'project', 'owner');
	expect(checkpoints.cancelSuspended.mock.invocationCallOrder[0]).toBeLessThan(
		background.cancelForSession.mock.invocationCallOrder[0],
	);
	expect(executions.hardDeleteByWorkflowId.mock.invocationCallOrder[0]).toBeLessThan(
		owners.deleteExecutionOwner.mock.invocationCallOrder[0],
	);
	expect(owners.deleteExecutionOwner).toHaveBeenCalledWith('project', 'agent', 'owner');
});
it('keeps execution data and its owner when stopping the child fails', async () => {
	const { service, checkpoints, background, executions, owners } = setup();
	checkpoints.getStatus.mockResolvedValue({ status: 'expired' });
	background.cancelForSession.mockRejectedValue(new Error('Stop unavailable'));
	await expect(service.cleanupAgent('agent', 'project', 'owner')).rejects.toThrow(
		'Stop unavailable',
	);
	expect(executions.hardDeleteByWorkflowId).not.toHaveBeenCalled();
	expect(owners.deleteExecutionOwner).not.toHaveBeenCalled();
});
it('keeps an owner while another process resumes its Agent', async () => {
	const { service, checkpoints, executions } = setup();
	checkpoints.getStatus.mockResolvedValue({
		status: 'active',
		checkpoint: mock<SerializableAgentState>({ status: 'running' }),
	});
	await expect(service.cleanupAgent('agent', 'project', 'owner')).rejects.toThrow('still stopping');
	expect(executions.hardDeleteByWorkflowId).not.toHaveBeenCalled();
});
