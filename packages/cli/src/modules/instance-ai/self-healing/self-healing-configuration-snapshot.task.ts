import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { Telemetry } from '@/telemetry';

import { SelfHealingConfigurationRepository } from './database/self-healing-configuration.repository';

/**
 * Sends the "Instance reported self healing configuration" telemetry event. Change events
 * miss deleted projects and new workflows, so the snapshot is the source for current counts.
 * The module registers this task only when self-healing and telemetry are on.
 */
@SystemTask()
export class SelfHealingConfigurationSnapshotTask implements SystemTask {
	readonly name = 'self-healing-configuration-snapshot';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(Time.days.toSeconds);

	// Same delivery rules as `agent-knowledge-snapshot`: the event describes the whole instance.
	readonly target = clusterTarget({
		scheduler: {
			/** A repeat sends the same counts twice. */
			retryOnFailure: false,
			/** A late snapshot still describes the instance correctly. */
			missedAfterSeconds: Time.hours.toSeconds,
			/** An outage past the grace still sends one catch-up snapshot. */
			catchUp: true,
		},
	});

	constructor(
		private readonly configurations: SelfHealingConfigurationRepository,
		private readonly telemetry: Telemetry,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		// An instance with zero configurations still reports, to count where the feature is available.
		const counts = await this.configurations.getAdoptionCounts();
		if (signal.aborted) return;

		this.telemetry.track(
			TELEMETRY_EVENT.SELF_HEALING.INSTANCE_REPORTED_SELF_HEALING_CONFIGURATION,
			{
				configuration_count: counts.configurationCount,
				enabled_project_count: counts.enabledProjectCount,
				all_scope_count: counts.allScopeCount,
				selected_scope_count: counts.selectedScopeCount,
				watched_workflow_count: counts.watchedWorkflowCount,
				include_sub_workflows_count: counts.includeSubWorkflowsCount,
			},
		);
	}
}
