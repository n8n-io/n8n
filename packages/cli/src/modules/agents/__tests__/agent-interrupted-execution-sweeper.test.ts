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
	const logger = mockLogger();
	const sweeper = new AgentInterruptedExecutionSweeper(
		logger,
		repository,
		executionService,
		backgroundJobService,
		agentWakeService,
		agentsConfig,
	);
	return {
		sweeper,
		repository,
		executionService,
		backgroundJobService,
		agentWakeService,
		logger: logger.scoped('agents'),
	};
}

function staleExecution(id: string): AgentExecution {
	return {
		id,
		threadId: `thread-${id}`,
		status: 'running',
		startedAt: new Date(0),
		updatedAt: new Date(0),
	} as AgentExecution;
}

describe('AgentInterruptedExecutionSweeper', () => {
	afterEach(() => vi.useRealTimers());

	it('terminalizes an abandoned running execution', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:02:00.000Z'));
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

		expect(executionService.finalizeInterruptedExecution).toHaveBeenCalledWith(
			execution,
			new Date('2026-01-01T00:00:00.000Z'),
		);
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

	it('runs full reconciliation when the feature is on, and still reconciles workflow jobs when it is off', async () => {
		const disabled = setup();
		disabled.repository.findRunning.mockResolvedValue([]);
		await disabled.sweeper.sweep();
		expect(disabled.backgroundJobService.reconcile).not.toHaveBeenCalled();
		expect(disabled.backgroundJobService.reconcileWorkflowJobs).toHaveBeenCalled();

		const enabled = setup({ backgroundTasksEnabled: true });
		enabled.repository.findRunning.mockResolvedValue([]);
		await enabled.sweeper.sweep();
		expect(enabled.backgroundJobService.reconcile).toHaveBeenCalled();
		expect(enabled.backgroundJobService.reconcileWorkflowJobs).not.toHaveBeenCalled();
	});

	it('checks for pending job results after reconciliation', async () => {
		const { sweeper, repository, agentWakeService } = setup();
		repository.findRunning.mockResolvedValue([]);

		await sweeper.sweep();

		expect(agentWakeService.drainUnconsumed).toHaveBeenCalled();
	});

	it('stops before the next execution once the run is told to abort', async () => {
		const { sweeper, repository, executionService } = setup();
		const run = new AbortController();
		repository.findRunning.mockResolvedValue([
			staleExecution('execution-1'),
			staleExecution('execution-2'),
		]);
		executionService.finalizeInterruptedExecution.mockImplementation(async () => {
			run.abort();
			return true;
		});

		await sweeper.sweep(run.signal);

		expect(executionService.finalizeInterruptedExecution).toHaveBeenCalledTimes(1);
	});

	it('skips reconciliation and wake drain once the run is told to abort', async () => {
		const { sweeper, repository, executionService, backgroundJobService, agentWakeService } =
			setup();
		const run = new AbortController();
		repository.findRunning.mockResolvedValue([staleExecution('execution-1')]);
		executionService.finalizeInterruptedExecution.mockImplementation(async () => {
			run.abort();
			return true;
		});

		await sweeper.sweep(run.signal);

		expect(backgroundJobService.reconcileWorkflowJobs).not.toHaveBeenCalled();
		expect(agentWakeService.drainUnconsumed).not.toHaveBeenCalled();
	});

	it('skips the wake drain and logs the stop once reconciliation aborts the run', async () => {
		const { sweeper, repository, backgroundJobService, agentWakeService, logger } = setup({
			backgroundTasksEnabled: true,
		});
		const run = new AbortController();
		repository.findRunning.mockResolvedValue([]);
		backgroundJobService.reconcile.mockImplementation(async () => {
			run.abort();
		});

		await sweeper.sweep(run.signal);

		expect(agentWakeService.drainUnconsumed).not.toHaveBeenCalled();
		expect(logger.debug).toHaveBeenCalledWith('Stopped the interrupted execution sweep early', {
			before: 'drain',
		});
	});

	it('hands the signal to reconciliation', async () => {
		const { sweeper, repository, backgroundJobService } = setup({ backgroundTasksEnabled: true });
		const { signal } = new AbortController();
		repository.findRunning.mockResolvedValue([]);

		await sweeper.sweep(signal);

		expect(backgroundJobService.reconcile).toHaveBeenCalledWith(signal);
	});
});
