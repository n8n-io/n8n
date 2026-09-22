import type { AgentActor, AgentIntegrationConfig, AgentJsonConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import isEqual from 'lodash/isEqual';

import { Telemetry } from '@/telemetry';

import { buildAgentCapabilityTelemetryProperties } from './agent-telemetry';
import type { Agent } from './entities/agent.entity';
import { isUnconfiguredAgent } from './utils/agent-capabilities';

export { isUnconfiguredAgent };

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
	sidecarChanges: Partial<Record<'tools' | 'skills' | 'tasks', boolean>> = {},
): AgentConfigPart[] {
	return CONFIG_PARTS.filter((part) => {
		if (part === 'triggers') return !isEqual(previousIntegrations, nextIntegrations);
		if ((part === 'tools' || part === 'skills' || part === 'tasks') && sidecarChanges[part]) {
			return true;
		}
		return !isEqual(previousSchema?.[part], nextSchema?.[part]);
	});
}

interface AgentModificationEvent {
	/** Post-save entity, so the reported profile is the one that landed. */
	agent: Agent;
	projectId: string;
	user: User;
	by: AgentActor;
	changedParts: AgentConfigPart[];
	/**
	 * Whether the agent was still unconfigured before this write. The write
	 * that leaves it configured is what creates it as far as telemetry is
	 * concerned, so it reports the creation event for `by` instead of the
	 * modification one — a write is never counted as both.
	 */
	wasUnconfigured: boolean;
}

export function captureAgentMutation(agent: Agent) {
	const schema = agent.schema ?? null;
	const integrations = agent.integrations ?? [];
	return { schema, integrations, wasUnconfigured: isUnconfiguredAgent(schema, integrations) };
}

export type AgentMutationSnapshot = ReturnType<typeof captureAgentMutation>;

export function buildAgentMutationEvent(
	agent: Agent,
	projectId: string,
	context: AgentMutationTelemetryContext,
	previous: AgentMutationSnapshot,
	sidecarChanges: Partial<Record<'tools' | 'skills' | 'tasks', boolean>>,
): AgentModificationEvent {
	return {
		agent,
		projectId,
		user: context.user,
		by: context.modifiedBy,
		changedParts: diffAgentConfigParts(
			previous.schema,
			agent.schema,
			previous.integrations,
			agent.integrations ?? [],
			sidecarChanges,
		),
		wasUnconfigured: previous.wasUnconfigured,
	};
}

function modificationProperties({ agent, projectId, user, changedParts }: AgentModificationEvent) {
	return {
		agent_id: agent.id,
		project_id: projectId,
		user_id: user.id,
		changed_parts: changedParts,
		...buildAgentCapabilityTelemetryProperties(agent.schema, agent.integrations),
		has_published_version: Boolean(agent.activeVersionId),
	} as const;
}

/**
 * Single emitter for the six agent creation and modification events. Every
 * config write reports through here, so the only things that differ between
 * them are the surface that wrote and whether the write was the agent's first —
 * and a union across all six is complete.
 */
@Service()
export class AgentModificationTelemetryService {
	constructor(private readonly telemetry: Telemetry) {}

	record(event: AgentModificationEvent): void {
		if (event.changedParts.length === 0) return;
		try {
			const { agent, by, wasUnconfigured } = event;
			if (wasUnconfigured && isUnconfiguredAgent(agent.schema, agent.integrations)) return;

			const properties = modificationProperties(event);
			if (wasUnconfigured) {
				this.recordCreation(by, properties);
				return;
			}

			const entry = {
				user: TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
				builder: TELEMETRY_EVENT.AGENTS.BUILDER_MODIFIED_AGENT,
				mcp: TELEMETRY_EVENT.AGENTS.MCP_MODIFIED_AGENT,
			}[by];
			this.telemetry.track(entry, { ...properties, event_version: '1' });
		} catch {
			// Telemetry must never fail a write that already succeeded.
		}
	}

	private recordCreation(
		by: AgentActor,
		properties: ReturnType<typeof modificationProperties>,
	): void {
		// Creation events use different versions. Keep each payload tied to its event.
		switch (by) {
			case 'user':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT, {
					...properties,
					event_version: '2',
				});
				return;
			case 'builder':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.BUILDER_CREATED_AGENT, {
					...properties,
					event_version: '2',
				});
				return;
			case 'mcp':
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.MCP_CREATED_AGENT, {
					...properties,
					event_version: '1',
				});
				return;
		}
	}
}
