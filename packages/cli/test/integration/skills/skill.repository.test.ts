import { ASSISTANT_SKILLS_FLAG } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { TransactionRunner, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import type { AgentScope } from '@/modules/agents/entities/agent.entity';

import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { registerSkillAgentsProvider } from '@/modules/agents/register-skill-agents-provider';
import { HubAssistantSkillProvider } from '@/modules/skills/hub-assistant-skill-provider.service';
import { skillContentHash, type SkillContent } from '@/modules/skills/skill-content-hash';
import { SkillRepository, type SkillVisibility } from '@/modules/skills/skill.repository';
import { SkillService } from '@/modules/skills/skill.service';
import { PostHogClient } from '@/posthog';

import { createOwner, createUser } from '../shared/db/users';

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
	const postHog = mockInstance(PostHogClient);
	let skills: SkillRepository;
	let assistantSkills: HubAssistantSkillProvider;
	let owner: User;
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
		registerSkillAgentsProvider();
		assistantSkills = Container.get(HubAssistantSkillProvider);
		owner = await createOwner();
		user = await createUser();
		project = await createTeamProject('Team');
		otherProject = await createTeamProject('Other team');
	});

	beforeEach(() => {
		postHog.getFeatureFlagForInstance.mockImplementation(
			async (flag) => flag === ASSISTANT_SKILLS_FLAG,
		);
	});

	afterEach(async () => {
		// Agent rows cascade to their history, pins and dependency rows.
		await agents.delete({});
		await skills.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('reads only enabled instance and session-project skills at their latest version', async () => {
		const instance = await createSkill();
		const scoped = await createSkill({ projectId: project.id });
		const other = await createSkill({ projectId: otherProject.id });
		const disabled = await createSkill();
		for (const id of [instance, scoped, other])
			await skills.update(id, { availableToAssistant: true });
		const versionId = await skills.insertSavedVersion(
			scoped,
			2,
			content({
				name: 'Updated',
				instructions: 'Updated instructions.',
				files: [{ path: 'references/style.md', content: 'Style guide.' }],
			}),
			null,
		);
		expect((await assistantSkills.listSkills({ user: owner })).map(({ id }) => id)).toEqual([
			instance,
		]);
		const result = await assistantSkills.listSkills({ user: owner, projectId: project.id });
		expect(result.map(({ id }) => id).sort()).toEqual([instance, scoped].sort());
		expect(result.find(({ id }) => id === scoped)).toEqual({
			id: scoped,
			projectId: project.id,
			name: 'Updated',
			description: 'Write in our voice',
			version: 2,
			versionId,
		});
		expect(await skills.findAssistantSkill(scoped, project.id)).toMatchObject({
			skill: { id: scoped, projectId: project.id },
			version: { id: versionId, version: 2, instructions: 'Updated instructions.' },
			files: [{ path: 'references/style.md' }],
		});
		expect(await skills.findAssistantSkill(instance, null)).toMatchObject({
			skill: { id: instance, projectId: null },
		});
		expect(await skills.findAssistantSkill(instance, project.id)).not.toBeNull();
		expect(await skills.findAssistantSkill(scoped, null)).toBeNull();
		expect(await skills.findAssistantSkill(other, project.id)).toBeNull();
		expect(await skills.findAssistantSkill(disabled, project.id)).toBeNull();
		expect(await skills.findAssistantSkill('skill_missing', project.id)).toBeNull();
	});

	it('reads a selected saved version with current availability and scope checks', async () => {
		const id = await createSkill(
			{ projectId: project.id },
			content({ files: [{ path: 'references/guide.md', content: 'Original guide.' }] }),
		);
		await skills.update(id, { availableToAssistant: true });
		const v1 = await latestVersionId(id);
		const v2 = await skills.insertSavedVersion(
			id,
			2,
			content({ files: [{ path: 'references/guide.md', content: 'Updated guide.' }] }),
			null,
		);
		const context = { user: owner, projectId: project.id };
		const selected = await assistantSkills.readSkill(context, id, v1);
		expect(selected?.versionId).toBe(v1);
		expect(selected?.files).toEqual([{ path: 'references/guide.md' }]);
		expect(await assistantSkills.readSkill(context, id)).toMatchObject({
			versionId: v2,
			files: [{ path: 'references/guide.md' }],
		});
		expect(await assistantSkills.readFile(context, id, v1, 'references/guide.md')).toEqual({
			skillId: id,
			versionId: v1,
			path: 'references/guide.md',
			content: 'Original guide.',
		});
		expect(await assistantSkills.readFile(context, id, v2, 'references/guide.md')).toMatchObject({
			content: 'Updated guide.',
		});
		expect(await assistantSkills.readFile(context, id, v1, 'references/missing.md')).toBeNull();
		expect(
			await assistantSkills.readFile(context, id, randomUUID(), 'references/guide.md'),
		).toBeNull();
		expect(await assistantSkills.readSkill(context, id, randomUUID())).toBeNull();
		const other = await createSkill({ projectId: project.id });
		expect(await assistantSkills.readSkill(context, id, await latestVersionId(other))).toBeNull();
		for (const denied of [
			{ user: owner, projectId: otherProject.id },
			{ user, projectId: project.id },
			{ user },
		]) {
			expect(await assistantSkills.readSkill(denied, id, v1)).toBeNull();
			expect(await assistantSkills.readFile(denied, id, v1, 'references/guide.md')).toBeNull();
		}
		expect(
			await assistantSkills.readFile(
				context,
				id,
				await latestVersionId(other),
				'references/guide.md',
			),
		).toBeNull();
		postHog.getFeatureFlagForInstance.mockResolvedValue(false);
		expect(await assistantSkills.readFile(context, id, v1, 'references/guide.md')).toBeNull();
		postHog.getFeatureFlagForInstance.mockResolvedValue(true);
		await skills.update(id, { availableToAssistant: false });
		expect(await assistantSkills.readFile(context, id, v1, 'references/guide.md')).toBeNull();
		expect(await assistantSkills.readSkill(context, id, v1)).toBeNull();
	});

	it.each(['project', 'instance'] as const)(
		'excludes skills scoped to an agent with %s scope even when their flag is set',
		async (scope) => {
			const agent = await createAgent('Support', {
				projectId: scope === 'project' ? project.id : null,
				scope,
			});
			const id = await createSkill({ agentId: agent.id });
			await skills.update(id, { availableToAssistant: true });

			expect(await skills.findAssistantSkillSummaries(null)).toEqual([]);
			expect(await skills.findAssistantSkillSummaries(project.id)).toEqual([]);
			expect(await skills.findAssistantSkill(id, project.id)).toBeNull();
			expect(
				await assistantSkills.readSkill({ user: owner, projectId: project.id }, id),
			).toBeNull();
		},
	);

	it('refuses an availability update when the checked scope changed', async () => {
		const id = await createSkill({ projectId: project.id });
		await expect(
			txRunner.run(
				{},
				async (ctx) =>
					await Container.get(SkillService).setAssistantAvailability(
						id,
						true,
						{ projectId: otherProject.id, agentId: null },
						ctx,
					),
			),
		).rejects.toThrow('The skill scope changed');
		expect((await skills.findByIds([id]))[0].availableToAssistant).toBe(false);
	});

	it('clears Assistant availability only when a skill moves to an agent', async () => {
		const id = await createSkill();
		const agent = await createAgent('Private scope');
		await skills.update(id, { availableToAssistant: true });
		await skills.updateTarget(id, { projectId: project.id, agentId: null });
		expect((await skills.findByIds([id]))[0].availableToAssistant).toBe(true);
		await skills.updateTarget(id, { projectId: null, agentId: agent.id });
		expect((await skills.findByIds([id]))[0].availableToAssistant).toBe(false);
		await skills.updateTarget(id, { projectId: null, agentId: null });
		expect((await skills.findByIds([id]))[0].availableToAssistant).toBe(false);
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

	async function createAgent(
		name: string,
		options: { inSync?: boolean; projectId?: string | null; scope?: AgentScope } = {},
	) {
		const versionId = randomUUID();
		const agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name,
				projectId: options.projectId === undefined ? project.id : options.projectId,
				scope: options.scope ?? 'project',
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

		it('filters by the skills an agent uses and its own skills, with the other filters', async () => {
			const support = await createAgent('Support');
			const used = await createSkill({}, content({ name: 'Used one' }));
			const usedOther = await createSkill({ projectId: otherProject.id });
			const own = await createSkill({ agentId: support.id });
			await createSkill();
			await createSkill({ agentId: (await createAgent('Sales')).id });

			const page = async (filter: { search?: string; projectIds?: string[] | 'all' } = {}) =>
				ids(
					await skills.findVisiblePage(await visibleTo(filter.projectIds ?? 'all'), {
						skip: 0,
						usedBy: { agentId: support.id, skillIds: [used, usedOther] },
						search: filter.search,
					}),
				).sort();

			expect(await page()).toEqual([used, usedOther, own].sort());
			expect(await page({ search: 'used' })).toEqual([used]);
			// The filter narrows the visible skills, it never adds to them.
			expect(await page({ projectIds: [project.id] })).toEqual([used, own].sort());
		});

		it('lists only its own skills for an agent that uses none', async () => {
			const support = await createAgent('Support');
			const own = await createSkill({ agentId: support.id });
			await createSkill();

			const page = await skills.findVisiblePage(await visibleTo('all'), {
				skip: 0,
				usedBy: { agentId: support.id, skillIds: [] },
			});

			expect(ids(page)).toEqual([own]);
		});

		it('filters by creator', async () => {
			const other = await createUser();
			const mine = await createSkill();
			await skills.update({ id: mine }, { createdById: user.id });
			const theirs = await createSkill();
			await skills.update({ id: theirs }, { createdById: other.id });
			await createSkill();

			const page = await skills.findVisiblePage(await visibleTo('all'), {
				skip: 0,
				createdById: user.id,
			});

			expect(ids(page)).toEqual([mine]);
		});

		it('sorts by the latest name without case, both ways, with the id as tie break', async () => {
			const beta = await createSkill({}, content({ name: 'old' }));
			await skills.insertSavedVersion(beta, 2, content({ name: 'beta' }), null);
			const alpha = await createSkill({}, content({ name: 'Alpha' }));
			const gamma1 = await createSkill({}, content({ name: 'Gamma' }));
			const gamma2 = await createSkill({}, content({ name: 'gamma' }));
			const visibility = { projectIds: [], agentIds: [] };
			const gammas = [gamma1, gamma2].sort();

			const asc = await skills.findVisiblePage(visibility, {
				skip: 0,
				sort: { by: 'name', order: 'ASC' },
			});
			const desc = await skills.findVisiblePage(visibility, {
				skip: 0,
				sort: { by: 'name', order: 'DESC' },
			});
			const secondPage = await skills.findVisiblePage(visibility, {
				skip: 2,
				take: 1,
				sort: { by: 'name', order: 'ASC' },
			});

			expect(ids(asc)).toEqual([alpha, beta, ...gammas]);
			expect(ids(desc)).toEqual([...gammas, beta, alpha]);
			expect(ids(secondPage)).toEqual([gammas[0]]);
			expect(secondPage.count).toBe(4);
		});

		it('sorts by last change, oldest first on request', async () => {
			const first = await createSkill();
			const second = await createSkill();
			await skills.update({ id: first }, { updatedAt: new Date('2026-01-01T00:00:00.000Z') });
			await skills.update({ id: second }, { updatedAt: new Date('2026-02-01T00:00:00.000Z') });
			const visibility = { projectIds: [], agentIds: [] };

			const asc = await skills.findVisiblePage(visibility, {
				skip: 0,
				sort: { by: 'updatedAt', order: 'ASC' },
			});
			const byDefault = await skills.findVisiblePage(visibility, { skip: 0 });

			expect(ids(asc)).toEqual([first, second]);
			expect(ids(byDefault)).toEqual([second, first]);
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

	describe('findVisibleCreatorIds', () => {
		it('lists each creator of a visible skill once', async () => {
			const other = await createUser();
			const hidden = await createUser();
			const instance = await createSkill();
			const team = await createSkill({ projectId: project.id });
			const again = await createSkill();
			const otherTeam = await createSkill({ projectId: otherProject.id });
			await createSkill();
			await skills.update({ id: instance }, { createdById: user.id });
			await skills.update({ id: again }, { createdById: user.id });
			await skills.update({ id: team }, { createdById: other.id });
			await skills.update({ id: otherTeam }, { createdById: hidden.id });

			const creators = await skills.findVisibleCreatorIds(await visibleTo([project.id]));

			expect(creators.sort()).toEqual([user.id, other.id].sort());
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
		it('maps version ids to their number', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const v2 = await skills.insertSavedVersion(id, 2, content({ instructions: 'v2' }), null);

			expect(await skills.findVersionNumbers([v1, v2, randomUUID()])).toEqual(
				new Map([
					[v1, 1],
					[v2, 2],
				]),
			);
		});

		it('finds version ids without their content, for publish', async () => {
			const id = await createSkill();
			const v1 = await latestVersionId(id);
			const v2 = await skills.insertSavedVersion(id, 2, content({ instructions: 'v2' }), null);

			expect(await skills.findLatestVersionIds([id, 'skill_unknown'])).toEqual(new Map([[id, v2]]));
			expect(await skills.findSkillIdsOfVersions([v1, v2, randomUUID()])).toEqual(
				new Map([
					[v1, id],
					[v2, id],
				]),
			);
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
