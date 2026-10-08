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
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: true, runOnTakeover: true });
		expect(task.retryDelaySeconds).toBeUndefined();
	});

	it('hands the signal to the sweeper', async () => {
		const { signal } = new AbortController();

		await task.run(signal, { durable: true });

		expect(sweeper.sweep).toHaveBeenCalledWith(signal);
	});
});
