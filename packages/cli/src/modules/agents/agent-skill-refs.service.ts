import type {
	AgentJsonSkillConfig,
	OpaqueStoredSkillRefs,
	StoredAgentConfig,
} from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { AgentHistory } from './entities/agent-history.entity';
import type { Agent } from './entities/agent.entity';
import type { AgentSkillRefs } from './json-config/agent-document';
import { AgentRepository } from './repositories/agent.repository';

/**
 * The one seam for the skill refs of an agent draft and of a published agent
 * version. All other code reads and writes skill refs through this service.
 *
 * The refs are kept in the legacy `skills` key of the stored `schema` JSON
 * (`agents.schema`, `agent_history.schema`). Only this file reads or writes
 * that key.
 */
@Service()
export class AgentSkillRefsService {
	constructor(private readonly agentRepository: AgentRepository) {}

	/** Skill refs of the agent draft, in document order. */
	async refsForDraft(
		agent: Pick<Agent, 'id' | 'schema'>,
		_ctx: OperationContext,
	): Promise<AgentSkillRefs> {
		return readLegacySkillRefs(agent.schema);
	}

	/** Skill refs of one published agent version, in document order. */
	async refsForVersion(
		version: Pick<AgentHistory, 'versionId' | 'schema'>,
		_ctx: OperationContext,
	): Promise<AgentSkillRefs> {
		return readLegacySkillRefs(version.schema);
	}

	/**
	 * Replace the skill refs of the agent draft. Call it in the same transaction
	 * as `saveAgentDraftFenced`, with the same `ctx`, after the fenced save.
	 * The agent must have a config when `refs` is set.
	 */
	async replaceDraftRefs(agent: Agent, refs: AgentSkillRefs, ctx: OperationContext): Promise<void> {
		if (!agent.schema) {
			if (refs === undefined) return;
			throw new UnexpectedError('Cannot set skill refs on an agent without a config');
		}
		agent.schema = withLegacySkillRefs(agent.schema, refs);
		await this.agentRepository.updateDraftSchema(agent, ctx);
	}
}

/**
 * The stored refs passed the config schema check when they were written, so
 * an array check is sufficient here.
 */
function isLegacySkillRefList(
	value: unknown,
): value is AgentJsonSkillConfig[] & OpaqueStoredSkillRefs {
	return Array.isArray(value);
}

function readLegacySkillRefs(schema: StoredAgentConfig | null): AgentSkillRefs {
	const value: unknown = schema?.skills;
	return isLegacySkillRefList(value) ? value : undefined;
}

function withLegacySkillRefs(schema: StoredAgentConfig, refs: AgentSkillRefs): StoredAgentConfig {
	const { skills: _previous, ...rest } = schema;
	return isLegacySkillRefList(refs) ? { ...rest, skills: refs } : rest;
}
