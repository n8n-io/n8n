import type { AgentsConfig } from '@n8n/config';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

import { AgentInterruptedExecutionSweeper } from '../agent-interrupted-execution-sweeper';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

function setup(options: { backgroundTasksEnabled?: boolean } = {}) {
	const repository = mock<AgentExecutionRepository>();
	const executionService = mock<AgentExecutionService>();
	const backgroundJobService = mock<AgentBackgroundJobService>();
	const agentsConfig = mock<AgentsConfig>({
		backgroundTasksEnabled: options.backgroundTasksEnabled ?? false,
	});
	const sweeper = new AgentInterruptedExecutionSweeper(
		mockLogger(),
		repository,
		executionService,
		backgroundJobService,
		agentsConfig,
	);
	return { sweeper, repository, executionService, backgroundJobService };
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
		repository.findRunning.mockResolvedValue([execution]);
		executionService.finalizeInterruptedExecution.mockResolvedValue(true);

		await sweeper.sweep();

		expect(executionService.finalizeInterruptedExecution).toHaveBeenCalledWith(execution);
	});

	it('leaves a recently active execution running in another process', async () => {
		const { sweeper, repository, executionService } = setup();
		repository.findRunning.mockResolvedValue([
			{
				id: 'execution-1',
				threadId: 'thread-1',
				status: 'running',
				startedAt: new Date(Date.now() - AgentInterruptedExecutionSweeper.LIVENESS_GRACE_MS * 2),
				updatedAt: new Date(),
			} as AgentExecution,
		]);

		await sweeper.sweep();

		expect(executionService.finalizeInterruptedExecution).not.toHaveBeenCalled();
	});

	it('reconciles background job rows only when the feature is enabled', async () => {
		const disabled = setup();
		disabled.repository.findRunning.mockResolvedValue([]);
		await disabled.sweeper.sweep();
		expect(disabled.backgroundJobService.reconcile).not.toHaveBeenCalled();

		const enabled = setup({ backgroundTasksEnabled: true });
		enabled.repository.findRunning.mockResolvedValue([]);
		await enabled.sweeper.sweep();
		expect(enabled.backgroundJobService.reconcile).toHaveBeenCalled();
	});
});
