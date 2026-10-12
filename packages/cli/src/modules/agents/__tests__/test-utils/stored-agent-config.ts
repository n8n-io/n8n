import type {
	AgentJsonConfig,
	AgentJsonSkillConfig,
	AgentSkill,
	StoredAgentConfig,
} from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { AgentSkillRefsService } from '../../agent-skill-refs.service';
import type { AgentHistory } from '../../entities/agent-history.entity';
import type { Agent } from '../../entities/agent.entity';
import { composeJsonConfig } from '../../json-config/agent-config-composition';
import type { AgentSkillRefs } from '../../json-config/agent-document';
import type { AgentRunSource } from '../../utils/agent-published-snapshot';

/**
 * A JSON document as a stored config fixture. The fake skill refs seam of
 * `createAgentSkillRefsService` reads the `skills` key of the fixture as the
 * skill refs, so a caller test declares the refs in one place. The real seam
 * reads the refs from the skills hub tables.
 */
export function storedAgentConfig(document: AgentJsonConfig): StoredAgentConfig {
	return document as unknown as StoredAgentConfig;
}

export type FakeAgentSkillRefsService = ReturnType<typeof mock<AgentSkillRefsService>> & {
	/** Skill bodies of the fake skills hub, keyed by skill id. */
	bodies: Record<string, AgentSkill>;
	/** Draft refs written through the fake seam, keyed by agent id. */
	draftRefs: Map<string, AgentJsonSkillConfig[]>;
};

/**
 * An in-memory skill refs seam for tests of its callers. A draft without
 * written refs reads the refs of its `storedAgentConfig` fixture. Skill bodies
 * come from `bodies`.
 */
export function createAgentSkillRefsService(
	bodies: Record<string, AgentSkill> = {},
): FakeAgentSkillRefsService {
	const draftRefs = new Map<string, AgentJsonSkillConfig[]>();
	const service = Object.assign(mock<AgentSkillRefsService>(), { bodies, draftRefs });
	const readDraftRefs = (agent: Pick<Agent, 'id'>): AgentJsonSkillConfig[] =>
		draftRefs.get(agent.id) ?? storedSkillRefs(agent);
	const pickBodies = (refs: AgentSkillRefs) =>
		Object.fromEntries(
			(refs ?? []).flatMap((ref) =>
				Object.hasOwn(service.bodies, ref.id) ? [[ref.id, service.bodies[ref.id]]] : [],
			),
		);
	const writeRefs = (agent: Pick<Agent, 'id'>, refs: AgentSkillRefs) => {
		draftRefs.set(agent.id, refs ?? []);
	};

	service.refsForDraft.mockImplementation(async (agent) => readDraftRefs(agent));
	service.refsForVersion.mockImplementation(async (version) => storedSkillRefs(version));
	service.readDraft.mockImplementation(async (agent) => {
		const skillRefs = readDraftRefs(agent);
		return { skillRefs, skills: pickBodies(skillRefs) };
	});
	service.readVersion.mockImplementation(async (version) => {
		const skillRefs = storedSkillRefs(version);
		return { skillRefs, skills: pickBodies(skillRefs) };
	});
	service.skillsForRefs.mockImplementation(async (refs) => pickBodies(refs));
	service.replaceDraftRefs.mockImplementation(async (agent, refs) => writeRefs(agent, refs));
	service.restoreDraftRefs.mockImplementation(async (agent, _version, refs) =>
		writeRefs(agent, refs),
	);
	service.createDraftRefs.mockImplementation(async (agent, refs) => {
		writeRefs(agent, refs);
		return readDraftRefs(agent);
	});
	service.unpinDraftRef.mockImplementation(async (agent, skillId) =>
		writeRefs(
			agent,
			readDraftRefs(agent).map((ref) =>
				ref.id === skillId ? { type: ref.type, id: ref.id } : ref,
			),
		),
	);
	service.pinDraftForPublish.mockResolvedValue(undefined);
	service.findOutdatedSkillIds.mockResolvedValue([]);
	return service;
}

/** Fixture overrides, with `schema` given as a JSON document. */
export type WithDocumentSchema<T> = Partial<Omit<T, 'schema'>> & {
	schema?: AgentJsonConfig | null;
};

export type AgentFixtureOverrides = WithDocumentSchema<Agent>;

export type AgentHistoryFixtureOverrides = WithDocumentSchema<AgentHistory>;

/** The skill refs that a `storedAgentConfig` fixture holds, as the seam reads them: a list. */
export function storedSkillRefs(source: object): AgentJsonSkillConfig[] {
	if (!('schema' in source)) return [];
	const document = source.schema as AgentJsonConfig | null;
	return document?.skills ?? [];
}

/**
 * `composeJsonConfig` with the skill refs that a `storedAgentConfig` fixture
 * holds. Like the skill refs seam, a fixture without refs gives an empty list.
 */
export function composeStoredJsonConfig(
	agent: Pick<Agent, 'schema' | 'integrations'>,
): AgentJsonConfig | null {
	return composeJsonConfig(agent, storedSkillRefs(agent));
}

/**
 * A run source for an agent fixture, with the skill refs that its stored
 * config holds and the given skill bodies.
 */
export function storedRunSource(
	agent: Agent,
	skills: Record<string, AgentSkill> = {},
): AgentRunSource {
	return { agent, skillRefs: storedSkillRefs(agent), skills };
}
