import { mock } from 'vitest-mock-extended';

import { AgentCheckpointPruningTask } from '../agent-checkpoint-pruning.task';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';

describe('AgentCheckpointPruningTask', () => {
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const task = new AgentCheckpointPruningTask(checkpointStorage);

	it('should declare an hourly prune cadence', () => {
		expect(task.name).toBe('agent-checkpoint-pruning');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
		expect(task.runOnTakeover).toBe(true);
		expect(task.retryDelaySeconds).toBe(30);
	});

	it('should prune stale suspensions on run', async () => {
		await task.run();

		expect(checkpointStorage.pruneStaleSuspensions).toHaveBeenCalledTimes(1);
	});
});
