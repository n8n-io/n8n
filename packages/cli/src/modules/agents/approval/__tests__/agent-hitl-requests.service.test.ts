import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { ExecutionService } from '@/executions/execution.service';
import type { IExecutionResponse } from '@n8n/db';

import type { AgentBackgroundJobService } from '../../background/agent-background-job.service';
import type { AgentBackgroundJob } from '../../entities/agent-background-job.entity';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { AgentBackgroundJobRepository } from '../../repositories/agent-background-job.repository';
import { AgentHitlRequestsService } from '../agent-hitl-requests.service';

describe('Agent approval cancellation', () => {
	function setup() {
		const jobs = mock<AgentBackgroundJobRepository>();
		const jobService = mock<AgentBackgroundJobService>();
		const executions = mock<ExecutionPersistence>();
		const executionService = mock<ExecutionService>();
		const checkpoints = mock<N8NCheckpointStorage>();
		const service = new AgentHitlRequestsService(
			jobs,
			jobService,
			executions,
			executionService,
			checkpoints,
		);
		const job = {
			id: 'request',
			kind: 'approval',
			parentAgentId: 'agent',
			parentThreadId: 'thread',
			parentRunId: 'run',
			childExecutionId: 'child',
		} as AgentBackgroundJob;
		jobs.findById.mockResolvedValue(job);
		executions.findSingleExecution.mockResolvedValue({
			data: {
				parentAgentRun: {
					agentId: 'agent',
					runId: 'run',
					workflowCaller: { executionId: 'parent', workflowId: 'workflow' },
				},
			},
		} as IExecutionResponse);
		return { jobs, jobService, executions, executionService, checkpoints, service, job };
	}

	it('cancels only approval jobs from the selected run', async () => {
		const { jobs, jobService, executionService, checkpoints, service, job } = setup();
		jobs.findByParentThread.mockResolvedValue([
			job,
			{ ...job, id: 'sibling', childExecutionId: 'sibling-child' },
			{ ...job, id: 'other-run', parentRunId: 'other-run' },
			{ ...job, id: 'other-agent', parentAgentId: 'other-agent' },
			{ ...job, id: 'background', kind: 'workflow' },
		]);
		await service.cancel('agent', 'request');
		expect(checkpoints.delete).toHaveBeenCalledWith('run', 'agent');
		expect(executionService.stop).toHaveBeenCalledWith('parent', ['workflow']);
		expect(jobService.cancel.mock.calls).toEqual([
			['thread', 'request'],
			['thread', 'sibling'],
		]);
		expect(jobs.consumeApprovalJob.mock.calls).toEqual([['child'], ['sibling-child']]);
	});

	it('rejects a request from another Agent', async () => {
		const { service, executions, executionService } = setup();
		await expect(service.cancel('other-agent', 'request')).rejects.toThrow(
			'Approval request not found',
		);
		expect(executions.findSingleExecution).not.toHaveBeenCalled();
		expect(executionService.stop).not.toHaveBeenCalled();
	});

	it('does not stop a caller when its approval execution is unavailable', async () => {
		const { service, executions, executionService, checkpoints } = setup();
		executions.findSingleExecution.mockResolvedValue(undefined);
		await expect(service.cancel('agent', 'request')).rejects.toThrow(
			'The approval caller is unavailable',
		);
		expect(executionService.stop).not.toHaveBeenCalled();
		expect(checkpoints.delete).not.toHaveBeenCalled();
	});
});
