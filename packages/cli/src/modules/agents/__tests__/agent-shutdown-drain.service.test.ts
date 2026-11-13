import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../agent-execution.service';
import { AgentShutdownDrain } from '../agent-shutdown-drain.service';

describe('AgentShutdownDrain', () => {
	const globalConfig = mock<GlobalConfig>({ generic: { gracefulShutdownTimeout: 10 } });
	const budgetMs = 10_000 * AgentShutdownDrain.DRAIN_BUDGET_RATIO;

	const setup = (localIds: () => string[]) => {
		const executionService = mock<AgentExecutionService>();
		executionService.localExecutionIds.mockImplementation(localIds);
		executionService.interruptLocalExecutions.mockResolvedValue(1);
		const drain = new AgentShutdownDrain(mockLogger(), globalConfig, executionService);
		return { drain, executionService };
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
});
