import { EventService } from '@n8n/backend-services';
import { Container, Service } from '@n8n/di';

import {
	AgentModificationTelemetryService,
	type AgentModificationEvent,
} from './agent-modification-telemetry.service';
import { AgentUpdateBroadcaster } from './agent-update-broadcaster';

/** Run save effects only after the complete draft write commits. */
@Service()
export class AgentSaveCompletionService {
	constructor(
		private readonly eventService: EventService,
		private readonly broadcaster: AgentUpdateBroadcaster,
		private readonly modificationTelemetry: AgentModificationTelemetryService,
	) {}

	async configurationSaved(
		event: AgentModificationEvent,
		pushRef: string | undefined,
		emitSetupCompleted: (() => Promise<void>) | null,
	): Promise<void> {
		await this.clearRuntimes(event.agent.id);
		this.eventService.emit('agent-saved', { agentId: event.agent.id });
		this.notify(event, pushRef);
		await emitSetupCompleted?.();
	}

	async bodySaved(
		event: AgentModificationEvent,
		pushRef?: string,
		recordTelemetry = true,
	): Promise<void> {
		await this.clearRuntimes(event.agent.id);
		this.notify(event, pushRef, recordTelemetry);
	}

	// Task bodies are read for each run. A draft task edit does not change scheduling.
	taskSaved(event: AgentModificationEvent, pushRef?: string): void {
		this.notify(event, pushRef);
	}

	private notify(event: AgentModificationEvent, pushRef?: string, recordTelemetry = true): void {
		this.broadcaster.notify(
			{ projectId: event.projectId, agentId: event.agent.id, source: event.by },
			pushRef,
		);
		if (recordTelemetry) this.modificationTelemetry.record(event);
	}

	private async clearRuntimes(agentId: string): Promise<void> {
		const { AgentRuntimeCacheService } = await import('./agent-runtime-cache.service.js');
		Container.get(AgentRuntimeCacheService).clearRuntimes(agentId);
	}
}
