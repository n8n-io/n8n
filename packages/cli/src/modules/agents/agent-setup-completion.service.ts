import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { Telemetry } from '@/telemetry';

import { AgentValidationService } from './agent-validation.service';
import type { Agent } from './entities/agent.entity';
import {
	configuredCapabilityKinds,
	countAgentCapabilities,
	totalAgentCapabilities,
	type AgentCapabilityCounts,
} from './utils/agent-capabilities';

/** Called by the caller once its own write has persisted the stamp. */
type EmitSetupCompleted = () => void;

/**
 * Marks the first moment an agent is fully set up: it would pass the publish
 * gate, and it does something — at least one configured capability.
 *
 * `agents.setupCompletedAt` makes that a once-per-agent fact rather than a
 * per-save one, so the funnel milestone can't be double-counted across
 * sessions, processes or write paths. Both entry points stamp the entity
 * without saving it; the caller persists the stamp as part of the write it was
 * already making, then invokes the returned callback so a failed write never
 * reports a completion.
 */
@Service()
export class AgentSetupCompletionService {
	constructor(
		private readonly agentValidationService: AgentValidationService,
		private readonly telemetry: Telemetry,
	) {}

	/**
	 * Config-save path. Validates only when the agent is not already marked and
	 * has something to run, so the cost falls away for good once an agent
	 * completes — and is never paid by agents that are still empty.
	 */
	async recordIfSetupComplete(
		agent: Agent,
		projectId: string,
		credentialProvider: CredentialProvider,
		user?: User,
	): Promise<EmitSetupCompleted | null> {
		const counts = countAgentCapabilities(agent.schema, agent.integrations);
		if (!this.isPending(agent, counts)) return null;

		const validation = await this.agentValidationService.validateLoadedAgentConfiguration(
			agent,
			projectId,
			credentialProvider,
		);
		if (validation.status !== 'valid') return null;

		return this.stamp(agent, projectId, counts, user);
	}

	/**
	 * Publish path. Publishing already asserted the configuration is valid, so
	 * only the capability check is left. Acts as a backstop for writes that
	 * bypass the config-save path — connecting a chat channel publishes the
	 * agent in the same request — keeping "setup completed" a superset of
	 * "published".
	 *
	 * `config` is the snapshot that was actually validated, which for a
	 * historical republish is the version's schema rather than the draft.
	 */
	recordPublishedSetupComplete(
		agent: Agent,
		projectId: string,
		user: User,
		config: AgentJsonConfig | null,
	): EmitSetupCompleted | null {
		const counts = countAgentCapabilities(config, agent.integrations);
		if (!this.isPending(agent, counts)) return null;

		return this.stamp(agent, projectId, counts, user);
	}

	/** Not yet marked, and configured with at least one capability. */
	private isPending(agent: Agent, counts: AgentCapabilityCounts): boolean {
		return !agent.setupCompletedAt && totalAgentCapabilities(counts) > 0;
	}

	private stamp(
		agent: Agent,
		projectId: string,
		counts: AgentCapabilityCounts,
		user?: User,
	): EmitSetupCompleted {
		agent.setupCompletedAt = new Date();

		return () => {
			try {
				this.telemetry.track(TELEMETRY_EVENT.AGENTS.AGENT_SETUP_COMPLETED, {
					agent_id: agent.id,
					project_id: projectId,
					...(user ? { user_id: user.id } : {}),
					capability_kinds: configuredCapabilityKinds(counts),
					capability_count: totalAgentCapabilities(counts),
					tool_count: counts.tool,
					skill_count: counts.skill,
					sub_agent_count: counts.subAgent,
					mcp_server_count: counts.mcpServer,
					vector_store_count: counts.vectorStore,
					task_count: counts.task,
					trigger_count: counts.channel,
					status:
						agent.activeVersionId && agent.versionId === agent.activeVersionId
							? 'production'
							: 'draft',
				});
			} catch {
				// Telemetry must never fail a write that already succeeded.
			}
		};
	}
}
