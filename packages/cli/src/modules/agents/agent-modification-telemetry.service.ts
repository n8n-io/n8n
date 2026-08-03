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

/** Which surface acted: selects the per-surface event on every agent lifecycle emit. */
export type AgentActor = 'user' | 'builder' | 'mcp';

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
 * Whether the agent had nothing behind it yet — the state a freshly created row
 * is in. A write leaving this state is the agent's creation, so it reports a
 * creation event rather than a modification.
 *
 * `name` and `personalisation` are deliberately not consulted: an agent that
 * has only been renamed or recoloured has not been configured, matching
 * `CONFIG_PARTS`, which omits `personalisation` as cosmetic.
 */
export function isUnconfiguredAgent(
	schema: AgentJsonConfig | null,
	integrations: AgentIntegrationConfig[],
): boolean {
	if (!schema) return true;
	if (schema.model?.trim() || schema.instructions?.trim()) return false;
	return totalAgentCapabilities(countAgentCapabilities(schema, integrations)) === 0;
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

	record({
		agent,
		projectId,
		user,
		by,
		changedParts,
		wasUnconfigured,
	}: {
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
	}): void {
		if (changedParts.length === 0) return;

		try {
			// Still nothing behind the agent: a rename or recolour of a blank
			// agent is neither its creation nor a modification of it. Staying
			// silent keeps a creation the first event any agent reports.
			if (isUnconfiguredAgent(agent.schema, agent.integrations)) return;

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

			if (wasUnconfigured) {
				// Written out per surface rather than looked up, because the creation
				// events do not share one event_version and `Telemetry.track` types
				// its payload against the specific event passed.
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
}
