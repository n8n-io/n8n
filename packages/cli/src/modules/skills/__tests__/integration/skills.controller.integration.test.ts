import { ASSISTANT_SKILLS_FLAG } from '@n8n/api-types';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';
import { SkillRepository } from '../../database/repositories/skill.repository';
import { SkillService } from '../../services/skill.service';
import { createSkill } from '../../testing';
import { PostHogClient } from '@/posthog';

import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner, createUser } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

const body = { name: 'Brand voice', description: 'How we write', instructions: 'Be brief.' };

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents']);
});

describe('SkillsController', () => {
	const server = setupTestServer({ endpointGroups: ['ai'] });
	const postHog = mockInstance(PostHogClient);
	let ownerUser: User;
	let memberUser: User;
	let owner: SuperAgentTest;
	let member: SuperAgentTest;
	let editor: SuperAgentTest;
	let viewer: SuperAgentTest;
	let outsider: SuperAgentTest;
	let project: Project;

	beforeAll(async () => {
		ownerUser = await createOwner();
		memberUser = await createMember();
		const editorUser = await createMember();
		const viewerUser = await createMember();
		owner = server.authAgentFor(ownerUser);
		member = server.authAgentFor(memberUser);
		editor = server.authAgentFor(editorUser);
		viewer = server.authAgentFor(viewerUser);
		outsider = server.authAgentFor(await createMember());
		project = await createTeamProject('Team');
		await linkUserToProject(editorUser, project, 'project:editor');
		await linkUserToProject(viewerUser, project, 'project:viewer');
	});

	beforeEach(async () => {
		postHog.getFeatureFlagForInstance.mockImplementation(
			async (flag) => flag === ASSISTANT_SKILLS_FLAG,
		);
	});

	it('keeps new skills unavailable and lets an owner toggle without a new content version', async () => {
		const {
			body: { data: created },
		} = await owner.post('/skills').send({ scope: 'instance', skill: body }).expect(200);
		expect(created.availableToAssistant).toBe(false);
		const {
			body: { data: saved },
		} = await owner
			.patch(`/skills/${created.id}`)
			.send({ baseSkillHash: created.skillHash, availableToAssistant: true })
			.expect(200);
		expect(saved.created).toBe(false);
		expect(saved.version).toBe(created.latestVersion);
		const {
			body: { data: detail },
		} = await owner.get(`/skills/${created.id}`).expect(200);
		expect(detail.availableToAssistant).toBe(true);
		await member
			.patch(`/skills/${created.id}`)
			.send({ baseSkillHash: created.skillHash, availableToAssistant: false })
			.expect(403);
		await owner
			.patch(`/skills/${created.id}`)
			.send({ baseSkillHash: created.skillHash, availableToAssistant: false })
			.expect(200);
		const {
			body: { data: disabled },
		} = await owner.get(`/skills/${created.id}`).expect(200);
		expect(disabled.availableToAssistant).toBe(false);
		expect(disabled.latestVersion).toBe(created.latestVersion);
	});

	it('blocks Assistant updates while ordinary skill edits remain available', async () => {
		const {
			body: { data: created },
		} = await owner.post('/skills').send({ scope: 'instance', skill: body }).expect(200);
		postHog.getFeatureFlagForInstance.mockResolvedValue(false);
		await owner
			.patch(`/skills/${created.id}`)
			.send({ baseSkillHash: created.skillHash, availableToAssistant: true })
			.expect(404);
		await owner
			.patch(`/skills/${created.id}`)
			.send({ baseSkillHash: created.skillHash, description: 'Updated description' })
			.expect(200);
	});

	it('uses the project edit permission for the Assistant toggle', async () => {
		const {
			body: { data: created },
		} = await editor
			.post('/skills')
			.send({ scope: 'project', projectId: project.id, skill: body })
			.expect(200);
		await viewer
			.patch(`/skills/${created.id}`)
			.send({ baseSkillHash: created.skillHash, availableToAssistant: true })
			.expect(403);
		await outsider
			.patch(`/skills/${created.id}`)
			.send({ baseSkillHash: created.skillHash, availableToAssistant: true })
			.expect(404);
		await editor
			.patch(`/skills/${created.id}`)
			.send({ baseSkillHash: created.skillHash, availableToAssistant: true })
			.expect(200);
	});

	it('rolls back availability when the content save is refused', async () => {
		const {
			body: { data: created },
		} = await owner.post('/skills').send({ scope: 'instance', skill: body }).expect(200);
		await owner
			.patch(`/skills/${created.id}`)
			.send({ baseSkillHash: 'stale', availableToAssistant: true })
			.expect(409);
		const {
			body: { data: detail },
		} = await owner.get(`/skills/${created.id}`).expect(200);
		expect(detail.availableToAssistant).toBe(false);
	});

	it('requires moving an agent-scoped skill before enabling it for the Assistant', async () => {
		const agent = await newAgent('Assistant toggle test', project.id);
		const {
			body: { data: created },
		} = await owner
			.post('/skills')
			.send({ scope: 'agent', agentId: agent.id, skill: body })
			.expect(200);
		await owner
			.patch(`/skills/${created.id}`)
			.send({ baseSkillHash: created.skillHash, availableToAssistant: true })
			.expect(400);
		const {
			body: { data: detail },
		} = await owner.get(`/skills/${created.id}`).expect(200);
		expect(detail.availableToAssistant).toBe(false);
		await editor
			.patch(`/skills/${created.id}`)
			.send({
				baseSkillHash: created.skillHash,
				scope: 'project',
				projectId: project.id,
				availableToAssistant: true,
			})
			.expect(200);
		const {
			body: { data: moved },
		} = await owner.get(`/skills/${created.id}`).expect(200);
		expect(moved.scope).toBe('project');
		expect(moved.availableToAssistant).toBe(true);
	});

	it('creates a skill that the Assistant can use', async () => {
		const {
			body: { data: created },
		} = await editor
			.post('/skills')
			.send({ scope: 'project', projectId: project.id, skill: body, availableToAssistant: true })
			.expect(200);
		expect(created.availableToAssistant).toBe(true);
		expect(created.latestVersion).toBe(1);
	});

	it('creates nothing when the Assistant cannot use the new skill', async () => {
		const agent = await newAgent('Assistant create test', project.id);
		await owner
			.post('/skills')
			.send({ scope: 'agent', agentId: agent.id, skill: body, availableToAssistant: true })
			.expect(400);
		postHog.getFeatureFlagForInstance.mockResolvedValue(false);
		await owner
			.post('/skills')
			.send({ scope: 'instance', skill: body, availableToAssistant: true })
			.expect(400);
		const {
			body: { data: list },
		} = await owner.get('/skills').expect(200);
		expect(list.count).toBe(0);
	});

	afterEach(async () => {
		await Container.get(AgentRepository).delete({});
		await Container.get(SkillRepository).deleteAll();
	});

	async function newAgent(name: string, projectId: string) {
		const agents = Container.get(AgentRepository);
		return await agents.save(
			agents.create({
				id: randomUUID(),
				name,
				projectId,
				integrations: [],
				tools: {},
				skills: {},
				versionId: randomUUID(),
			}),
		);
	}

	async function attachToNewAgent(
		skillId: string,
		name: string,
		projectId: string,
		options: { published?: boolean; pinnedVersionId?: string } = {},
	) {
		const agents = Container.get(AgentRepository);
		const versionId = randomUUID();
		const agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name,
				projectId,
				integrations: [],
				tools: {},
				versionId,
			}),
		);
		if (options.published) {
			// Published and in sync: the draft is the published version.
			const histories = Container.get(AgentHistoryRepository);
			await histories.save(histories.create({ versionId, agentId: agent.id, author: 'Test' }));
			await agents.update({ id: agent.id }, { activeVersionId: versionId });
		}
		await Container.get(AgentSkillRepository).replaceDependencies(agent.id, [
			{ skillId, versionId: options.pinnedVersionId },
		]);
		return { ...agent, versionId };
	}

	const draftVersionOf = async (agentId: string) =>
		(await Container.get(AgentRepository).findOneByOrFail({ id: agentId })).versionId;

	async function create(agent: SuperAgentTest, payload: object, status = 200) {
		const response = await agent.post('/skills').send(payload).expect(status);
		return response.body.data as { id: string; skillHash: string };
	}

	describe('agent skills', () => {
		it('lets a project editor create one for an agent and checks the project of the agent', async () => {
			const agent = await newAgent('Support bot', project.id);
			const { id } = await create(editor, { scope: 'agent', agentId: agent.id, skill: body });

			const read = await editor.get(`/skills/${id}`).expect(200);
			expect(read.body.data).toMatchObject({
				id,
				scope: 'agent',
				agentId: agent.id,
				agentName: 'Support bot',
				projectId: project.id,
				projectName: 'Team',
				projectType: 'team',
				latestVersion: 1,
				canEdit: true,
				canDelete: true,
			});
			await outsider.get(`/skills/${id}`).expect(404);
			await outsider
				.patch(`/skills/${id}`)
				.send({ instructions: 'x', baseSkillHash: 'x' })
				.expect(404);
			await owner.get(`/skills/${id}`).expect(200);
		});

		it('refuses an agent skill to a user outside the project, and for an unknown agent', async () => {
			const agent = await newAgent('Support bot', project.id);

			await create(outsider, { scope: 'agent', agentId: agent.id, skill: body }, 403);
			await create(editor, { scope: 'agent', skill: body }, 400);
			await create(owner, { scope: 'agent', agentId: 'agent-gone', skill: body }, 404);
		});
	});

	describe('instance skills', () => {
		it('lets only owners and admins create and edit them, and everyone read them', async () => {
			await create(member, { scope: 'instance', skill: body }, 403);
			const { id } = await create(owner, { scope: 'instance', skill: body });

			const read = await member.get(`/skills/${id}`).expect(200);
			expect(read.body.data).toMatchObject({ scope: 'instance', canEdit: false, canDelete: false });
			await member
				.patch(`/skills/${id}`)
				.send({ instructions: 'x', baseSkillHash: 'x' })
				.expect(403);
			await member.delete(`/skills/${id}`).expect(403);
		});

		it('names only the agents the reader may see, and counts the others', async () => {
			const { id } = await create(owner, { scope: 'instance', skill: body });
			const agent = await attachToNewAgent(id, 'Support bot', project.id);

			const asOutsider = await outsider.get(`/skills/${id}`).expect(200);
			const asEditor = await editor.get(`/skills/${id}`).expect(200);

			expect(asOutsider.body.data.usedBy).toEqual({ drafts: [], pins: [], hiddenAgents: 1 });
			expect(asEditor.body.data.usedBy).toEqual({
				drafts: [{ agentId: agent.id, agentName: 'Support bot', projectId: project.id }],
				pins: [],
				hiddenAgents: 0,
			});
		});
	});

	describe('project skills', () => {
		it('lets editors write, viewers read, and hides them from outsiders', async () => {
			const { id } = await create(editor, { scope: 'project', projectId: project.id, skill: body });

			await viewer.get(`/skills/${id}`).expect(200);
			await viewer
				.patch(`/skills/${id}`)
				.send({ instructions: 'x', baseSkillHash: 'x' })
				.expect(403);
			await outsider.get(`/skills/${id}`).expect(404);
			await create(viewer, { scope: 'project', projectId: project.id, skill: body }, 403);
			await create(outsider, { scope: 'project', projectId: project.id, skill: body }, 403);
		});

		it('needs a project id', async () => {
			await create(editor, { scope: 'project', skill: body }, 400);
		});

		// The owner's global projectSkill:create passes the scope check for any project id.
		it('answers 404 for a project that does not exist', async () => {
			await create(owner, { scope: 'project', projectId: 'project-gone', skill: body }, 404);
			await create(member, { scope: 'project', projectId: 'project-gone', skill: body }, 403);
		});

		it('shows editors, viewers and owners what they may do, in the detail and the list', async () => {
			const { id } = await create(editor, { scope: 'project', projectId: project.id, skill: body });

			for (const [agent, may] of [
				[editor, true],
				[viewer, false],
				[owner, true],
			] as const) {
				const detail = await agent.get(`/skills/${id}`).expect(200);
				const list = await agent.get('/skills').query({ projectId: project.id }).expect(200);

				const expected = { id, canEdit: may, canDelete: may };
				expect(detail.body.data).toMatchObject(expected);
				expect(list.body.data.data).toEqual([expect.objectContaining(expected)]);
			}
		});
	});

	describe('list', () => {
		it('names the user who created each skill', async () => {
			await create(owner, { scope: 'instance', skill: body });

			const response = await owner.get('/skills').expect(200);

			expect(response.body.data.data[0].createdBy).toMatchObject({
				id: ownerUser.id,
				email: ownerUser.email,
			});
		});

		it('lists what the user may see, searched and paged on the server', async () => {
			const agent = await newAgent('Support bot', project.id);
			await create(editor, { scope: 'agent', agentId: agent.id, skill: { ...body, name: 'Mine' } });
			await create(owner, { scope: 'instance', skill: { ...body, name: 'Shared rules' } });
			await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: { ...body, name: 'Team rules' },
			});

			const all = await editor.get('/skills').expect(200);
			const outside = await member.get('/skills').expect(200);
			const search = await editor.get('/skills').query({ search: 'rules', take: 1 }).expect(200);
			const ownerView = await owner.get('/skills').query({ scope: 'project' }).expect(200);

			expect(all.body.data.data.map((s: { name: string }) => s.name).sort()).toEqual([
				'Mine',
				'Shared rules',
				'Team rules',
			]);
			expect(outside.body.data.data.map((s: { name: string }) => s.name)).toEqual(['Shared rules']);
			expect(search.body.data.count).toBe(2);
			expect(search.body.data.data).toHaveLength(1);
			expect(ownerView.body.data.data).toEqual([
				expect.objectContaining({ name: 'Team rules', projectName: 'Team' }),
			]);
		});

		it('lists the skills one agent may attach, never those of another agent', async () => {
			const support = await newAgent('Support bot', project.id);
			const sales = await newAgent('Sales bot', project.id);
			await create(editor, {
				scope: 'agent',
				agentId: support.id,
				skill: { ...body, name: 'Mine' },
			});
			await create(editor, {
				scope: 'agent',
				agentId: sales.id,
				skill: { ...body, name: 'Theirs' },
			});
			await create(owner, { scope: 'instance', skill: { ...body, name: 'Shared rules' } });
			await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: { ...body, name: 'Team rules' },
			});

			const attachable = await editor
				.get('/skills')
				.query({ attachableTo: support.id })
				.expect(200);

			expect(attachable.body.data.data.map((s: { name: string }) => s.name).sort()).toEqual([
				'Mine',
				'Shared rules',
				'Team rules',
			]);
			await editor.get('/skills').query({ attachableTo: support.id, scope: 'agent' }).expect(400);
		});

		it('filters by project, agent and creator, and sorts by name', async () => {
			await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: { ...body, name: 'beta team' },
			});
			await create(owner, { scope: 'instance', skill: { ...body, name: 'Alpha shared' } });
			const used = await create(owner, { scope: 'instance', skill: { ...body, name: 'Used' } });
			const support = await attachToNewAgent(used.id, 'Support bot', project.id);
			const names = (response: { body: { data: { data: Array<{ name: string }> } } }) =>
				response.body.data.data.map((s) => s.name);

			const byProject = await editor.get('/skills').query({ projectId: project.id }).expect(200);
			const hiddenProject = await member.get('/skills').query({ projectId: project.id });
			const byAgent = await editor.get('/skills').query({ agentId: support.id }).expect(200);
			const hiddenAgent = await member.get('/skills').query({ agentId: support.id });
			const byCreator = await owner
				.get('/skills')
				.query({ createdById: ownerUser.id, sortBy: 'name:asc' })
				.expect(200);
			const byName = await owner.get('/skills').query({ sortBy: 'name:desc' }).expect(200);

			expect(names(byProject)).toEqual(['beta team']);
			expect(hiddenProject.body.data).toEqual({ count: 0, data: [] });
			expect(names(byAgent)).toEqual(['Used']);
			expect(hiddenAgent.body.data).toEqual({ count: 0, data: [] });
			expect(names(byCreator)).toEqual(['Alpha shared', 'Used']);
			expect(names(byName)).toEqual(['Used', 'beta team', 'Alpha shared']);
			await owner.get('/skills').query({ sortBy: 'scope:asc' }).expect(400);
		});

		it('lists only the agents the user may read, searched by name and cut to take', async () => {
			const support = await newAgent('Support bot', project.id);
			await newAgent('Sales bot', project.id);
			const other = await createTeamProject('Other team');
			const hidden = await newAgent('Hidden bot', other.id);
			const ids = (response: { body: { data: Array<{ id: string; name: string }> } }) =>
				response.body.data.map((agent) => agent.name).sort();

			const forEditor = await editor.get('/skills/agents').expect(200);
			const forOutsider = await outsider.get('/skills/agents').expect(200);
			const forOwner = await owner.get('/skills/agents').expect(200);
			const searched = await editor.get('/skills/agents').query({ search: 'SUPP' }).expect(200);
			const cut = await editor.get('/skills/agents').query({ take: 1 }).expect(200);

			expect(ids(forEditor)).toEqual(['Sales bot', 'Support bot']);
			expect(forOutsider.body.data).toEqual([]);
			expect(ids(forOwner)).toEqual(expect.arrayContaining(['Hidden bot', 'Support bot']));
			expect(searched.body.data).toEqual([{ id: support.id, name: 'Support bot' }]);
			expect(cut.body.data).toHaveLength(1);
			expect(forOwner.body.data.find((a: { id: string }) => a.id === hidden.id)).toEqual({
				id: hidden.id,
				name: 'Hidden bot',
			});
			await editor.get('/skills/agents').query({ take: 0 }).expect(400);
		});

		it('refuses a creator filter that is not a UUID', async () => {
			await owner.get('/skills').query({ createdById: 'not-a-uuid' }).expect(400);
		});

		it('names the creators of the skills the user may see', async () => {
			await create(owner, { scope: 'instance', skill: body });
			await create(editor, { scope: 'project', projectId: project.id, skill: body });

			const forEditor = await editor.get('/skills/creators').expect(200);
			const forOutsider = await outsider.get('/skills/creators').expect(200);

			expect(forEditor.body.data).toHaveLength(2);
			expect(forOutsider.body.data).toEqual([
				expect.objectContaining({ id: ownerUser.id, email: ownerUser.email }),
			]);
		});
	});

	describe('save', () => {
		it('saves changed content as the next version and unchanged content as nothing', async () => {
			const { id, skillHash } = await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: body,
			});

			const saved = await editor
				.patch(`/skills/${id}`)
				.send({ instructions: 'Be very brief.', baseSkillHash: skillHash })
				.expect(200);
			const again = await editor
				.patch(`/skills/${id}`)
				.send({ instructions: 'Be very brief.', baseSkillHash: saved.body.data.skillHash })
				.expect(200);
			const read = await editor.get(`/skills/${id}`).expect(200);

			expect(saved.body.data).toMatchObject({ id, version: 2, created: true });
			expect(saved.body.data.skill.instructions).toBe('Be very brief.');
			expect(again.body.data).toMatchObject({ id, version: 2, created: false });
			expect(read.body.data).toMatchObject({
				latestVersion: 2,
				skillHash: saved.body.data.skillHash,
			});
		});

		it('refuses a save based on a stale hash', async () => {
			const { id, skillHash } = await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: body,
			});
			await editor
				.patch(`/skills/${id}`)
				.send({ instructions: 'First.', baseSkillHash: skillHash });

			await editor
				.patch(`/skills/${id}`)
				.send({ instructions: 'Second.', baseSkillHash: skillHash })
				.expect(409);
		});

		it('refuses a content change to a synced skill', async () => {
			const { id } = await createSkill({ projectId: project.id, source: 'github' });
			const { skillHash } = (await editor.get(`/skills/${id}`).expect(200)).body.data;

			const refused = await editor
				.patch(`/skills/${id}`)
				.send({ instructions: 'Be very brief.', baseSkillHash: skillHash })
				.expect(400);
			const read = await editor.get(`/skills/${id}`).expect(200);

			expect(refused.body.message).toBe(
				'"Brand voice" is synced from GitHub, so it is read-only in n8n. Change it in GitHub.',
			);
			expect(read.body.data).toMatchObject({ source: 'github', latestVersion: 1 });
		});

		it('moves a synced skill, because a move does not change its content', async () => {
			const { id } = await createSkill({ projectId: project.id, source: 'github' });
			const { skillHash } = (await owner.get(`/skills/${id}`).expect(200)).body.data;

			const moved = await owner
				.patch(`/skills/${id}`)
				.send({ scope: 'instance', baseSkillHash: skillHash })
				.expect(200);
			const read = await owner.get(`/skills/${id}`).expect(200);

			expect(moved.body.data).toMatchObject({ version: 1, created: false });
			expect(read.body.data).toMatchObject({ scope: 'instance', projectId: null });
		});

		it('refuses a save without a base hash', async () => {
			const { id } = await create(editor, { scope: 'project', projectId: project.id, skill: body });

			await editor.patch(`/skills/${id}`).send({ instructions: 'Be very brief.' }).expect(400);
		});

		it('refuses blank instructions', async () => {
			await create(
				editor,
				{ scope: 'project', projectId: project.id, skill: { ...body, instructions: '   ' } },
				400,
			);
		});

		it('marks a following agent that was in sync as changed, and leaves a pinned agent alone', async () => {
			const { id, skillHash } = await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: body,
			});
			const v1 = (await Container.get(SkillRepository).findLatestSaved([id])).get(id)?.version.id;
			const following = await attachToNewAgent(id, 'Follower', project.id, { published: true });
			const pinned = await attachToNewAgent(id, 'Pinned', project.id, {
				published: true,
				pinnedVersionId: v1,
			});

			const saved = await editor
				.patch(`/skills/${id}`)
				.send({ instructions: 'Ship weekly.', baseSkillHash: skillHash })
				.expect(200);

			expect(saved.body.data).toMatchObject({ version: 2, created: true });
			expect(await draftVersionOf(following.id)).not.toBe(following.versionId);
			expect(await draftVersionOf(pinned.id)).toBe(pinned.versionId);
		});
	});

	// The edit lock is a row lock on Postgres only. SQLite runs one write at a time.
	describe.skipIf(process.env.DB_TYPE !== 'postgresdb')('parallel saves on Postgres', () => {
		it('answers 409 to the second of two saves from the same base', async () => {
			const { id, skillHash } = await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: body,
			});

			const responses = await Promise.all(
				['First.', 'Second.'].map(
					async (instructions) =>
						await editor.patch(`/skills/${id}`).send({ instructions, baseSkillHash: skillHash }),
				),
			);
			const read = await editor.get(`/skills/${id}`).expect(200);

			expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
			expect(read.body.data.latestVersion).toBe(2);
		});
	});

	describe('unique names', () => {
		it('refuses a name like one that another skill in the same scope has', async () => {
			await create(editor, { scope: 'project', projectId: project.id, skill: body });

			const response = await editor
				.post('/skills')
				.send({ scope: 'project', projectId: project.id, skill: { ...body, name: 'brand-voice' } })
				.expect(409);

			expect(response.body.message).toBe('That name is taken, choose another');
		});

		it('refuses a name of only spaces and trims the padding of a name', async () => {
			await owner
				.post('/skills')
				.send({ scope: 'instance', skill: { ...body, name: '   ' } })
				.expect(400);
			const { id, skillHash } = await create(owner, {
				scope: 'instance',
				skill: { ...body, name: '  Padded name  ' },
			});
			expect((await owner.get(`/skills/${id}`).expect(200)).body.data.name).toBe('Padded name');

			await owner
				.patch(`/skills/${id}`)
				.send({ name: '   ', baseSkillHash: skillHash })
				.expect(400);
			await owner
				.patch(`/skills/${id}`)
				.send({ name: ' Renamed ', baseSkillHash: skillHash })
				.expect(200);

			expect((await owner.get(`/skills/${id}`).expect(200)).body.data.name).toBe('Renamed');
		});

		it('allows the same name in another scope', async () => {
			await create(editor, { scope: 'project', projectId: project.id, skill: body });

			await create(owner, { scope: 'instance', skill: { ...body, name: 'brand-voice' } });
		});

		it('allows the same name in two team projects', async () => {
			const other = await createTeamProject('Other team');

			await create(owner, { scope: 'project', projectId: project.id, skill: body });
			await create(owner, { scope: 'project', projectId: other.id, skill: body });
		});

		it('allows a rename that only changes case, even when another skill shares the name', async () => {
			// The data migration can leave two skills with one name key in a scope.
			const { id, skillHash } = await create(owner, { scope: 'instance', skill: body });
			await Container.get(SkillService).createTrusted({
				target: { projectId: null, agentId: null },
				skill: { ...body, name: 'brand voice' },
				source: 'ui',
				createdById: ownerUser.id,
			});

			await owner
				.patch(`/skills/${id}`)
				.send({ name: 'BRAND VOICE', baseSkillHash: skillHash })
				.expect(200);
		});

		it('renames and moves a skill to a name that only the old scope holds', async () => {
			await create(owner, { scope: 'project', projectId: project.id, skill: body });
			const { id, skillHash } = await create(owner, {
				scope: 'project',
				projectId: project.id,
				skill: { ...body, name: 'Code review' },
			});

			await owner
				.patch(`/skills/${id}`)
				.send({ name: 'brand-voice', scope: 'instance', baseSkillHash: skillHash })
				.expect(200);
			const read = await owner.get(`/skills/${id}`).expect(200);

			expect(read.body.data).toMatchObject({ name: 'brand-voice', scope: 'instance' });
		});

		it('refuses to move a skill into a scope that holds a name like it', async () => {
			await create(owner, { scope: 'instance', skill: body });
			const { id, skillHash } = await create(owner, {
				scope: 'project',
				projectId: project.id,
				skill: { ...body, name: 'BRAND VOICE' },
			});

			await owner
				.patch(`/skills/${id}`)
				.send({ scope: 'instance', baseSkillHash: skillHash })
				.expect(409);
			const read = await owner.get(`/skills/${id}`).expect(200);

			expect(read.body.data).toMatchObject({ scope: 'project', projectId: project.id });
		});

		it('refuses a rename to a taken name and allows a save that keeps the name', async () => {
			await create(owner, { scope: 'instance', skill: { ...body, name: 'Code review' } });
			const { id, skillHash } = await create(owner, { scope: 'instance', skill: body });

			await owner
				.patch(`/skills/${id}`)
				.send({ name: 'Code Review', baseSkillHash: skillHash })
				.expect(409);
			await owner
				.patch(`/skills/${id}`)
				.send({ instructions: 'Be very brief.', baseSkillHash: skillHash })
				.expect(200);
		});
	});

	describe('new name', () => {
		const newName = async (agent: SuperAgentTest, query: Record<string, string>, status = 200) =>
			(await agent.get('/skills/new-name').query(query).expect(status)).body.data as {
				name: string;
			};

		it('numbers a default name that its scope already holds', async () => {
			await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: { ...body, name: 'New skill' },
			});
			await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: { ...body, name: 'New skill 2' },
			});

			const free = await newName(editor, {
				scope: 'project',
				projectId: project.id,
				name: 'New skill',
			});

			expect(free).toEqual({ name: 'New skill 3' });
		});

		it('looks at the requested scope only', async () => {
			await create(owner, { scope: 'instance', skill: { ...body, name: 'New skill' } });

			const free = await newName(editor, {
				scope: 'project',
				projectId: project.id,
				name: 'New skill',
			});

			expect(free).toEqual({ name: 'New skill' });
		});

		it('ignores the names of another project', async () => {
			const other = await createTeamProject('Other team');
			await create(owner, {
				scope: 'project',
				projectId: other.id,
				skill: { ...body, name: 'New skill' },
			});

			const free = await newName(editor, {
				scope: 'project',
				projectId: project.id,
				name: 'New skill',
			});

			expect(free).toEqual({ name: 'New skill' });
		});

		it('needs the create permission in that scope', async () => {
			await newName(viewer, { scope: 'project', projectId: project.id, name: 'New skill' }, 403);
			await newName(member, { scope: 'instance', name: 'New skill' }, 403);
		});

		it('refuses a user outside the project, for a project and for an agent', async () => {
			const agent = await newAgent('Support bot', project.id);

			await newName(outsider, { scope: 'project', projectId: project.id, name: 'New skill' }, 403);
			await newName(outsider, { scope: 'agent', agentId: agent.id, name: 'New skill' }, 403);
		});
	});

	describe('change scope', () => {
		it('moves an unused skill and saves its content in the same request', async () => {
			const { id, skillHash } = await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: body,
			});

			const saved = await owner
				.patch(`/skills/${id}`)
				.send({ instructions: 'Be very brief.', scope: 'instance', baseSkillHash: skillHash })
				.expect(200);
			const read = await owner.get(`/skills/${id}`).expect(200);

			expect(saved.body.data).toMatchObject({ version: 2, created: true });
			expect(read.body.data).toMatchObject({ scope: 'instance', projectId: null });
		});

		it('moves a skill without a content change', async () => {
			const other = await createTeamProject('Other team');
			const { id, skillHash } = await create(owner, {
				scope: 'project',
				projectId: project.id,
				skill: body,
			});

			const saved = await owner
				.patch(`/skills/${id}`)
				.send({ scope: 'project', projectId: other.id, baseSkillHash: skillHash })
				.expect(200);
			const read = await owner.get(`/skills/${id}`).expect(200);

			expect(saved.body.data).toMatchObject({ version: 1, created: false });
			expect(read.body.data).toMatchObject({ scope: 'project', projectId: other.id });
		});

		it('needs the create permission where the skill goes', async () => {
			const { id, skillHash } = await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: body,
			});

			await editor
				.patch(`/skills/${id}`)
				.send({ scope: 'instance', baseSkillHash: skillHash })
				.expect(403);
			const read = await editor.get(`/skills/${id}`).expect(200);

			expect(read.body.data).toMatchObject({ scope: 'project', projectId: project.id });
		});

		it('needs a role in the team project where the skill goes', async () => {
			const other = await createTeamProject('Other team');
			const { id, skillHash } = await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: body,
			});

			await editor
				.patch(`/skills/${id}`)
				.send({ scope: 'project', projectId: other.id, baseSkillHash: skillHash })
				.expect(403);
			const read = await editor.get(`/skills/${id}`).expect(200);

			expect(read.body.data).toMatchObject({ scope: 'project', projectId: project.id });
		});

		it('needs the delete permission where the skill comes from', async () => {
			// A custom role that may create and edit skills everywhere but delete none.
			const role = await createCustomRoleWithScopeSlugs(
				[
					'skill:create',
					'skill:read',
					'skill:update',
					'projectSkill:create',
					'projectSkill:read',
					'projectSkill:update',
				],
				{ roleType: 'global' },
			);
			const noDelete = server.authAgentFor(await createUser({ role }));
			const { id, skillHash } = await create(owner, { scope: 'instance', skill: body });

			await noDelete
				.patch(`/skills/${id}`)
				.send({ scope: 'project', projectId: project.id, baseSkillHash: skillHash })
				.expect(403);
			await noDelete
				.patch(`/skills/${id}`)
				.send({ instructions: 'Be very brief.', baseSkillHash: skillHash })
				.expect(200);
		});

		it('moves a skill in use to the instance, where every agent keeps it', async () => {
			const { id, skillHash } = await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: body,
			});
			await attachToNewAgent(id, 'Support bot', project.id);

			await owner
				.patch(`/skills/${id}`)
				.send({ scope: 'instance', baseSkillHash: skillHash })
				.expect(200);
			const read = await owner.get(`/skills/${id}`).expect(200);

			expect(read.body.data).toMatchObject({ scope: 'instance', projectId: null });
		});

		it('answers 409 to a move that takes the skill from an agent, and saves nothing', async () => {
			const other = await createTeamProject('Other team');
			const { id, skillHash } = await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: body,
			});
			await attachToNewAgent(id, 'Support bot', project.id);

			const response = await owner
				.patch(`/skills/${id}`)
				.send({
					instructions: 'Be very brief.',
					scope: 'project',
					projectId: other.id,
					baseSkillHash: skillHash,
				})
				.expect(409);
			const read = await owner.get(`/skills/${id}`).expect(200);

			expect(response.body.message).toContain('"Support bot" would lose access to this skill.');
			expect(read.body.data).toMatchObject({
				scope: 'project',
				projectId: project.id,
				latestVersion: 1,
			});
		});

		it('needs a project id to move a skill to a project', async () => {
			const { id, skillHash } = await create(owner, { scope: 'instance', skill: body });

			await owner
				.patch(`/skills/${id}`)
				.send({ scope: 'project', baseSkillHash: skillHash })
				.expect(400);
		});

		it('does not move a skill to one agent', async () => {
			const { id, skillHash } = await create(owner, { scope: 'instance', skill: body });

			await owner
				.patch(`/skills/${id}`)
				.send({ scope: 'agent', baseSkillHash: skillHash })
				.expect(400);
		});
	});

	describe('delete', () => {
		it('deletes an unused skill', async () => {
			const { id } = await create(editor, { scope: 'project', projectId: project.id, skill: body });

			await editor.delete(`/skills/${id}`).expect(200);
			await editor.get(`/skills/${id}`).expect(404);
		});

		it('answers 409 and names the agents that use the skill', async () => {
			const { id } = await create(editor, { scope: 'project', projectId: project.id, skill: body });
			await attachToNewAgent(id, 'Support bot', project.id);

			const response = await editor.delete(`/skills/${id}`).expect(409);

			expect(response.body.message).toBe(
				'Skill "Brand voice" is used by Support bot (draft) and cannot be deleted.',
			);
		});
	});

	afterAll(async () => {
		await testDb.truncate(['User']);
	});
});
