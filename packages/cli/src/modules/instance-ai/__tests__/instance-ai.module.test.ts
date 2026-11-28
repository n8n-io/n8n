import { GlobalConfig, InstanceAiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { AssistantUsagePruningTask } from '../assistant-usage/assistant-usage-pruning.task';
import { InstanceAiCheckpointPruningTask } from '../instance-ai-checkpoint-pruning.task';
import { InstanceAiModule } from '../instance-ai.module';
import { SelfHealingConfigurationSnapshotTask } from '../self-healing/self-healing-configuration-snapshot.task';
import { SelfHealingReconciliationTask } from '../self-healing/self-healing-reconciliation.task';

describe('InstanceAiModule', () => {
	const usePruneInterval = (pruneInterval: number, usageMaxAgeDays = 0): void => {
		Container.set(
			InstanceAiConfig,
			mock<InstanceAiConfig>({ pruneInterval, usageMaxAgeDays, workflowSuggestionsEnabled: false }),
		);
	};

	it('registers cleanup and recovery when new self-healing runs are disabled', async () => {
		usePruneInterval(3_600_000);

		const tasks = await new InstanceAiModule().systemTasks();

		expect(tasks).toEqual([SelfHealingReconciliationTask, InstanceAiCheckpointPruningTask]);
	});

	it.each([true, false])(
		'schedules the configuration snapshot only with telemetry on (%s)',
		async (enabled) => {
			Container.set(
				InstanceAiConfig,
				mock<InstanceAiConfig>({
					pruneInterval: 0,
					usageMaxAgeDays: 0,
					workflowSuggestionsEnabled: true,
				}),
			);
			Container.set(GlobalConfig, mock<GlobalConfig>({ diagnostics: { enabled } }));

			const tasks = await new InstanceAiModule().systemTasks();

			expect(tasks.includes(SelfHealingConfigurationSnapshotTask)).toBe(enabled);
		},
	);

	it('keeps reconciliation scheduled when data pruning is disabled', async () => {
		usePruneInterval(0);

		const tasks = await new InstanceAiModule().systemTasks();

		expect(tasks).toEqual([SelfHealingReconciliationTask]);
	});

	it('schedules the pruning of Assistant usage records only with a retention period', async () => {
		usePruneInterval(0, 30);
		const withRetention = await new InstanceAiModule().systemTasks();
		usePruneInterval(0, 0);
		const keepForever = await new InstanceAiModule().systemTasks();

		expect(withRetention).toEqual([SelfHealingReconciliationTask, AssistantUsagePruningTask]);
		expect(keepForever).toEqual([SelfHealingReconciliationTask]);
	});
});
