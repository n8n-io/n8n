import type { SerializableAgentState } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';

import type { AgentBackgroundJobService } from '../../background/agent-background-job.service';
import type { AgentBackgroundJob } from '../../entities/agent-background-job.entity';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { AgentBackgroundJobRepository } from '../../repositories/agent-background-job.repository';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import type { AgentHitlWorkflowRepository } from '../../repositories/agent-hitl-workflow.repository';
import { AgentApprovalCleanupService } from '../agent-approval-cleanup.service';

function setup() {
	const jobs = mock<AgentBackgroundJobRepository>();
	const background = mock<AgentBackgroundJobService>();
	const checkpoints = mock<N8NCheckpointStorage>();
	const executions = mock<ExecutionPersistence>();
	const owners = mock<AgentHitlWorkflowRepository>();
	const agentExecutions = mock<AgentExecutionRepository>();
	jobs.findUnconsumedApprovalsForAgent.mockResolvedValue([
		mock<AgentBackgroundJob>({ id: 'job', parentRunId: 'run', parentThreadId: 'thread' }),
	]);
	agentExecutions.existsRunningByThread.mockResolvedValue(false);
	return {
		jobs,
		background,
		checkpoints,
		executions,
		owners,
		agentExecutions,
		service: new AgentApprovalCleanupService(
			jobs,
			background,
			checkpoints,
			executions,
			owners,
			agentExecutions,
		),
	};
}

const suspended = () => ({
	status: 'active' as const,
	checkpoint: mock<SerializableAgentState>({ status: 'suspended' }),
});
const running = () => ({
	status: 'active' as const,
	checkpoint: mock<SerializableAgentState>({ status: 'running' }),
});

