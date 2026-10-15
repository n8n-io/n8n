import { InstanceAiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { InstanceAiCheckpointPruningTask } from '../instance-ai-checkpoint-pruning.task';
import { InstanceAiModule } from '../instance-ai.module';
import { SelfHealingReconciliationTask } from '../self-healing/self-healing-reconciliation.task';

describe('InstanceAiModule', () => {
	const usePruneInterval = (pruneInterval: number): void => {
		Container.set(
			InstanceAiConfig,
			mock<InstanceAiConfig>({ pruneInterval, selfHealingEnabled: false }),
		);
	};

	it('registers cleanup and recovery when new self-healing runs are disabled', async () => {
		usePruneInterval(3_600_000);

		const tasks = await new InstanceAiModule().systemTasks();

		expect(tasks).toEqual([InstanceAiCheckpointPruningTask, SelfHealingReconciliationTask]);
	});

	it('should register no system task when the prune interval is zero', async () => {
		usePruneInterval(0);

		const tasks = await new InstanceAiModule().systemTasks();

		expect(tasks).toEqual([]);
	});
});
