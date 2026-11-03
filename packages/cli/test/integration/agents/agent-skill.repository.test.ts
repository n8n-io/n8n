import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { AgentPublishHistory } from '@/modules/agents/entities/agent-publish-history.entity';
import { AgentHistory } from '@/modules/agents/entities/agent-history.entity';
import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import {
	createSkill as createSkillFixture,
	createSkillVersion,
	deleteAllSkills,
	findLatestSkillVersion,
} from '@/modules/skills/testing';

/** More ids than SQLite binds in one query (32,766). */
const manyUnknownIds = () => Array.from({ length: 33_000 }, (_, i) => `skill_unknown${i}`);

describe('AgentSkillRepository', () => {
	let agentSkills: AgentSkillRepository;
	let agents: AgentRepository;
	let histories: Repository<AgentHistory>;
	let project: Project;
	let otherProject: Project;

	beforeAll(async () => {
		await testModules.loadModules(['skills', 'agents']);
		await testDb.init();
		agentSkills = Container.get(AgentSkillRepository);
		agents = Container.get(AgentRepository);
		histories = Container.get(DataSource).getRepository(AgentHistory);
		project = await createTeamProject('Team');
		otherProject = await createTeamProject('Other team');
	});

	afterEach(async () => {
		// Agent rows cascade to their history, pins and dependency rows.
		await agents.delete({});
		await deleteAllSkills();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	let counter = 0;
	async function createSkill(target: { projectId?: string; agentId?: string } = {}) {
		const { id } = await createSkillFixture({ id: `skill_test${++counter}`, ...target });
		return id;
	}

	async function createAgent(name: string, options: { inSync?: boolean; projectId?: string } = {}) {
		const versionId = randomUUID();
		const agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name,
				projectId: options.projectId ?? project.id,
				integrations: [],
				tools: {},
				versionId,
			}),
		);
		if (options.inSync) {
			await histories.save(histories.create({ versionId, agentId: agent.id, author: 'Test' }));
			await agents.update({ id: agent.id }, { activeVersionId: versionId });
		}
		return agent;
	}

	async function publish(agentId: string): Promise<string> {
		const versionId = randomUUID();
		await histories.save(histories.create({ versionId, agentId, author: 'Test' }));
		await Container.get(DataSource).getRepository(AgentPublishHistory).insert({
			agentId,
			versionId,
			event: 'activated',
			author: 'Test',
		});
		return versionId;
	}

	async function latestVersionId(skillId: string): Promise<string> {
		const latest = await findLatestSkillVersion(skillId);
		if (!latest) throw new Error(`no saved version for ${skillId}`);
		return latest.id;
	}

	it('does not count never-published saved pins as skill usage', async () => {
		const id = await createSkill();
		const agent = await createAgent('Draft');
		const versionId = randomUUID();
		await histories.save(histories.create({ versionId, agentId: agent.id, author: 'Test' }));
		await agentSkills.insertPins([
			{ agentVersionId: versionId, skillId: id, skillVersionId: await latestVersionId(id) },
		]);
		expect(await agentSkills.findUsingAgentIds(id)).toEqual([]);
		expect(await agentSkills.countUsingAgents([id])).toEqual(new Map());
		expect(await agentSkills.findUsage(id)).toEqual({ drafts: [], pins: [], hiddenAgents: 0 });
	});

	describe('pins', () => {
		it('finds the pinned version of each skill of one published agent version', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			await createSkillVersion(id, { instructions: 'v2' });
			const agent = await createAgent('Support');
			const agentVersionId = await publish(agent.id);

			await agentSkills.insertPins([{ agentVersionId, skillId: id, skillVersionId: v1 }]);

			expect(await agentSkills.findPins(agentVersionId)).toEqual([
				{ skillId: id, skillVersionId: v1 },
			]);
		});

		it('keeps the pins of one publish in the order they were given', async () => {
			const zeta = await createSkill();
			const alpha = await createSkill();
			const agentVersionId = await publish((await createAgent('Support')).id);

			await agentSkills.insertPins([
				{ agentVersionId, skillId: zeta, skillVersionId: await latestVersionId(zeta) },
				{ agentVersionId, skillId: alpha, skillVersionId: await latestVersionId(alpha) },
			]);

			expect((await agentSkills.findPins(agentVersionId)).map((pin) => pin.skillId)).toEqual([
				zeta,
				alpha,
			]);
			expect(await agentSkills.findPinnedSkillIds(agentVersionId)).toEqual([zeta, alpha]);
		});
	});

	describe('dependencies', () => {
		it('replaces the rows of one agent', async () => {
			const a = await createSkill();
			const b = await createSkill();
			const agent = await createAgent('Support');
			await agentSkills.replaceDependencies(agent.id, [{ skillId: a }]);

			await agentSkills.replaceDependencies(agent.id, [{ skillId: b }]);

			expect(await agentSkills.findFollowingAgentIds([a])).toEqual([]);
			expect(await agentSkills.findFollowingAgentIds([b])).toEqual([agent.id]);
		});

		it('leaves pinned refs out of the following agents', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const following = await createAgent('Following');
			const pinned = await createAgent('Pinned');
			await agentSkills.replaceDependencies(following.id, [{ skillId: id }]);
			await agentSkills.replaceDependencies(pinned.id, [{ skillId: id, versionId: v1 }]);

			expect(await agentSkills.findFollowingAgentIds([id])).toEqual([following.id]);
			expect(await agentSkills.findFollowingAgents(id)).toEqual([
				{ id: following.id, name: 'Following' },
			]);
		});

		it('lets a following ref win over a pinned ref to the same skill', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const agent = await createAgent('Both');

			await agentSkills.replaceDependencies(agent.id, [
				{ skillId: id },
				{ skillId: id, versionId: v1 },
			]);
			expect(await agentSkills.findFollowingAgentIds([id])).toEqual([agent.id]);

			await agentSkills.replaceDependencies(agent.id, [
				{ skillId: id, versionId: v1 },
				{ skillId: id },
			]);
			expect(await agentSkills.findFollowingAgentIds([id])).toEqual([agent.id]);
		});

		it('returns the refs of each agent in the order they were attached', async () => {
			const [a, b, c] = [await createSkill(), await createSkill(), await createSkill()];
			const v1 = await latestVersionId(a);
			const agent = await createAgent('Support');
			const other = await createAgent('Sales');
			await agentSkills.replaceDependencies(agent.id, [
				{ skillId: b },
				{ skillId: a, versionId: v1 },
			]);
			await agentSkills.replaceDependencies(other.id, [{ skillId: c }]);

			const byAgent = await agentSkills.findDependencies([agent.id, other.id]);

			expect(byAgent).toEqual(
				new Map([
					[
						agent.id,
						[
							{ skillId: b, versionId: null },
							{ skillId: a, versionId: v1 },
						],
					],
					[other.id, [{ skillId: c, versionId: null }]],
				]),
			);
		});

		// The attach order of an agent's skills comes from `createdAt`, so a row that stays
		// keeps its timestamp.
		it('keeps the rows that stay, so a new skill sorts after them', async () => {
			const [a, b, c] = [await createSkill(), await createSkill(), await createSkill()];
			const agent = await createAgent('Support');
			await agentSkills.replaceDependencies(agent.id, [{ skillId: a }, { skillId: b }]);

			await agentSkills.replaceDependencies(agent.id, [
				{ skillId: c },
				{ skillId: b },
				{ skillId: a },
			]);

			expect(
				(await agentSkills.findDependencies([agent.id])).get(agent.id)?.map((ref) => ref.skillId),
			).toEqual([a, b, c]);
		});

		it('updates the pin of a row that stays', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const agent = await createAgent('Support');
			await agentSkills.replaceDependencies(agent.id, [{ skillId: id }]);

			await agentSkills.replaceDependencies(agent.id, [{ skillId: id, versionId: v1 }]);
			expect(await agentSkills.findFollowingAgentIds([id])).toEqual([]);

			await agentSkills.replaceDependencies(agent.id, [{ skillId: id }]);
			expect(await agentSkills.findFollowingAgentIds([id])).toEqual([agent.id]);
		});
	});

	describe('usage', () => {
		it('lists each agent once, with the skill version its current published version pins', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const { versionId: v2 } = await createSkillVersion(id, { instructions: 'v2' });
			const drafting = await createAgent('Drafting');
			await agentSkills.replaceDependencies(drafting.id, [{ skillId: id }]);
			const published = await createAgent('Published');
			const old = await publish(published.id);
			const current = await publish(published.id);
			await agents.update({ id: published.id }, { activeVersionId: current });
			const retired = await createAgent('Retired', { inSync: true });
			await agentSkills.insertPins([
				{ agentVersionId: old, skillId: id, skillVersionId: v1 },
				{ agentVersionId: current, skillId: id, skillVersionId: v2 },
				{ agentVersionId: await publish(retired.id), skillId: id, skillVersionId: v1 },
			]);

			const usage = await agentSkills.findUsage(id);

			expect(usage.drafts).toEqual([
				{
					agentId: drafting.id,
					agentName: 'Drafting',
					projectId: project.id,
					skillVersionId: null,
				},
			]);
			expect(usage.pins).toHaveLength(2);
			expect(usage.pins).toEqual(
				expect.arrayContaining([
					{
						agentId: published.id,
						agentName: 'Published',
						projectId: project.id,
						skillVersionId: v2,
					},
					{
						agentId: retired.id,
						agentName: 'Retired',
						projectId: project.id,
						skillVersionId: null,
					},
				]),
			);
			expect(usage.hiddenAgents).toBe(0);
		});

		it('leaves out the agents of other projects and counts them', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const visible = await createAgent('Visible');
			await agentSkills.replaceDependencies(visible.id, [{ skillId: id }]);
			const drafting = await createAgent('Elsewhere', { projectId: otherProject.id });
			await agentSkills.replaceDependencies(drafting.id, [{ skillId: id }]);
			const published = await createAgent('Published elsewhere', { projectId: otherProject.id });
			await agentSkills.insertPins([
				{ agentVersionId: await publish(published.id), skillId: id, skillVersionId: v1 },
			]);

			const usage = await agentSkills.findUsage(id, [project.id]);

			expect(usage).toEqual({
				drafts: [
					{
						agentId: visible.id,
						agentName: 'Visible',
						projectId: project.id,
						skillVersionId: null,
					},
				],
				pins: [],
				hiddenAgents: 2,
			});
		});

		it('keeps the pin of each draft ref', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const following = await createAgent('Following');
			await agentSkills.replaceDependencies(following.id, [{ skillId: id }]);
			const pinned = await createAgent('Pinned');
			await agentSkills.replaceDependencies(pinned.id, [{ skillId: id, versionId: v1 }]);

			const usage = await agentSkills.findUsage(id);

			expect(usage.drafts).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ agentId: following.id, skillVersionId: null }),
					expect.objectContaining({ agentId: pinned.id, skillVersionId: v1 }),
				]),
			);
		});

		it('is empty for a skill nobody uses', async () => {
			const id = await createSkill();

			expect(await agentSkills.findUsage(id)).toEqual({ drafts: [], pins: [], hiddenAgents: 0 });
		});

		it('counts distinct agents per skill across drafts and pins', async () => {
			const id = await createSkill();
			const unused = await createSkill();
			const v1 = await latestVersionId(id);
			const agent = await createAgent('Support');
			await agentSkills.replaceDependencies(agent.id, [{ skillId: id }]);
			const other = await createAgent('Sales');
			for (const agentId of [agent.id, other.id]) {
				for (let i = 0; i < 3; i++) {
					await agentSkills.insertPins([
						{ agentVersionId: await publish(agentId), skillId: id, skillVersionId: v1 },
					]);
				}
			}

			const counts = await agentSkills.countUsingAgents([id, unused, ...manyUnknownIds()]);

			expect(counts.get(id)).toBe(2);
			expect(counts.get(unused)).toBeUndefined();
		});
	});

	describe('findUsingAgentIds', () => {
		it('lists the agents with a draft ref or a published pin, once each', async () => {
			const id = await createSkill({ projectId: project.id });
			const drafting = await createAgent('Drafting');
			await agentSkills.replaceDependencies(drafting.id, [{ skillId: id }]);
			const published = await createAgent('Published');
			await agentSkills.insertPins([
				{
					agentVersionId: await publish(published.id),
					skillId: id,
					skillVersionId: await latestVersionId(id),
				},
			]);
			await agentSkills.replaceDependencies(published.id, [{ skillId: id }]);

			expect((await agentSkills.findUsingAgentIds(id)).sort()).toEqual(
				[drafting.id, published.id].sort(),
			);
		});
	});

	describe('findSkillIdsUsedByAgent', () => {
		it('lists the skills of its draft refs and of its published pins, once each', async () => {
			const drafted = await createSkill({ projectId: project.id });
			const pinned = await createSkill({ projectId: project.id });
			const both = await createSkill({ projectId: project.id });
			const otherAgentOnly = await createSkill({ projectId: project.id });
			const agent = await createAgent('Agent');
			const other = await createAgent('Other');
			await agentSkills.replaceDependencies(agent.id, [{ skillId: drafted }, { skillId: both }]);
			await agentSkills.replaceDependencies(other.id, [{ skillId: otherAgentOnly }]);
			const versionId = await publish(agent.id);
			await agentSkills.insertPins(
				await Promise.all(
					[pinned, both].map(async (skillId) => ({
						agentVersionId: versionId,
						skillId,
						skillVersionId: await latestVersionId(skillId),
					})),
				),
			);

			expect((await agentSkills.findSkillIdsUsedByAgent(agent.id)).sort()).toEqual(
				[drafted, pinned, both].sort(),
			);
			expect(await agentSkills.findSkillIdsUsedByAgent('agent-gone')).toEqual([]);
		});
	});

	describe('findAgents', () => {
		it('maps agent ids to their name and project, and skips unknown ids', async () => {
			const support = await createAgent('Support');
			const sales = await createAgent('Sales', { projectId: otherProject.id });

			const agents = await agentSkills.findAgents([support.id, support.id, sales.id, 'agent-gone']);

			expect(agents).toEqual(
				new Map([
					[support.id, { name: 'Support', projectId: project.id }],
					[sales.id, { name: 'Sales', projectId: otherProject.id }],
				]),
			);
		});
	});

	describe('AgentRepository.markFollowerDraftsChanged', () => {
		it('gives an agent in sync with its published version a new draft version id', async () => {
			const agent = await createAgent('Support', { inSync: true });

			const changed = await agents.markFollowerDraftsChanged([agent.id]);

			const reloaded = await agents.findOneByOrFail({ id: agent.id });
			expect(changed).toEqual([agent.id]);
			expect(reloaded.versionId).not.toBe(reloaded.activeVersionId);
			expect(reloaded.revision).toBe(agent.revision + 1);
		});

		it('gives an already modified draft a new fixed-content ID', async () => {
			const agent = await createAgent('Support');

			const changed = await agents.markFollowerDraftsChanged([agent.id]);

			const reloaded = await agents.findOneByOrFail({ id: agent.id });
			expect(changed).toEqual([agent.id]);
			expect(reloaded.versionId).not.toBe(agent.versionId);
		});

		it('writes nothing for no agents', async () => {
			expect(await agents.markFollowerDraftsChanged([])).toEqual([]);
			expect(await agents.findProjectIdsByIds([])).toEqual([]);
		});

		it('returns the project of each agent', async () => {
			const agent = await createAgent('Support');

			expect(await agents.findProjectIdsByIds([agent.id])).toEqual([
				{ id: agent.id, projectId: project.id },
			]);
		});
	});
});
