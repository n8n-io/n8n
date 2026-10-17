import { EventService } from '@n8n/backend-services';
import type { CredentialProvider } from '@n8n/agents';
import type { AgentIntegrationConfig, AgentTaskConfig } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

import {
	AgentModificationTelemetryService,
	type AgentModificationEvent,
} from './agent-modification-telemetry.service';
import { AgentUpdateBroadcaster } from './agent-update-broadcaster';
import { syncAgentIntegrations } from './integrations/integrations-sync';

/** Run save effects only after the complete draft write commits. */
@Service()
export class AgentSaveCompletionService {
	constructor(
		private readonly eventService: EventService,
		private readonly broadcaster: AgentUpdateBroadcaster,
		private readonly modificationTelemetry: AgentModificationTelemetryService,
	) {}

	async definitionSaved(
		event: AgentModificationEvent,
		previousIntegrations: AgentIntegrationConfig[],
		credentialProvider: CredentialProvider,
		tasks: ReadonlyMap<string, AgentTaskConfig>,
	): Promise<void> {
		const { AgentSetupCompletionService } = await import('./agent-setup-completion.service.js');
		let emitSetupCompleted: (() => Promise<void>) | null = null;
		try {
			emitSetupCompleted = await Container.get(AgentSetupCompletionService).recordIfSetupComplete(
				event.agent,
				event.config?.skills,
				event.projectId,
				credentialProvider,
				event.user,
				tasks,
			);
		} catch (error) {
			Container.get(Logger).warn('Failed to check Agent setup completion', {
				agentId: event.agent.id,
				error,
			});
		}
		await this.configurationSaved(event, undefined, emitSetupCompleted);
		await syncAgentIntegrations(
			event.agent,
			previousIntegrations,
			event.agent.integrations,
			Container.get(Logger),
		);
	}

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
