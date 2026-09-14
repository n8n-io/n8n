import type { InstanceAiConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { InstanceAiCheckpointPruningTask } from '../instance-ai-checkpoint-pruning.task';
import type { InstanceAiService } from '../instance-ai.service';

describe('InstanceAiCheckpointPruningTask', () => {
	const config = mock<InstanceAiConfig>({ pruneInterval: 60 * 60 * 1000 });
	const instanceAiService = mock<InstanceAiService>();
	const task = new InstanceAiCheckpointPruningTask(config, instanceAiService);

	it('should declare the configured prune cadence', () => {
		expect(task.name).toBe('instance-ai-checkpoint-pruning');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
		expect(task.runOnTakeover).toBe(true);
		expect(task.retryDelaySeconds).toBe(30);
	});

	it('should declare a fractional prune interval as is', () => {
		const task = new InstanceAiCheckpointPruningTask(
			mock<InstanceAiConfig>({ pruneInterval: 1_500 }),
			instanceAiService,
		);

		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 1.5 });
	});

	it('should prune expired data on run and pass the signal through', async () => {
		const { signal } = new AbortController();

		await task.run(signal);

		expect(instanceAiService.pruneExpiredData).toHaveBeenCalledTimes(1);
		expect(instanceAiService.pruneExpiredData).toHaveBeenCalledWith(expect.any(Number), signal);
	});
});
