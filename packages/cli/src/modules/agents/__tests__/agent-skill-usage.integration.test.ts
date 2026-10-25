import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import {
	createSkill,
	createSkillVersion,
	deleteAllSkills,
	describeSkillUsageContract,
	type SkillUsageWorld,
} from '@/modules/skills/testing';

import { AgentSkillUsage } from '../agent-skill-usage';
import { AgentHistoryRepository } from '../repositories/agent-history.repository';
import { AgentSkillRepository } from '../repositories/agent-skill.repository';
import { AgentRepository } from '../repositories/agent.repository';

/** Writes a world into the agent and skill tables, with fresh ids. */
async function seed(world: SkillUsageWorld) {
	const agents = Container.get(AgentRepository);
	const histories = Container.get(AgentHistoryRepository);
	const agentSkills = Container.get(AgentSkillRepository);

	const projectIds = new Map<string, string>();
	for (const key of new Set(world.agents.map((agent) => agent.project))) {
		projectIds.set(key, (await createTeamProject(`Project ${key}`)).id);
	}
	const agentIds = new Map<string, string>();
	for (const { key, name, project } of world.agents) {
		const agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name,
				projectId: projectIds.get(project),
				integrations: [],
				tools: {},
				versionId: randomUUID(),
			}),
		);
		agentIds.set(key, agent.id);
	}
	const skillIds = new Map<string, string>();
	const versionIds = new Map<string, string>();
	for (const { key, versions } of world.skills) {
		const [first, ...later] = versions;
		const { id, versionId } = await createSkill({ content: { name: first } });
		skillIds.set(key, id);
		versionIds.set(`${key}@1`, versionId);
		for (const name of later) {
			const saved = await createSkillVersion(id, { name });
			versionIds.set(`${key}@${saved.version}`, saved.versionId);
		}
	}

	const ids = {
		projectId: (key: string) => required(projectIds, key),
		agentId: (key: string) => required(agentIds, key),
		skillId: (key: string) => required(skillIds, key),
	};
	const versionId = (skill: string, version: number) => required(versionIds, `${skill}@${version}`);

	for (const agent of world.agents) {
		const refs = (world.drafts ?? []).filter((ref) => ref.agent === agent.key);
		if (refs.length === 0) continue;
		await agentSkills.replaceDependencies(
			ids.agentId(agent.key),
			refs.map((ref) => ({
				skillId: ids.skillId(ref.skill),
				versionId: ref.version === undefined ? undefined : versionId(ref.skill, ref.version),
			})),
		);
	}
	for (const publish of world.publishes ?? []) {
		const agentId = ids.agentId(publish.agent);
		const agentVersionId = randomUUID();
		await histories.save(histories.create({ versionId: agentVersionId, agentId, author: 'Test' }));
		await agentSkills.insertPins(
			publish.pins.map((pin) => ({
				agentVersionId,
				skillId: ids.skillId(pin.skill),
				skillVersionId: versionId(pin.skill, pin.version),
			})),
		);
		// Publishes come oldest first, so the last one stays active.
		await agents.update({ id: agentId }, { activeVersionId: agentVersionId });
	}
	return ids;
}

function required(ids: Map<string, string>, key: string): string {
	const id = ids.get(key);
	if (!id) throw new Error(`No id for "${key}" in the seeded world`);
	return id;
}

describe('AgentSkillUsage', () => {
	beforeAll(async () => {
		await testModules.loadModules(['skills', 'agents']);
		await testDb.init();
	});

	afterEach(async () => {
		// Agent rows cascade to their history, pins and dependency rows.
		await Container.get(AgentRepository).delete({});
		await deleteAllSkills();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describeSkillUsageContract(() => ({ usage: Container.get(AgentSkillUsage), seed }));
});
