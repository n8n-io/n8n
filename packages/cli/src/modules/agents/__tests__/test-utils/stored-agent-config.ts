import type { AgentJsonConfig, StoredAgentConfig } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { AgentSkillRefsService } from '../../agent-skill-refs.service';
import type { AgentHistory } from '../../entities/agent-history.entity';
import type { Agent } from '../../entities/agent.entity';
import { composeJsonConfig } from '../../json-config/agent-config-composition';
import type { AgentSkillRefs } from '../../json-config/agent-document';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { AgentRunSource } from '../../utils/agent-published-snapshot';

/**
 * A JSON document as the agent `schema` column stores it: the skill refs stay
 * in the `skills` key, where the skill refs seam reads them.
 */
export function storedAgentConfig(document: AgentJsonConfig): StoredAgentConfig {
	return document as unknown as StoredAgentConfig;
}

/** The skill refs seam over a mocked repository. */
export function createAgentSkillRefsService(
	agentRepository: AgentRepository = mock<AgentRepository>(),
): AgentSkillRefsService {
	return new AgentSkillRefsService(agentRepository);
}

/** Fixture overrides, with `schema` given as a JSON document. */
export type WithDocumentSchema<T> = Partial<Omit<T, 'schema'>> & {
	schema?: AgentJsonConfig | null;
};

export type AgentFixtureOverrides = WithDocumentSchema<Agent>;

export type AgentHistoryFixtureOverrides = WithDocumentSchema<AgentHistory>;

/** The skill refs that a `storedAgentConfig` fixture holds. */
export function storedSkillRefs(agent: Pick<Agent, 'schema'>): AgentSkillRefs {
	const document = agent.schema as unknown as AgentJsonConfig | null;
	return document?.skills;
}

/** `composeJsonConfig` with the skill refs that a `storedAgentConfig` fixture holds. */
export function composeStoredJsonConfig(
	agent: Pick<Agent, 'schema' | 'integrations'>,
): AgentJsonConfig | null {
	return composeJsonConfig(agent, storedSkillRefs(agent));
}

/** A run source for an agent fixture, with the skill refs that its stored config holds. */
export function storedRunSource(agent: Agent): AgentRunSource {
	return { agent, skillRefs: storedSkillRefs(agent) };
}
