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
import { withoutLegacySkillRefs, type AgentSkillRefs } from '../../json-config/agent-document';
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
	/**
	 * The skill version each published agent version pins, keyed by agent version id and
	 * then skill id. A revert pins the restored refs to these versions, as the real seam does.
	 */
	versionPins: Map<string, Record<string, string>>;
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
	const versionPins = new Map<string, Record<string, string>>();
	const service = Object.assign(mock<AgentSkillRefsService>(), {
		bodies,
		draftRefs,
		versionPins,
		usesSkillsHub: true,
	});
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
	const pinnedRefs = (versionId: string, refs: AgentJsonSkillConfig[]) => {
		const pins = versionPins.get(versionId) ?? {};
		return refs.map(({ versionId: _dropped, ...ref }) =>
			Object.hasOwn(pins, ref.id) ? { ...ref, versionId: pins[ref.id] } : ref,
		);
	};

	// A published version's refs carry no `versionId`: its pins live in their own table.
	service.refsForVersion.mockImplementation(async (version) => storedSkillRefs(version));
	service.readDraft.mockImplementation(async (agent) => {
		const skillRefs = readDraftRefs(agent);
		return { skillRefs, skills: pickBodies(skillRefs) };
	});
	service.readVersion.mockImplementation(async (version) => {
		const skillRefs = storedSkillRefs(version);
		return { skillRefs, skills: pickBodies(skillRefs) };
	});
	service.skillsForRefs.mockImplementation(async (_agent, refs) => pickBodies(refs));
	service.effectiveDraftRefs.mockImplementation(async (_agent, refs) => refs);
	service.replaceDraftRefs.mockImplementation(async (agent, refs) => writeRefs(agent, refs));
	service.restoreDraftRefs.mockImplementation(async (agent, version, refs) =>
		writeRefs(agent, pinnedRefs(version.versionId, refs ?? [])),
	);
	// A ref to a skill of the fake hub stays. A ref with only a body needs a creator, as
	// in the real seam; the fake keeps its id instead of minting a new one.
	service.createDraftRefs.mockImplementation(async (agent, refs, _bodies, creator) => {
		writeRefs(
			agent,
			(refs ?? []).filter((ref) => Object.hasOwn(service.bodies, ref.id) || creator !== null),
		);
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
	// As the real seam: the legacy columns get the refs and bodies the draft runs.
	service.versionSnapshot.mockImplementation(async (agent) => {
		if (!agent.schema) return { schema: null, skills: null, pins: new Map() };
		const skillRefs = readDraftRefs(agent);
		return {
			schema: {
				...withoutLegacySkillRefs(agent.schema),
				skills: skillRefs.map(({ id }) => ({ type: 'skill', id })),
			} as unknown as StoredAgentConfig,
			skills: pickBodies(skillRefs),
			pins: new Map(skillRefs.map((ref) => [ref.id, ref.versionId ?? `${ref.id}-latest`])),
		};
	});
	service.pinVersion.mockResolvedValue(undefined);
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
