import { GlobalConfig, InstanceAiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { InstanceAiCheckpointPruningTask } from '../instance-ai-checkpoint-pruning.task';
import { InstanceAiModule } from '../instance-ai.module';
import { SelfHealingAgentSweepTask } from '../self-healing/agents/self-healing-agent-sweep.task';
import { SelfHealingConfigurationSnapshotTask } from '../self-healing/self-healing-configuration-snapshot.task';
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

		expect(tasks).toEqual([SelfHealingReconciliationTask, InstanceAiCheckpointPruningTask]);
	});

	it.each([true, false])(
		'schedules the configuration snapshot only with telemetry on (%s)',
		async (enabled) => {
			Container.set(
				InstanceAiConfig,
				mock<InstanceAiConfig>({ pruneInterval: 0, workflowSuggestionsEnabled: true }),
			);
			Container.set(GlobalConfig, mock<GlobalConfig>({ diagnostics: { enabled } }));

			const tasks = await new InstanceAiModule().systemTasks();

			expect(tasks.includes(SelfHealingConfigurationSnapshotTask)).toBe(enabled);
		},
	);

	it.each([true, false])(
		'schedules the agent sweep only with self-healing on (%s)',
		async (workflowSuggestionsEnabled) => {
			Container.set(
				InstanceAiConfig,
				mock<InstanceAiConfig>({ pruneInterval: 0, workflowSuggestionsEnabled }),
			);
			Container.set(GlobalConfig, mock<GlobalConfig>({ diagnostics: { enabled: false } }));

			const tasks = await new InstanceAiModule().systemTasks();

			expect(tasks.includes(SelfHealingAgentSweepTask)).toBe(workflowSuggestionsEnabled);
		},
	);

	it('keeps reconciliation scheduled when data pruning is disabled', async () => {
		usePruneInterval(0);

		const tasks = await new InstanceAiModule().systemTasks();

		expect(tasks).toEqual([SelfHealingReconciliationTask]);
	});
});
