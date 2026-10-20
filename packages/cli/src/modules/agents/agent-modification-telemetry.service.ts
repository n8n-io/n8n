// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { EventService } from '@n8n/backend-services';
// EOF Experiment cleanup
import type { AgentActor, AgentIntegrationConfig, AgentJsonConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import isEqual from 'lodash/isEqual';

import { Telemetry } from '@/telemetry';

import { buildAgentCapabilityTelemetryProperties } from './agent-telemetry';
import type { Agent } from './entities/agent.entity';
import { toAgentDocument, type AgentSkillRefs } from './json-config/agent-document';

export type { AgentActor } from '@n8n/api-types';

/** Context passed to canonical mutating sidecar services. */
export type AgentMutationTelemetryContext = {
	user: User;
	modifiedBy: AgentActor;
	/** Push connection of the tab that made the change; excluded from the `agentUpdated` broadcast. */
	pushRef?: string;
};

export type AgentConfigPart =
	| 'instructions'
	| 'model'
	| 'credential'
	| 'memory'
	| 'name'
	| 'config'
	| 'tools'
	| 'providerTools'
	| 'skills'
	| 'tasks'
	| 'triggers'
	| 'subAgents'
	| 'mcpServers'
	| 'vectorStores';

/** Declaration order of the telemetry enum, so payloads are stable. */
const CONFIG_PARTS = [
	'instructions',
	'model',
	'credential',
	'memory',
	'name',
	'config',
	'tools',
	'providerTools',
	'skills',
	'tasks',
	'triggers',
	'subAgents',
	'mcpServers',
	'vectorStores',
] as const satisfies readonly AgentConfigPart[];

/**
 * Which parts a config write actually changed. `triggers` is derived from the
 * integrations instead of the schema because `decomposeJsonConfig` splits
 * integrations out of the schema before it is persisted. `personalisation` is
 * deliberately absent: it is cosmetic. Sidecar body flags cover tool/skill/task
 * bodies that live outside the schema refs.
 */
export function diffAgentConfigParts(
	previousSchema: AgentJsonConfig | null,
	nextSchema: AgentJsonConfig | null,
	previousIntegrations: AgentIntegrationConfig[],
	nextIntegrations: AgentIntegrationConfig[],
	sidecarChanges: AgentSidecarChanges = {},
): AgentConfigPart[] {
	return CONFIG_PARTS.filter((part) => {
		if (part === 'triggers') return !isEqual(previousIntegrations, nextIntegrations);
		if ((part === 'tools' || part === 'skills' || part === 'tasks') && sidecarChanges[part]) {
			return true;
		}
		return !isEqual(previousSchema?.[part], nextSchema?.[part]);
	});
}

export interface AgentModificationEvent {
	/** Post-save entity, so the reported profile is the one that landed. */
	agent: Agent;
	/** Post-save JSON document of the draft, with the skill refs. */
	config: AgentJsonConfig | null;
	projectId: string;
	user: User;
	by: AgentActor;
	changedParts: AgentConfigPart[];
}

export type AgentCreationEvent = Omit<AgentModificationEvent, 'changedParts'>;

export type AgentSidecarChanges = Partial<Record<'tools' | 'skills' | 'tasks', boolean>>;

export function buildAgentMutationEvent(
	agent: Agent,
	skillRefs: AgentSkillRefs,
	projectId: string,
	context: AgentMutationTelemetryContext,
	changedParts: AgentConfigPart[],
): AgentModificationEvent {
	const config = agent.schema ? toAgentDocument(agent.schema, skillRefs) : null;
	return {
		agent,
		config,
		projectId,
		user: context.user,
		by: context.modifiedBy,
		changedParts,
	};
}

function modificationProperties({
	agent,
	config,
	projectId,
	user,
	changedParts,
}: AgentModificationEvent) {
	return {
		agent_id: agent.id,
		project_id: projectId,
		user_id: user.id,
		changed_parts: changedParts,
		...buildAgentCapabilityTelemetryProperties(config, agent.integrations),
		has_published_version: Boolean(agent.activeVersionId),
	} as const;
}

/** Reports committed Agent creations and subsequent configuration changes. */
@Service()
export class AgentModificationTelemetryService {
	constructor(
		private readonly telemetry: Telemetry,
		// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
		private readonly eventService: EventService,
		// EOF Experiment cleanup
	) {}

	record(event: AgentModificationEvent): void {
		if (event.changedParts.length === 0) return;
		try {
			const { by } = event;
			const properties = modificationProperties(event);
			// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
			this.recordAssistantActivity(event, properties.capability_count, event.changedParts);
			// EOF Experiment cleanup

			const entry = {
				user: TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
				builder: TELEMETRY_EVENT.AGENTS.BUILDER_MODIFIED_AGENT,
				mcp: TELEMETRY_EVENT.AGENTS.MCP_MODIFIED_AGENT,
			}[by];
			this.telemetry.track(entry, { ...properties, event_version: '2' });
		} catch {
			// Telemetry must never fail a write that already succeeded.
		}
	}

	recordCreation(event: AgentCreationEvent): void {
		try {
			const changedParts = diffAgentConfigParts(
				null,
				event.config,
				[],
				event.agent.integrations ?? [],
			);
			const properties = modificationProperties({ ...event, changedParts });
			// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
			this.recordAssistantActivity(event, properties.capability_count);
			// EOF Experiment cleanup
			this.trackCreation(event.by, properties);
		} catch {
			// Telemetry must never fail a write that already succeeded.
		}
	}

	// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
	private recordAssistantActivity(
		event: AgentCreationEvent,
		capabilityCount: number,
		changedParts?: AgentConfigPart[],
	): void {
		if (event.by !== 'builder') return;
		// Empty shells and cosmetic changes alone do not count as Assistant use.
		if (
			!event.config?.model?.trim() &&
			!event.config?.instructions?.trim() &&
			capabilityCount === 0 &&
			!changedParts?.some((part) => part !== 'name')
		) {
			return;
		}
		this.eventService.emit('experiment-assistant-change-saved', {
			userId: event.user.id,
			at: Date.now(),
		});
	}
	// EOF Experiment cleanup

	private trackCreation(
		by: AgentActor,
		properties: ReturnType<typeof modificationProperties>,
	): void {
		// Creation events use different versions. Keep each payload tied to its event.
		switch (by) {
			case 'user':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT, {
					...properties,
					event_version: '3',
				});
				return;
			case 'builder':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.BUILDER_CREATED_AGENT, {
					...properties,
					event_version: '3',
				});
				return;
			case 'mcp':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.MCP_CREATED_AGENT, {
					...properties,
					event_version: '2',
				});
				return;
		}
	}
}
