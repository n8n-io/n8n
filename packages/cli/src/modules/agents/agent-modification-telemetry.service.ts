import type { AgentIntegrationConfig, AgentJsonConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import isEqual from 'lodash/isEqual';

import { Telemetry } from '@/telemetry';

import { buildAgentConfigurationTelemetryFromConfig } from './agent-telemetry';
import type { Agent } from './entities/agent.entity';
import {
	configuredCapabilityKinds,
	countAgentCapabilities,
	totalAgentCapabilities,
} from './utils/agent-capabilities';

export type AgentModifiedBy = 'user' | 'builder' | 'mcp';

export type AgentConfigPart =
	| 'instructions'
	| 'model'
	| 'credential'
	| 'memory'
	| 'name'
	| 'config'
	| 'tools'
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
 * integrations out of the schema before it is persisted. `personalisation` and
 * `providerTools` are deliberately absent: the first is cosmetic, and the
 * second is reconciled from `config.webSearch` rather than set directly.
 */
export function diffAgentConfigParts(
	previousSchema: AgentJsonConfig | null,
	nextSchema: AgentJsonConfig | null,
	previousIntegrations: AgentIntegrationConfig[],
	nextIntegrations: AgentIntegrationConfig[],
): AgentConfigPart[] {
	return CONFIG_PARTS.filter((part) =>
		part === 'triggers'
			? !isEqual(previousIntegrations, nextIntegrations)
			: !isEqual(previousSchema?.[part], nextSchema?.[part]),
	);
}

/**
 * Single emitter for the three agent modification events. Every config write
 * reports through here, so the surface that made the change is the only thing
 * that differs between them and a union across all three is complete.
 */
@Service()
export class AgentModificationTelemetryService {
	constructor(private readonly telemetry: Telemetry) {}

	record({
		agent,
		projectId,
		user,
		by,
		changedParts,
	}: {
		/** Post-save entity, so the reported profile is the one that landed. */
		agent: Agent;
		projectId: string;
		user: User;
		by: AgentModifiedBy;
		changedParts: AgentConfigPart[];
	}): void {
		if (changedParts.length === 0) return;

		try {
			const counts = countAgentCapabilities(agent.schema, agent.integrations);
			// Only model and tool_types: this helper's own tool_count folds in MCP
			// servers, provider tools, web search and sub-agents, which would
			// disagree with the per-kind counts above.
			const { model, tool_types } = buildAgentConfigurationTelemetryFromConfig(
				agent.schema,
				agent.integrations,
			);

			const properties = {
				agent_id: agent.id,
				project_id: projectId,
				user_id: user.id,
				event_version: '1',
				changed_parts: changedParts,
				capability_kinds: configuredCapabilityKinds(counts),
				capability_count: totalAgentCapabilities(counts),
				tool_count: counts.tool,
				skill_count: counts.skill,
				sub_agent_count: counts.subAgent,
				mcp_server_count: counts.mcpServer,
				vector_store_count: counts.vectorStore,
				task_count: counts.task,
				trigger_count: counts.channel,
				model,
				tool_types,
				has_published_version: Boolean(agent.activeVersionId),
			} as const;

			const entry = {
				user: TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
				builder: TELEMETRY_EVENT.AGENTS.BUILDER_MODIFIED_AGENT,
				mcp: TELEMETRY_EVENT.AGENTS.MCP_MODIFIED_AGENT,
			}[by];

			this.telemetry.track(entry, properties);
		} catch {
			// Telemetry must never fail a write that already succeeded.
		}
	}
}
