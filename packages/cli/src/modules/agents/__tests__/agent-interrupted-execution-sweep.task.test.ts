import type { SystemTask } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import { AgentInterruptedExecutionSweepTask } from '../agent-interrupted-execution-sweep.task';
import type { AgentInterruptedExecutionSweeper } from '../agent-interrupted-execution-sweeper';

describe('AgentInterruptedExecutionSweepTask', () => {
	const sweeper = mock<AgentInterruptedExecutionSweeper>();
	const task: SystemTask = new AgentInterruptedExecutionSweepTask(sweeper);

	it('declares the liveness grace as a durable cluster cadence', () => {
		expect(task.name).toBe('agent-interrupted-execution-sweep');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 120 });
		expect(task.target).toEqual({
			scope: 'cluster',
			scheduler: { retryOnFailure: true },
			leaderTimer: { runOnTakeover: true },
		});
	});

	it('hands the signal to the sweeper', async () => {
		const { signal } = new AbortController();

		await task.run(signal);

		expect(sweeper.sweep).toHaveBeenCalledWith(signal);
	});
});
