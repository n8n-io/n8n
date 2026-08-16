import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

import { AgentInterruptedExecutionSweeper } from '../agent-interrupted-execution-sweeper';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

describe('AgentInterruptedExecutionSweeper', () => {
	it('terminalizes an abandoned running execution', async () => {
		const repository = mock<AgentExecutionRepository>();
		const executionService = mock<AgentExecutionService>();
		const execution = {
			id: 'execution-1',
			threadId: 'thread-1',
			status: 'running',
			startedAt: new Date(0),
			updatedAt: new Date(0),
		} as AgentExecution;
		repository.findRunning.mockResolvedValue([execution]);
		executionService.finalizeInterruptedExecution.mockResolvedValue(true);
		const sweeper = new AgentInterruptedExecutionSweeper(
			mockLogger(),
			repository,
			executionService,
		);

		await sweeper.sweep();

		expect(executionService.finalizeInterruptedExecution).toHaveBeenCalledWith(execution);
	});

	it('leaves a recently active execution running in another process', async () => {
		const repository = mock<AgentExecutionRepository>();
		const executionService = mock<AgentExecutionService>();
		repository.findRunning.mockResolvedValue([
			{
				id: 'execution-1',
				threadId: 'thread-1',
				status: 'running',
				startedAt: new Date(Date.now() - AgentInterruptedExecutionSweeper.LIVENESS_GRACE_MS * 2),
				updatedAt: new Date(),
			} as AgentExecution,
		]);
		const sweeper = new AgentInterruptedExecutionSweeper(
			mockLogger(),
			repository,
			executionService,
		);

		await sweeper.sweep();

		expect(executionService.finalizeInterruptedExecution).not.toHaveBeenCalled();
	});
});
