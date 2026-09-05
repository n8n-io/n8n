import type { InstanceAiConfig } from '@n8n/config';
import type { IntervalSchedule } from '@n8n/scheduler';
import { validateSchedule } from '@n8n/scheduler';
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

	it.each([
		{ pruneInterval: 1_500, expected: 2 },
		{ pruneInterval: 500, expected: 1 },
		{ pruneInterval: 1, expected: 1 },
	])(
		'should schedule a whole number of seconds for a prune interval of $pruneInterval ms',
		({ pruneInterval, expected }) => {
			const task = new InstanceAiCheckpointPruningTask(
				mock<InstanceAiConfig>({ pruneInterval }),
				instanceAiService,
			);

			expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: expected });
			expect(() => validateSchedule(task.schedule as IntervalSchedule)).not.toThrow();
		},
	);

	it('should prune expired data on run', async () => {
		await task.run();

		expect(instanceAiService.pruneExpiredData).toHaveBeenCalledTimes(1);
	});
});
