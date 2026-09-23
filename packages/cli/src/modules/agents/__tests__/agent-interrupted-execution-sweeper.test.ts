import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../agent-execution.service';
import { AgentInterruptedExecutionSweeper } from '../agent-interrupted-execution-sweeper';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import type { AgentWakeService } from '../background/agent-wake.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

function setup(options: { backgroundTasksEnabled?: boolean } = {}) {
	const repository = mock<AgentExecutionRepository>();
	const executionService = mock<AgentExecutionService>();
	const backgroundJobService = mock<AgentBackgroundJobService>();
	const agentWakeService = mock<AgentWakeService>();
	const agentsConfig = mock<AgentsConfig>({
		backgroundTasksEnabled: options.backgroundTasksEnabled ?? false,
	});
	const sweeper = new AgentInterruptedExecutionSweeper(
		mockLogger(),
		repository,
		executionService,
		backgroundJobService,
		agentWakeService,
		agentsConfig,
	);
	return { sweeper, repository, executionService, backgroundJobService, agentWakeService };
}

describe('AgentInterruptedExecutionSweeper', () => {
	it('terminalizes an abandoned running execution', async () => {
		const { sweeper, repository, executionService } = setup();
		const execution = {
			id: 'execution-1',
			threadId: 'thread-1',
			status: 'running',
			startedAt: new Date(0),
			updatedAt: new Date(0),
		} as AgentExecution;
		repository.findStaleRunning.mockResolvedValue([execution]);
		executionService.finalizeInterruptedExecution.mockResolvedValue(true);

		await sweeper.sweep();

		expect(executionService.finalizeInterruptedExecution).toHaveBeenCalledWith(execution);
	});

	it('runs full reconciliation when the feature is on, and still reconciles workflow jobs when it is off', async () => {
		const disabled = setup();
		disabled.repository.findStaleRunning.mockResolvedValue([]);
		await disabled.sweeper.sweep();
		expect(disabled.backgroundJobService.reconcile).not.toHaveBeenCalled();
		expect(disabled.backgroundJobService.reconcileWorkflowJobs).toHaveBeenCalled();

		const enabled = setup({ backgroundTasksEnabled: true });
		enabled.repository.findStaleRunning.mockResolvedValue([]);
		await enabled.sweeper.sweep();
		expect(enabled.backgroundJobService.reconcile).toHaveBeenCalled();
		expect(enabled.backgroundJobService.reconcileWorkflowJobs).not.toHaveBeenCalled();
	});

	it('checks for pending job results after reconciliation', async () => {
		const { sweeper, repository, agentWakeService } = setup();
		repository.findStaleRunning.mockResolvedValue([]);

		await sweeper.sweep();

		expect(agentWakeService.drainUnconsumed).toHaveBeenCalled();
	});
});
