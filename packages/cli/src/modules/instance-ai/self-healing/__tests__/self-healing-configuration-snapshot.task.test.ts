import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import type { SelfHealingConfigurationRepository } from '../database/self-healing-configuration.repository';
import { SelfHealingConfigurationSnapshotTask } from '../self-healing-configuration-snapshot.task';

describe('SelfHealingConfigurationSnapshotTask', () => {
	const event = TELEMETRY_EVENT.SELF_HEALING.INSTANCE_REPORTED_SELF_HEALING_CONFIGURATION;
	const telemetry = mock<Telemetry>();
	const configurations = mock<SelfHealingConfigurationRepository>();
	const task = new SelfHealingConfigurationSnapshotTask(configurations, telemetry);

	beforeEach(() => vi.resetAllMocks());

	const counts = {
		configurationCount: 5,
		enabledProjectCount: 4,
		allScopeCount: 3,
		selectedScopeCount: 1,
		watchedWorkflowCount: 20,
	};

	it('sends the current counts', async () => {
		configurations.getAdoptionCounts.mockResolvedValue(counts);

		await task.run(new AbortController().signal);

		const properties = {
			configuration_count: 5,
			enabled_project_count: 4,
			all_scope_count: 3,
			selected_scope_count: 1,
			watched_workflow_count: 20,
		};
		expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(event, properties);
		expect(event.getValidationError(properties)).toBeNull();
	});

	it('sends zero counts for an instance without configurations', async () => {
		configurations.getAdoptionCounts.mockResolvedValue({
			configurationCount: 0,
			enabledProjectCount: 0,
			allScopeCount: 0,
			selectedScopeCount: 0,
			watchedWorkflowCount: 0,
		});

		await task.run(new AbortController().signal);

		expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(event, {
			configuration_count: 0,
			enabled_project_count: 0,
			all_scope_count: 0,
			selected_scope_count: 0,
			watched_workflow_count: 0,
		});
	});

	it('sends nothing when the run is aborted while it reads the counts', async () => {
		const controller = new AbortController();
		configurations.getAdoptionCounts.mockImplementation(async () => {
			controller.abort();
			return counts;
		});

		await task.run(controller.signal);

		expect(telemetry.track).not.toHaveBeenCalled();
	});
});
