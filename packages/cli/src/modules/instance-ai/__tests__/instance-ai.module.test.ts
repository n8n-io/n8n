import { InstanceAiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { InstanceAiCheckpointPruningTask } from '../instance-ai-checkpoint-pruning.task';
import { InstanceAiModule } from '../instance-ai.module';

describe('InstanceAiModule', () => {
	const usePruneInterval = (pruneInterval: number): void => {
		Container.set(InstanceAiConfig, mock<InstanceAiConfig>({ pruneInterval }));
	};

	it('should register the checkpoint pruning system task when pruning is on', async () => {
		usePruneInterval(3_600_000);

		const tasks = await new InstanceAiModule().systemTasks();

		expect(tasks).toEqual([InstanceAiCheckpointPruningTask]);
	});

	it('should register no system task when the prune interval is zero', async () => {
		usePruneInterval(0);

		const tasks = await new InstanceAiModule().systemTasks();

		expect(tasks).toEqual([]);
	});
});
