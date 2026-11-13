import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../agent-execution.service';
import { AgentInterruptedExecutionSweeper } from '../agent-interrupted-execution-sweeper';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import type { AgentWakeService } from '../background/agent-wake.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { testCluster, type TestClusterOptions } from './test-utils/cluster';

function setup(options: { backgroundTasksEnabled?: boolean; cluster?: TestClusterOptions } = {}) {
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
		testCluster(options.cluster),
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

		expect(executionService.finalizeInterruptedExecution).toHaveBeenCalledWith(execution, {
			staleBefore: new Date('2026-01-01T00:00:00.000Z'),
		});
	});

	it('leaves a recently active execution running in another process', async () => {
		const { sweeper, repository, executionService } = setup();
		repository.findRunning.mockResolvedValue([
			{
				id: 'execution-1',
				threadId: 'thread-1',
				status: 'running',
				startedAt: new Date(
					Date.now() - AgentInterruptedExecutionSweeper.LIVENESS_GRACE_SECONDS * 2 * 1000,
				),
				updatedAt: new Date(),
			} as AgentExecution,
		]);

		await sweeper.sweep();

		expect(executionService.finalizeInterruptedExecution).not.toHaveBeenCalled();
	});

	describe('owner check', () => {
		const now = new Date('2026-01-01T00:10:00.000Z');
		const ownedRow = (ownerKey: string, secondsAgo: number) =>
			({
				id: `execution-${ownerKey}`,
				threadId: 'thread-1',
				status: 'running',
				startedAt: new Date(0),
				updatedAt: new Date(now.getTime() - secondsAgo * 1000),
				ownerKey,
			}) as AgentExecution;

		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(now);
		});

		it('interrupts a turn whose owner left the registry after the short grace', async () => {
			const { sweeper, repository, executionService } = setup({
				cluster: { instanceKey: 'main-a', activeInstanceKeys: ['main-a'] },
			});
			const row = ownedRow('worker-gone', 50);
			repository.findRunning.mockResolvedValue([row]);

			await sweeper.sweep();

			expect(executionService.finalizeInterruptedExecution).toHaveBeenCalledWith(row, {
				staleBefore: new Date(
					now.getTime() - AgentInterruptedExecutionSweeper.OWNER_GONE_GRACE_SECONDS * 1000,
				),
			});
		});

		it('keeps a turn whose owner left the registry but still heartbeats the row', async () => {
			const { sweeper, repository, executionService } = setup({
				cluster: { instanceKey: 'main-a', activeInstanceKeys: ['main-a'] },
			});
			repository.findRunning.mockResolvedValue([ownedRow('worker-gone', 10)]);

			await sweeper.sweep();

			expect(executionService.finalizeInterruptedExecution).not.toHaveBeenCalled();
		});

		it('uses the liveness grace for a turn whose owner is alive', async () => {
			const { sweeper, repository, executionService } = setup({
				cluster: { instanceKey: 'main-a', activeInstanceKeys: ['main-a', 'worker-b'] },
			});
			repository.findRunning.mockResolvedValue([ownedRow('worker-b', 50)]);

			await sweeper.sweep();

			expect(executionService.finalizeInterruptedExecution).not.toHaveBeenCalled();
		});

		it('ignores the registry when its read does not contain this process', async () => {
			const { sweeper, repository, executionService } = setup({
				cluster: { instanceKey: 'main-a', activeInstanceKeys: [] },
			});
			repository.findRunning.mockResolvedValue([ownedRow('worker-b', 50)]);

			await sweeper.sweep();

			expect(executionService.finalizeInterruptedExecution).not.toHaveBeenCalled();
		});
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
