import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../agent-execution.service';
import { AgentShutdownDrain, BACKGROUND_JOB_SHUTDOWN_ERROR } from '../agent-shutdown-drain.service';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import type { InProcessTurnRunner } from '../queue/in-process-turn-runner';
import type { QueuedTurnRunner } from '../queue/queued-turn-runner';

describe('AgentShutdownDrain', () => {
	const globalConfig = mock<GlobalConfig>({ generic: { gracefulShutdownTimeout: 10 } });
	const budgetMs = 10_000 * AgentShutdownDrain.DRAIN_BUDGET_RATIO;

	const setup = (
		localIds: () => string[],
		backgroundRuns: () => number = () => 0,
		requestTurns: () => number = () => 0,
		followedTurns: () => number = () => 0,
	) => {
		const executionService = mock<AgentExecutionService>();
		executionService.localExecutionIds.mockImplementation(localIds);
		executionService.interruptLocalExecutions.mockResolvedValue(1);
		const backgroundJobs = mock<AgentBackgroundJobService>();
		Object.defineProperty(backgroundJobs, 'localRunCount', { get: backgroundRuns });
		backgroundJobs.stopLocalRuns.mockResolvedValue(1);
		const inProcessTurns = mock<InProcessTurnRunner>();
		Object.defineProperty(inProcessTurns, 'runningCount', { get: requestTurns });
		const queuedTurns = mock<QueuedTurnRunner>();
		Object.defineProperty(queuedTurns, 'runningCount', { get: () => 0 });
		Object.defineProperty(queuedTurns, 'followedCount', { get: followedTurns });
		const drain = new AgentShutdownDrain(
			mockLogger(),
			globalConfig,
			executionService,
			backgroundJobs,
			inProcessTurns,
			queuedTurns,
		);
		return { drain, executionService, backgroundJobs };
	};

	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('refuses new turns and returns at once when no turn runs', async () => {
		const { drain, executionService } = setup(() => []);

		await drain.drain();

		expect(executionService.beginShutdown).toHaveBeenCalledOnce();
		expect(executionService.interruptLocalExecutions).not.toHaveBeenCalled();
	});

	it('waits for running turns to finish', async () => {
		let running = ['execution-1'];
		const { drain, executionService } = setup(() => running);

		const done = drain.drain();
		await vi.advanceTimersByTimeAsync(1_000);
		running = [];
		await vi.advanceTimersByTimeAsync(AgentShutdownDrain.POLL_INTERVAL_MS);
		await done;

		expect(executionService.interruptLocalExecutions).not.toHaveBeenCalled();
	});

	it('interrupts the turns that do not finish within the budget', async () => {
		const { drain, executionService } = setup(() => ['execution-1']);

		const done = drain.drain();
		await vi.advanceTimersByTimeAsync(budgetMs - 1_000);
		expect(executionService.interruptLocalExecutions).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1_000);
		await done;

		expect(executionService.interruptLocalExecutions).toHaveBeenCalledOnce();
	});

	it('waits for request turns that have no execution yet', async () => {
		let requestTurns = 1;
		const { drain, executionService } = setup(
			() => [],
			() => 0,
			() => requestTurns,
		);

		let finished = false;
		const done = drain.drain().then(() => {
			finished = true;
		});
		await vi.advanceTimersByTimeAsync(1_000);
		expect(finished).toBe(false);
		requestTurns = 0;
		await vi.advanceTimersByTimeAsync(AgentShutdownDrain.POLL_INTERVAL_MS);
		await done;

		expect(executionService.interruptLocalExecutions).not.toHaveBeenCalled();
	});

	it('waits for turns that run on a worker while a caller of this process waits', async () => {
		let followed = 1;
		const { drain, executionService } = setup(
			() => [],
			() => 0,
			() => 0,
			() => followed,
		);

		let finished = false;
		const done = drain.drain().then(() => {
			finished = true;
		});
		await vi.advanceTimersByTimeAsync(1_000);
		expect(finished).toBe(false);
		followed = 0;
		await vi.advanceTimersByTimeAsync(AgentShutdownDrain.POLL_INTERVAL_MS);
		await done;

		expect(executionService.interruptLocalExecutions).not.toHaveBeenCalled();
	});

	it('waits for background sub-agents that run without a turn of their own', async () => {
		let jobs = 1;
		const { drain, backgroundJobs } = setup(
			() => [],
			() => jobs,
		);

		const done = drain.drain();
		await vi.advanceTimersByTimeAsync(1_000);
		jobs = 0;
		await vi.advanceTimersByTimeAsync(AgentShutdownDrain.POLL_INTERVAL_MS);
		await done;

		expect(backgroundJobs.stopLocalRuns).not.toHaveBeenCalled();
	});

	it('fails the background jobs, then interrupts the turns, that do not finish in time', async () => {
		const order: string[] = [];
		const { drain, executionService, backgroundJobs } = setup(
			() => ['execution-1'],
			() => 1,
		);
		backgroundJobs.stopLocalRuns.mockImplementation(async () => {
			order.push('jobs');
			return 1;
		});
		executionService.interruptLocalExecutions.mockImplementation(async () => {
			order.push('turns');
			return 1;
		});

		const done = drain.drain();
		await vi.advanceTimersByTimeAsync(budgetMs);
		await done;

		expect(backgroundJobs.stopLocalRuns).toHaveBeenCalledWith(BACKGROUND_JOB_SHUTDOWN_ERROR);
		expect(order).toEqual(['jobs', 'turns']);
	});
});
