import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SkillRepository } from '@/modules/agents/repositories/skill.repository';

import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

const body = { name: 'Brand voice', description: 'How we write', instructions: 'Be brief.' };

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

describe('SkillsController', () => {
	const server = setupTestServer({ endpointGroups: ['ai'] });
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

	afterEach(async () => {
		await Container.get(AgentRepository).delete({});
		await Container.get(SkillRepository).delete({});
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
				skills: {},
				versionId,
			}),
		);
		if (options.published) {
			// Published and in sync: the draft is the published version.
			const histories = Container.get(AgentHistoryRepository);
			await histories.save(histories.create({ versionId, agentId: agent.id, author: 'Test' }));
			await agents.update({ id: agent.id }, { activeVersionId: versionId });
		}
		await Container.get(SkillRepository).replaceDependencies(agent.id, [
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
