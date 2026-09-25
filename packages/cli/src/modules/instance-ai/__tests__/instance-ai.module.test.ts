import { InstanceAiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { InstanceAiCheckpointPruningTask } from '../instance-ai-checkpoint-pruning.task';
import { InstanceAiModule } from '../instance-ai.module';
import { WorkflowSuggestionCleanupTask } from '../workflow-suggestions/workflow-suggestion-cleanup.task';

vi.mock('../instance-ai.service', () => ({ InstanceAiService: class {} }));

describe('InstanceAiModule.systemTasks', () => {
	const module = new InstanceAiModule();
	const cases = [
		{
			config: mock<InstanceAiConfig>({ pruneInterval: 0 }),
			tasks: [WorkflowSuggestionCleanupTask],
		},
		{
			config: mock<InstanceAiConfig>({ pruneInterval: -1 }),
			tasks: [WorkflowSuggestionCleanupTask],
		},
		{
			config: mock<InstanceAiConfig>({ pruneInterval: 3_600_000 }),
			tasks: [WorkflowSuggestionCleanupTask, InstanceAiCheckpointPruningTask],
		},
	];

	afterEach(() => Container.reset());

	it.each(cases)(
		'keeps suggestion cleanup independent of checkpoint interval $config.pruneInterval',
		async ({ config, tasks }) => {
			Container.set(InstanceAiConfig, config);

			await expect(module.systemTasks()).resolves.toEqual(tasks);
		},
	);
});
