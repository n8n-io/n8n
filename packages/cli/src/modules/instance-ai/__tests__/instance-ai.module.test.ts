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
			mock<InstanceAiConfig>({ pruneInterval, workflowSuggestionsEnabled: false }),
		);
	};

	it('registers cleanup and recovery when new self-healing runs are disabled', async () => {
		usePruneInterval(3_600_000);

		const tasks = await new InstanceAiModule().systemTasks();

		expect(tasks).toEqual([InstanceAiCheckpointPruningTask, SelfHealingReconciliationTask]);
	});

	it('keeps reconciliation scheduled when data pruning is disabled', async () => {
		usePruneInterval(0);

		const tasks = await new InstanceAiModule().systemTasks();

		expect(tasks).toEqual([SelfHealingReconciliationTask]);
	});
});
