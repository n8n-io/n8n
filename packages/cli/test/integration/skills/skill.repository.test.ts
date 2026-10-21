import {
	createTeamProject,
	getPersonalProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { TransactionRunner, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { skillContentHash, type SkillContent } from '@/modules/skills/skill-content-hash';
import { SkillRepository, type SkillVisibility } from '@/modules/skills/skill.repository';

import { createUser } from '../shared/db/users';

/** More ids than SQLite binds in one query (32,766). */
const manyUnknownIds = () => Array.from({ length: 33_000 }, (_, i) => `skill_unknown${i}`);

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
	let agentSkills: AgentSkillRepository;
	let agents: AgentRepository;
	let histories: AgentHistoryRepository;
	let txRunner: TransactionRunner;
	let user: User;
	let project: Project;
	let otherProject: Project;

	beforeAll(async () => {
		await testModules.loadModules(['skills', 'agents']);
		await testDb.init();
		skills = Container.get(SkillRepository);
		agentSkills = Container.get(AgentSkillRepository);
		agents = Container.get(AgentRepository);
		histories = Container.get(AgentHistoryRepository);
		txRunner = Container.get(TransactionRunner);
		user = await createUser();
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
		target: { projectId?: string; agentId?: string } = {},
		body: SkillContent = content(),
	): Promise<string> {
		const id = `skill_test${++counter}`;
		await skills.createSkill(
			{
				id,
				target: { projectId: target.projectId ?? null, agentId: target.agentId ?? null },
				source: 'ui',
				createdById: null,
			},
			body,
		);
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
		return versionId;
	}

	/** What `SkillsApiService` passes: the projects, and the agents in them. */
	async function visibleTo(projectIds: string[] | 'all'): Promise<SkillVisibility> {
		return {
			projectIds,
			agentIds: projectIds === 'all' ? 'all' : await agentSkills.findAgentIdsInProjects(projectIds),
		};
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
				agentId: null,
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
							target: { projectId: null, agentId: null },
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

	describe('findLatestNamesInTarget', () => {
		it('returns the latest name of each skill in one target only', async () => {
			const instance = await createSkill({}, content({ name: 'Old name' }));
			await skills.insertSavedVersion(instance, 2, content({ name: 'New name' }), null);
			const inProject = await createSkill({ projectId: project.id }, content({ name: 'P' }));
			const agent = await createAgent('Agent', { projectId: project.id });
			const ofAgent = await createSkill({ agentId: agent.id }, content({ name: 'A' }));

			expect(await skills.findLatestNamesInTarget({ projectId: null, agentId: null })).toEqual([
				{ skillId: instance, name: 'New name' },
			]);
			// The agent skills of a project are not project skills.
			expect(
				await skills.findLatestNamesInTarget({ projectId: project.id, agentId: null }),
			).toEqual([{ skillId: inProject, name: 'P' }]);
			expect(await skills.findLatestNamesInTarget({ projectId: null, agentId: agent.id })).toEqual([
				{ skillId: ofAgent, name: 'A' },
			]);
		});
	});

	describe('findVisiblePage', () => {
		const firstPage = { skip: 0 };
		const ids = (page: { skills: Array<{ id: string }> }) => page.skills.map((skill) => skill.id);

		it('lists instance skills and the skills of the given projects and their agents, newest change first', async () => {
			const instance = await createSkill();
			const team = await createSkill({ projectId: project.id });
			const otherTeam = await createSkill({ projectId: otherProject.id });
			const agentSkill = await createSkill({ agentId: (await createAgent('Support')).id });
			const otherAgentSkill = await createSkill({
				agentId: (await createAgent('Sales', { projectId: otherProject.id })).id,
			});
			await skills.insertSavedVersion(instance, 2, content({ instructions: 'touched' }), null);

			const page = await skills.findVisiblePage(await visibleTo([project.id]), firstPage);

			expect(ids(page)).toEqual(expect.arrayContaining([instance, team, agentSkill]));
			expect(ids(page)).not.toContain(otherTeam);
			expect(ids(page)).not.toContain(otherAgentSkill);
			expect(ids(page)[0]).toBe(instance);
			expect(page.count).toBe(3);
		});

		it("adds every project's skills and every agent's skills when allowed", async () => {
			const otherTeam = await createSkill({ projectId: otherProject.id });
			const otherAgentSkill = await createSkill({
				agentId: (await createAgent('Sales', { projectId: otherProject.id })).id,
			});

			const page = await skills.findVisiblePage(await visibleTo('all'), firstPage);

			expect(ids(page)).toEqual(expect.arrayContaining([otherTeam, otherAgentSkill]));
		});

		it('lists no project or agent skill for an empty project list', async () => {
			await createSkill({ projectId: project.id });
			await createSkill({ agentId: (await createAgent('Support')).id });

			const visibility = { projectIds: [], agentIds: [] };
			const none = { skills: [], count: 0 };
			expect(await skills.findVisiblePage(visibility, firstPage)).toEqual(none);
			expect(await skills.findVisiblePage(visibility, { ...firstPage, scope: 'project' })).toEqual(
				none,
			);
			expect(await skills.findVisiblePage(visibility, { ...firstPage, scope: 'agent' })).toEqual(
				none,
			);
		});

		it('filters by scope and project in the query, an agent skill by the project of its agent', async () => {
			const instance = await createSkill();
			const team = await createSkill({ projectId: project.id });
			const otherTeam = await createSkill({ projectId: otherProject.id });
			const agentSkill = await createSkill({ agentId: (await createAgent('Support')).id });
			const otherAgentSkill = await createSkill({
				agentId: (await createAgent('Sales', { projectId: otherProject.id })).id,
			});
			const everything = await visibleTo('all');

			const page = async ({
				projectId,
				...filter
			}: {
				scope?: 'project' | 'agent' | 'instance';
				projectId?: string;
			}) =>
				ids(
					await skills.findVisiblePage(everything, {
						...firstPage,
						...filter,
						...(projectId && {
							project: {
								id: projectId,
								agentIds: await agentSkills.findAgentIdsInProjects([projectId]),
							},
						}),
					}),
				).sort();

			expect(await page({ scope: 'instance' })).toEqual([instance]);
			expect(await page({ scope: 'project' })).toEqual([team, otherTeam].sort());
			expect(await page({ scope: 'agent' })).toEqual([agentSkill, otherAgentSkill].sort());
			expect(await page({ projectId: project.id })).toEqual([team, agentSkill].sort());
			expect(await page({ scope: 'project', projectId: project.id })).toEqual([team]);
			expect(await page({ scope: 'agent', projectId: project.id })).toEqual([agentSkill]);
			expect(await page({ scope: 'instance', projectId: project.id })).toEqual([]);
		});

		it('lists what one agent may attach: its project skills, its own skills and instance skills', async () => {
			const support = await createAgent('Support');
			const sales = await createAgent('Sales');
			const instance = await createSkill();
			const team = await createSkill({ projectId: project.id });
			await createSkill({ projectId: otherProject.id });
			const own = await createSkill({ agentId: support.id });
			await createSkill({ agentId: sales.id });

			const attachable = async (projectIds: string[] | 'all') =>
				ids(
					await skills.findVisiblePage(await visibleTo(projectIds), {
						skip: 0,
						attachableTo: { agentId: support.id, projectId: project.id },
					}),
				).sort();

			expect(await attachable([project.id])).toEqual([instance, team, own].sort());
			expect(await attachable('all')).toEqual([instance, team, own].sort());
			// A user who may not list the project's skills gets only the instance skills.
			expect(await attachable([otherProject.id])).toEqual([instance]);
		});

		it('searches the name and description of the latest version, before the page is cut', async () => {
			const renamed = await createSkill({}, content({ name: 'Old name' }));
			await skills.insertSavedVersion(renamed, 2, content({ name: 'Triage RULES' }), null);
			const described = await createSkill(
				{},
				content({ name: 'Other', description: 'rules for x' }),
			);
			await createSkill({}, content({ name: 'Unrelated' }));
			const visibility = { projectIds: [], agentIds: [] };

			const byName = await skills.findVisiblePage(visibility, {
				skip: 0,
				take: 1,
				search: 'rules',
			});
			const all = await skills.findVisiblePage(visibility, { skip: 0, search: 'RULES' });
			const oldName = await skills.findVisiblePage(visibility, { skip: 0, search: 'old name' });

			expect(byName.count).toBe(2);
			expect(byName.skills).toHaveLength(1);
			expect(ids(all).sort()).toEqual([renamed, described].sort());
			expect(oldName).toEqual({ skills: [], count: 0 });
		});

		it('treats LIKE wildcards in the search as plain text', async () => {
			const percent = await createSkill({}, content({ name: '100% done' }));
			await createSkill({}, content({ name: '100 done' }));
			const visibility = { projectIds: [], agentIds: [] };

			const page = await skills.findVisiblePage(visibility, { skip: 0, search: '100%' });

			expect(ids(page)).toEqual([percent]);
		});

		it('cuts the page with skip and take, and answers past the end with the full count', async () => {
			for (let i = 0; i < 3; i++) await createSkill();
			const visibility = { projectIds: [], agentIds: [] };

			const all = await skills.findVisiblePage(visibility, { skip: 0 });
			const second = await skills.findVisiblePage(visibility, { skip: 1, take: 1 });
			const past = await skills.findVisiblePage(visibility, { skip: 10, take: 5 });

			expect(all.skills).toHaveLength(3);
			expect(ids(second)).toEqual([ids(all)[1]]);
			expect(second.count).toBe(3);
			expect(past).toEqual({ skills: [], count: 3 });
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

			const { skills: page } = await skills.findVisiblePage(
				{ projectIds: [], agentIds: [] },
				{ skip: 0 },
			);
			expect(page[0].id).toBe(first);
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
				version: 2,
			});
		});

		it('resolves the latest of three versions with its own files', async () => {
			const id = await createSkill();
			await skills.insertSavedVersion(
				id,
				2,
				content({ instructions: 'v2', files: [{ path: 'references/a.md', content: 'a2' }] }),
				null,
			);
			await skills.insertSavedVersion(
				id,
				3,
				content({ instructions: 'v3', files: [{ path: 'references/a.md', content: 'a3' }] }),
				null,
			);

			const latest = (await skills.findLatestSaved([id])).get(id);

			expect(latest?.version).toMatchObject({ version: 3, instructions: 'v3' });
			expect(latest?.files.map((file) => file.content)).toEqual(['a3']);
		});

		it('reads more skill ids than one query can bind', async () => {
			const id = await createSkill();
			const ids = [id, ...manyUnknownIds()];

			expect([...(await skills.findLatestSaved(ids)).keys()]).toEqual([id]);
			expect([...(await skills.findLatestSummaries(ids)).keys()]).toEqual([id]);
			expect(await skills.findByIds(ids)).toHaveLength(1);
		});

		it('finds versions by id with their skill', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);

			const found = await skills.findVersionsByIds([v1, randomUUID()]);

			expect([...found.keys()]).toEqual([v1]);
			expect(found.get(v1)?.skill.id).toBe(id);
		});
	});

	describe('reads for the agents module', () => {
		it('tells whether an agent owns a skill', async () => {
			const owner = await createAgent('Owner');
			const other = await createAgent('Other');
			await createSkill({ agentId: owner.id });

			expect(await skills.existsForAgent(owner.id)).toBe(true);
			expect(await skills.existsForAgent(other.id)).toBe(false);
		});

		it('maps version ids to their number and content hash', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const v2 = await skills.insertSavedVersion(id, 2, content({ instructions: 'v2' }), null);

			expect(await skills.findVersionNumbers([v1, v2, randomUUID()])).toEqual(
				new Map([
					[v1, 1],
					[v2, 2],
				]),
			);
			expect(await skills.findContentHashes([v2])).toEqual(
				new Map([[v2, skillContentHash(content({ instructions: 'v2' }))]]),
			);
		});

		it('maps skill ids to the content hash of their latest version', async () => {
			const id = await createSkill();
			await skills.insertSavedVersion(id, 2, content({ instructions: 'v2' }), null);

			expect(await skills.findLatestContentHashes([id, 'skill_gone'])).toEqual(
				new Map([[id, skillContentHash(content({ instructions: 'v2' }))]]),
			);
		});

		it('lists every version of the skills an agent owns and of the skills it refers to', async () => {
			const agent = await createAgent('Support');
			const own = await createSkill({ agentId: agent.id });
			const referred = await createSkill({ projectId: project.id });
			await createSkill({ projectId: project.id });
			await skills.insertSavedVersion(own, 2, content({ instructions: 'v2' }), null);

			const versions = await skills.findVersionsOfAgentSkills(agent.id, [referred]);

			expect(versions.map(({ skillId, version }) => [skillId, version]).sort()).toEqual(
				[
					[own, 1],
					[own, 2],
					[referred, 1],
				].sort(),
			);
			expect(versions.every((version) => version.contentHash.length === 64)).toBe(true);
		});
	});

	describe('updateTarget', () => {
		it('moves a skill to one agent and back to the instance', async () => {
			const id = await createSkill({ projectId: project.id });
			const agent = await createAgent('Agent');

			await skills.updateTarget(id, { projectId: null, agentId: agent.id });
			expect((await skills.findByIds([id]))[0]).toMatchObject({
				projectId: null,
				agentId: agent.id,
			});

			await skills.updateTarget(id, { projectId: null, agentId: null });
			expect((await skills.findByIds([id]))[0]).toMatchObject({ projectId: null, agentId: null });
		});
	});

	describe('findProjects', () => {
		it('maps project ids to names and types', async () => {
			const personal = await getPersonalProject(user);

			const projects = await skills.findProjects([
				project.id,
				project.id,
				otherProject.id,
				personal.id,
			]);

			expect(projects).toEqual(
				new Map([
					[project.id, { name: 'Team', type: 'team' }],
					[otherProject.id, { name: 'Other team', type: 'team' }],
					[personal.id, { name: personal.name, type: 'personal' }],
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
			await agentSkills.replaceDependencies(agent.id, [{ skillId: id }]);

			await skills.deleteSkill(id);

			expect(await skills.findByIds([id])).toEqual([]);
			expect((await skills.findVersionsByIds([v1])).size).toBe(0);
			expect(await agentSkills.findFollowingAgentIds([id])).toEqual([]);
		});

		it('removes the pins of published agent versions with the skill', async () => {
			const id = await createSkill();
			const agent = await createAgent('Support');
			const agentVersionId = await publish(agent.id);
			await agentSkills.insertPins([
				{ agentVersionId, skillId: id, skillVersionId: await latestVersionId(id) },
			]);

			await skills.deleteSkill(id);

			expect(await agentSkills.findPinned(agentVersionId)).toEqual(new Map());
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
});
