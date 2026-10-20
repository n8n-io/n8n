import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { Telemetry } from '@/telemetry';

import { AgentKnowledgeSnapshotService } from './agent-knowledge-snapshot.service';

/**
 * Sends the "Agent knowledge snapshot" telemetry event: how many published
 * agents use knowledge files or vector stores. The agents module registers
 * this task only when telemetry is on.
 */
@SystemTask()
export class AgentKnowledgeSnapshotTask implements SystemTask {
	readonly name = 'agent-knowledge-snapshot';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(6 * Time.hours.toSeconds);

	// Same delivery rules as `telemetry-pulse`: the event describes the whole instance.
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
		private readonly snapshotService: AgentKnowledgeSnapshotService,
		private readonly telemetry: Telemetry,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		const snapshot = await this.snapshotService.collect(signal);

		// Make sure an aborted run sends no partial counts, so it cannot overlap with the next run.
		if (signal.aborted) {
			return;
		}

		this.telemetry.track(TELEMETRY_EVENT.AGENTS.AGENT_KNOWLEDGE_SNAPSHOT, snapshot);
	}
}
