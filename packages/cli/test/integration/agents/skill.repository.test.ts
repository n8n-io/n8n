import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SkillRepository } from '@/modules/agents/repositories/skill.repository';
import { skillContentHash, type SkillContent } from '@/modules/agents/skills/skill-content-hash';

import { createUser } from '../shared/db/users';

const content = (overrides: Partial<SkillContent> = {}): SkillContent => ({
	name: 'Brand voice',
	description: 'Write in our voice',
	instructions: 'Use short sentences.',
	frontmatter: null,
	files: [],
	...overrides,
});

describe('SkillRepository', () => {
	let skills: SkillRepository;
	let agents: AgentRepository;
	let histories: AgentHistoryRepository;
	let txRunner: TransactionRunner;
	let user: User;
	let otherUser: User;
	let project: Project;
	let otherProject: Project;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		skills = Container.get(SkillRepository);
		agents = Container.get(AgentRepository);
		histories = Container.get(AgentHistoryRepository);
		txRunner = Container.get(TransactionRunner);
		user = await createUser();
		otherUser = await createUser();
		project = await createTeamProject('Team');
		otherProject = await createTeamProject('Other team');
	});

	afterEach(async () => {
		// Agent rows cascade to their history, pins and dependency rows.
		await agents.delete({});
		await skills.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	let counter = 0;
	async function createSkill(
		target: { userId?: string; projectId?: string } = {},
		body: SkillContent = content(),
	): Promise<string> {
		const id = `skill_test${++counter}`;
		await skills.createSkill(
			{
				id,
				target: { userId: target.userId ?? null, projectId: target.projectId ?? null },
				source: 'ui',
				createdById: null,
			},
			body,
		);
		return id;
	}

	async function createAgent(name: string, options: { inSync?: boolean } = {}) {
		const versionId = randomUUID();
		const agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name,
				projectId: project.id,
				integrations: [],
				tools: {},
				skills: {},
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
		return versionId;
	}

	async function latestVersionId(skillId: string): Promise<string> {
		const row = (await skills.findLatestSaved([skillId])).get(skillId);
		if (!row) throw new Error(`no saved version for ${skillId}`);
		return row.version.id;
	}

	describe('create', () => {
		it('writes the skill with v1 as its only version', async () => {
			const id = await createSkill({ projectId: project.id });

			const latest = (await skills.findLatestSaved([id])).get(id);

			expect(latest?.version.version).toBe(1);
			expect(latest?.skill).toMatchObject({
				id,
				projectId: project.id,
				userId: null,
				source: 'ui',
			});
			expect(latest?.version.contentHash).toBe(skillContentHash(content()));
			expect(await skills.nextVersionNumber(id)).toBe(2);
		});

		it('stores the files of v1 sorted by path', async () => {
			const id = await createSkill(
				{},
				content({
					files: [
						{ path: 'references/b.md', content: 'b' },
						{ path: 'references/B.md', content: 'B' },
						{ path: 'references/a.md', content: 'a' },
					],
				}),
			);

			const latest = (await skills.findLatestSaved([id])).get(id);

			const paths = ['references/B.md', 'references/a.md', 'references/b.md'];
			expect(latest?.files.map((file) => file.path)).toEqual(paths);
			expect(latest?.files[0]).toMatchObject({ content: 'B' });
		});

		// SQLite returns rows in UTF-8 byte order and Postgres in its collation order. The
		// content hash uses UTF-16 code units, so the repository sorts on its own.
		it('sorts files by UTF-16 code unit, as the content hash does', async () => {
			const id = await createSkill(
				{},
				content({
					files: [
						{ path: 'references/\uff5e.md', content: 'fullwidth tilde' },
						{ path: 'references/\u{1f600}.md', content: 'emoji' },
					],
				}),
			);

			const latest = (await skills.findLatestSaved([id])).get(id);

			expect(latest?.files.map((file) => file.content)).toEqual(['emoji', 'fullwidth tilde']);
		});

		it('rolls back with the caller transaction', async () => {
			await expect(
				txRunner.run({}, async (ctx) => {
					await skills.createSkill(
						{
							id: 'skill_rollback',
							target: { userId: null, projectId: null },
							source: 'ui',
							createdById: null,
						},
						content(),
						ctx,
					);
					throw new Error('abort');
				}),
			).rejects.toThrow('abort');

			expect(await skills.findByIds(['skill_rollback'])).toEqual([]);
		});
	});

	describe('findVisible', () => {
		it('lists instance skills, own skills and skills of the given projects, newest change first', async () => {
			const instance = await createSkill();
			const own = await createSkill({ userId: user.id });
			const others = await createSkill({ userId: otherUser.id });
			const team = await createSkill({ projectId: project.id });
			const otherTeam = await createSkill({ projectId: otherProject.id });
			await skills.insertSavedVersion(instance, 2, content({ instructions: 'touched' }), null);

			const visible = await skills.findVisible({
				userId: user.id,
				allUsers: false,
				projectIds: [project.id],
			});

			const ids = visible.map((skill) => skill.id);
			expect(ids).toEqual(expect.arrayContaining([instance, own, team]));
			expect(ids).not.toContain(others);
			expect(ids).not.toContain(otherTeam);
			expect(ids[0]).toBe(instance);
		});

		it("adds every user's skills and every project's skills when allowed", async () => {
			const others = await createSkill({ userId: otherUser.id });
			const otherTeam = await createSkill({ projectId: otherProject.id });

			const visible = await skills.findVisible({
				userId: user.id,
				allUsers: true,
				projectIds: 'all',
			});

			expect(visible.map((skill) => skill.id)).toEqual(expect.arrayContaining([others, otherTeam]));
		});

		it('lists no project skill for an empty project list', async () => {
			await createSkill({ projectId: project.id });

			expect(
				await skills.findVisible({ userId: user.id, allUsers: false, projectIds: [] }),
			).toEqual([]);
		});
	});

	describe('findByIds', () => {
		it('returns the existing skills and skips unknown ids', async () => {
			const id = await createSkill();

			const found = await skills.findByIds([id, 'skill_unknown']);

			expect(found.map((skill) => skill.id)).toEqual([id]);
		});
	});

	describe('saved versions', () => {
		it('numbers the next version after the highest one', async () => {
			const id = await createSkill();

			expect(await skills.nextVersionNumber(id)).toBe(2);
			await skills.insertSavedVersion(id, 2, content({ instructions: 'v2' }), user.id);
			expect(await skills.nextVersionNumber(id)).toBe(3);
		});

		it('moves the skill to the top of the visible list', async () => {
			const first = await createSkill();
			await createSkill();

			await skills.insertSavedVersion(first, 2, content({ instructions: 'newer' }), null);

			const [top] = await skills.findVisible({ userId: user.id, allUsers: false, projectIds: [] });
			expect(top.id).toBe(first);
		});

		it('returns 1 for a skill with no saved version', async () => {
			expect(await skills.nextVersionNumber('skill_unknown')).toBe(1);
		});

		it('resolves the highest version as the latest, with its files and author', async () => {
			const id = await createSkill();
			const versionId = await skills.insertSavedVersion(
				id,
				2,
				content({ instructions: 'v2', files: [{ path: 'references/x.md', content: 'x' }] }),
				user.id,
			);

			const latest = (await skills.findLatestSaved([id])).get(id);

			expect(latest?.version).toMatchObject({ id: versionId, version: 2, instructions: 'v2' });
			expect(latest?.version.createdById).toBe(user.id);
			expect(latest?.files.map((file) => file.content)).toEqual(['x']);
		});

		it('returns name and description of the latest version as summaries', async () => {
			const id = await createSkill();
			await skills.insertSavedVersion(
				id,
				2,
				content({ name: 'Tone', description: 'How we sound' }),
				null,
			);

			expect((await skills.findLatestSummaries([id, 'skill_unknown'])).get(id)).toEqual({
				name: 'Tone',
				description: 'How we sound',
			});
		});

		it('finds versions by id with their skill', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);

			const found = await skills.findVersionsByIds([v1, randomUUID()]);

			expect([...found.keys()]).toEqual([v1]);
			expect(found.get(v1)?.skill.id).toBe(id);
		});
	});

	describe('pins', () => {
		it('finds the pinned version of each skill of one published agent version', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			await skills.insertSavedVersion(id, 2, content({ instructions: 'v2' }), null);
			const agent = await createAgent('Support');
			const agentVersionId = await publish(agent.id);

			await skills.insertPins([{ agentVersionId, skillId: id, skillVersionId: v1 }]);

			const pinned = await skills.findPinned(agentVersionId);
			expect([...pinned.keys()]).toEqual([id]);
			expect(pinned.get(id)?.version).toMatchObject({ id: v1, version: 1 });
		});
	});

	describe('dependencies', () => {
		it('replaces the rows of one agent and skips unknown skills', async () => {
			const a = await createSkill();
			const b = await createSkill();
			const agent = await createAgent('Support');
			await skills.replaceDependencies(agent.id, [{ skillId: a }]);

			await skills.replaceDependencies(agent.id, [{ skillId: b }, { skillId: 'skill_unknown' }]);

			expect(await skills.findFollowingAgentIds([a])).toEqual([]);
			expect(await skills.findFollowingAgentIds([b])).toEqual([agent.id]);
		});

		it('leaves pinned refs out of the following agents', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const following = await createAgent('Following');
			const pinned = await createAgent('Pinned');
			await skills.replaceDependencies(following.id, [{ skillId: id }]);
			await skills.replaceDependencies(pinned.id, [{ skillId: id, versionId: v1 }]);

			expect(await skills.findFollowingAgentIds([id])).toEqual([following.id]);
			expect(await skills.findFollowingAgents(id)).toEqual([
				{ id: following.id, name: 'Following' },
			]);
		});

		it('lets a following ref win over a pinned ref to the same skill', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const agent = await createAgent('Both');

			await skills.replaceDependencies(agent.id, [{ skillId: id }, { skillId: id, versionId: v1 }]);
			expect(await skills.findFollowingAgentIds([id])).toEqual([agent.id]);

			await skills.replaceDependencies(agent.id, [{ skillId: id, versionId: v1 }, { skillId: id }]);
			expect(await skills.findFollowingAgentIds([id])).toEqual([agent.id]);
		});

		it('returns the refs of each agent in the order they were attached', async () => {
			const [a, b, c] = [await createSkill(), await createSkill(), await createSkill()];
			const v1 = await latestVersionId(a);
			const agent = await createAgent('Support');
			const other = await createAgent('Sales');
			await skills.replaceDependencies(agent.id, [{ skillId: b }, { skillId: a, versionId: v1 }]);
			await skills.replaceDependencies(other.id, [{ skillId: c }]);

			const byAgent = await skills.findDependencies([agent.id, other.id]);

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
			await skills.replaceDependencies(agent.id, [{ skillId: a }, { skillId: b }]);

			await skills.replaceDependencies(agent.id, [{ skillId: c }, { skillId: b }, { skillId: a }]);

			expect(
				(await skills.findDependencies([agent.id])).get(agent.id)?.map((ref) => ref.skillId),
			).toEqual([a, b, c]);
		});

		it('updates the pin of a row that stays', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const agent = await createAgent('Support');
			await skills.replaceDependencies(agent.id, [{ skillId: id }]);

			await skills.replaceDependencies(agent.id, [{ skillId: id, versionId: v1 }]);
			expect(await skills.findFollowingAgentIds([id])).toEqual([]);

			await skills.replaceDependencies(agent.id, [{ skillId: id }]);
			expect(await skills.findFollowingAgentIds([id])).toEqual([agent.id]);
		});
	});

	describe('usage', () => {
		it('lists draft refs and every pin, with agent names and the active flag', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const drafting = await createAgent('Drafting');
			await skills.replaceDependencies(drafting.id, [{ skillId: id }]);
			const published = await createAgent('Published');
			const old = await publish(published.id);
			const current = await publish(published.id);
			await agents.update({ id: published.id }, { activeVersionId: current });
			await skills.insertPins([
				{ agentVersionId: old, skillId: id, skillVersionId: v1 },
				{ agentVersionId: current, skillId: id, skillVersionId: v1 },
			]);

			const usage = await skills.findUsage(id);

			expect(usage.drafts).toEqual([
				{ agentId: drafting.id, agentName: 'Drafting', projectId: project.id },
			]);
			expect(usage.pins).toEqual(
				expect.arrayContaining([
					{
						agentId: published.id,
						agentName: 'Published',
						agentVersionId: old,
						version: 1,
						isActive: false,
					},
					{
						agentId: published.id,
						agentName: 'Published',
						agentVersionId: current,
						version: 1,
						isActive: true,
					},
				]),
			);
			expect(usage.pins).toHaveLength(2);
		});

		it('is empty for a skill nobody uses', async () => {
			const id = await createSkill();

			expect(await skills.findUsage(id)).toEqual({ drafts: [], pins: [] });
		});

		it('counts distinct agents per skill across drafts and pins', async () => {
			const id = await createSkill();
			const unused = await createSkill();
			const v1 = await latestVersionId(id);
			const agent = await createAgent('Support');
			await skills.replaceDependencies(agent.id, [{ skillId: id }]);
			await skills.insertPins([
				{ agentVersionId: await publish(agent.id), skillId: id, skillVersionId: v1 },
			]);
			const other = await createAgent('Sales');
			await skills.insertPins([
				{ agentVersionId: await publish(other.id), skillId: id, skillVersionId: v1 },
			]);

			const counts = await skills.countUsingAgents([id, unused]);

			expect(counts.get(id)).toBe(2);
			expect(counts.get(unused)).toBeUndefined();
		});
	});

	describe('findProjectNames', () => {
		it('maps project ids to names', async () => {
			const names = await skills.findProjectNames([project.id, project.id, otherProject.id]);

			expect(names).toEqual(
				new Map([
					[project.id, 'Team'],
					[otherProject.id, 'Other team'],
				]),
			);
		});
	});

	describe('deleteSkill', () => {
		it('removes the skill with its versions, files and dependency rows', async () => {
			const id = await createSkill(
				{},
				content({ files: [{ path: 'references/a.md', content: 'a' }] }),
			);
			const v1 = await latestVersionId(id);
			const agent = await createAgent('Support');
			await skills.replaceDependencies(agent.id, [{ skillId: id }]);

			await skills.deleteSkill(id);

			expect(await skills.findByIds([id])).toEqual([]);
			expect((await skills.findVersionsByIds([v1])).size).toBe(0);
			expect(await skills.findFollowingAgentIds([id])).toEqual([]);
		});

		it('fails while a published agent version pins the skill', async () => {
			const id = await createSkill();
			const agent = await createAgent('Support');
			await skills.insertPins([
				{
					agentVersionId: await publish(agent.id),
					skillId: id,
					skillVersionId: await latestVersionId(id),
				},
			]);

			await expect(skills.deleteSkill(id)).rejects.toThrow();
		});
	});

	describe('row locks', () => {
		it('refuse to run outside a transaction', async () => {
			const id = await createSkill();

			await expect(skills.lockForEdit([id])).rejects.toThrow('transaction');
			await expect(skills.lockForPublish([id])).rejects.toThrow('transaction');
		});

		it('run inside a transaction', async () => {
			const id = await createSkill();

			await txRunner.run({}, async (ctx) => {
				await skills.lockForEdit([id], ctx);
				await skills.lockForPublish([id], ctx);
			});
		});
	});

	describe('AgentRepository.markDraftChangedIfInSync', () => {
		it('gives an agent in sync with its published version a new draft version id', async () => {
			const agent = await createAgent('Support', { inSync: true });

			const changed = await agents.markDraftChangedIfInSync([agent.id]);

			const reloaded = await agents.findOneByOrFail({ id: agent.id });
			expect(changed).toEqual([agent.id]);
			expect(reloaded.versionId).not.toBe(reloaded.activeVersionId);
			expect(reloaded.revision).toBe(agent.revision);
		});

		it('leaves an agent that already has unpublished changes alone', async () => {
			const agent = await createAgent('Support');

			const changed = await agents.markDraftChangedIfInSync([agent.id]);

			const reloaded = await agents.findOneByOrFail({ id: agent.id });
			expect(changed).toEqual([]);
			expect(reloaded.versionId).toBe(agent.versionId);
		});

		it('writes nothing for no agents', async () => {
			expect(await agents.markDraftChangedIfInSync([])).toEqual([]);
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