describe('cleanupAgent', () => {
	it('cancels a pending checkpoint before stopping and deleting its execution owner', async () => {
		const { service, checkpoints, background, executions, owners } = setup();
		checkpoints.getStatus.mockResolvedValue(suspended());
		checkpoints.cancelSuspended.mockResolvedValue(true);
		await service.cleanupAgent('agent', 'project', 'owner');
		expect(checkpoints.cancelSuspended.mock.invocationCallOrder[0]).toBeLessThan(
			background.cancelForSession.mock.invocationCallOrder[0],
		);
		expect(executions.hardDeleteByWorkflowId).toHaveBeenCalledWith('owner');
		expect(owners.deleteDetachedExecutionOwner).toHaveBeenCalledWith('owner');
	});

	it('detaches the execution owner before it deletes the owner execution data', async () => {
		const { service, checkpoints, executions, owners } = setup();
		checkpoints.getStatus.mockResolvedValue({ status: 'expired' });
		await service.cleanupAgent('agent', 'project', 'owner');
		expect(owners.detachExecutionOwner).toHaveBeenCalledWith('project', 'agent', 'owner');
		expect(owners.detachExecutionOwner.mock.invocationCallOrder[0]).toBeLessThan(
			executions.hardDeleteByWorkflowId.mock.invocationCallOrder[0],
		);
		expect(executions.hardDeleteByWorkflowId.mock.invocationCallOrder[0]).toBeLessThan(
			owners.deleteDetachedExecutionOwner.mock.invocationCallOrder[0],
		);
	});

	it('does not delete execution data without a private owner', async () => {
		const { service, checkpoints, executions, owners } = setup();
		checkpoints.getStatus.mockResolvedValue({ status: 'expired' });
		await service.cleanupAgent('agent', 'project', null);
		expect(executions.hardDeleteByWorkflowId).not.toHaveBeenCalled();
		expect(owners.detachExecutionOwner).not.toHaveBeenCalled();
		expect(owners.deleteDetachedExecutionOwner).not.toHaveBeenCalled();
	});

	it('marks the loaded settled receipts as consumed after it stops the children', async () => {
		const { service, jobs, checkpoints, background } = setup();
		checkpoints.getStatus.mockResolvedValue({ status: 'expired' });
		await service.cleanupAgent('agent', 'project', null);
		expect(jobs.consumeSettledApprovals).toHaveBeenCalledWith(['job']);
		expect(background.cancelForSession.mock.invocationCallOrder[0]).toBeLessThan(
			jobs.consumeSettledApprovals.mock.invocationCallOrder[0],
		);
		expect(checkpoints.delete.mock.invocationCallOrder[0]).toBeLessThan(
			jobs.consumeSettledApprovals.mock.invocationCallOrder[0],
		);
	});

	it('keeps execution data and its owner when stopping the child fails', async () => {
		const { service, jobs, checkpoints, background, executions, owners } = setup();
		checkpoints.getStatus.mockResolvedValue({ status: 'expired' });
		background.cancelForSession.mockRejectedValue(new Error('Stop unavailable'));
		await expect(service.cleanupAgent('agent', 'project', 'owner')).rejects.toThrow(
			'Stop unavailable',
		);
		expect(jobs.consumeSettledApprovals).not.toHaveBeenCalled();
		expect(owners.detachExecutionOwner).not.toHaveBeenCalled();
		expect(executions.hardDeleteByWorkflowId).not.toHaveBeenCalled();
		expect(owners.deleteDetachedExecutionOwner).not.toHaveBeenCalled();
	});

	it('keeps an owner when another process resumes a suspended checkpoint first', async () => {
		const { service, checkpoints, background, executions, owners } = setup();
		checkpoints.getStatus.mockResolvedValue(suspended());
		checkpoints.cancelSuspended.mockResolvedValue(false);
		await expect(service.cleanupAgent('agent', 'project', 'owner')).rejects.toThrow(
			'still stopping',
		);
		expect(checkpoints.cancelSuspended).toHaveBeenCalled();
		expect(background.cancelForSession).not.toHaveBeenCalled();
		expect(owners.detachExecutionOwner).not.toHaveBeenCalled();
		expect(executions.hardDeleteByWorkflowId).not.toHaveBeenCalled();
	});

	it('keeps an owner while its Agent run is in progress', async () => {
		const { service, checkpoints, executions } = setup();
		checkpoints.getStatus.mockResolvedValue(running());
		await expect(service.cleanupAgent('agent', 'project', 'owner')).rejects.toThrow(
			'still stopping',
		);
		expect(checkpoints.cancelSuspended).not.toHaveBeenCalled();
		expect(executions.hardDeleteByWorkflowId).not.toHaveBeenCalled();
	});

	it('stops the child of a run that ended before it saved a checkpoint', async () => {
		const { service, jobs, checkpoints, background, agentExecutions } = setup();
		checkpoints.getStatus.mockResolvedValue({ status: 'not-found' });
		await service.cleanupAgent('agent', 'project', null);
		expect(agentExecutions.existsRunningByThread).toHaveBeenCalledWith('thread');
		expect(background.cancelForSession).toHaveBeenCalledWith('agent', 'thread');
		expect(jobs.consumeSettledApprovals).toHaveBeenCalledWith(['job']);
	});

	it('waits while the parent run can still save a missing checkpoint', async () => {
		const { service, checkpoints, background, agentExecutions } = setup();
		checkpoints.getStatus.mockResolvedValue({ status: 'not-found' });
		agentExecutions.existsRunningByThread.mockResolvedValue(true);
		await expect(service.cleanupAgent('agent', 'project', null)).rejects.toThrow('still stopping');
		expect(background.cancelForSession).not.toHaveBeenCalled();
	});
});

describe('assertCanCleanupAgent', () => {
	it.each([
		['an expired checkpoint', { status: 'expired' as const }, false],
		['a suspended checkpoint', suspended(), false],
		['a missing checkpoint without a running parent', { status: 'not-found' as const }, false],
	])('accepts %s without changes', async (_label, state, runningParent) => {
		const { service, checkpoints, agentExecutions, jobs, background, owners, executions } = setup();
		checkpoints.getStatus.mockResolvedValue(state);
		agentExecutions.existsRunningByThread.mockResolvedValue(runningParent);
		await expect(service.assertCanCleanupAgent('agent')).resolves.toBeUndefined();
		expect(checkpoints.cancelSuspended).not.toHaveBeenCalled();
		expect(checkpoints.delete).not.toHaveBeenCalled();
		expect(background.cancelForSession).not.toHaveBeenCalled();
		expect(jobs.consumeSettledApprovals).not.toHaveBeenCalled();
		expect(owners.detachExecutionOwner).not.toHaveBeenCalled();
		expect(executions.hardDeleteByWorkflowId).not.toHaveBeenCalled();
	});

	it.each([
		['a running checkpoint', running(), false],
		['a missing checkpoint with a running parent', { status: 'not-found' as const }, true],
	])('rejects %s', async (_label, state, runningParent) => {
		const { service, checkpoints, agentExecutions } = setup();
		checkpoints.getStatus.mockResolvedValue(state);
		agentExecutions.existsRunningByThread.mockResolvedValue(runningParent);
		await expect(service.assertCanCleanupAgent('agent')).rejects.toThrow('still stopping');
	});
});
