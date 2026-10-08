import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

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

	async function create(agent: SuperAgentTest, payload: object, status = 200) {
		const response = await agent.post('/skills').send(payload).expect(status);
		return response.body.data as { id: string; skillHash: string };
	}

	describe('"Just you" skills', () => {
		it('lets any user create one and keeps it from other members', async () => {
			const { id } = await create(member, { scope: 'user', skill: body });

			const own = await member.get(`/skills/${id}`).expect(200);
			expect(own.body.data).toMatchObject({
				id,
				scope: 'user',
				userId: memberUser.id,
				name: 'Brand voice',
				latestVersion: 1,
				hasUnsavedChanges: false,
				canEdit: true,
				canDelete: true,
				usedBy: { drafts: [], pins: [] },
			});
			await outsider.get(`/skills/${id}`).expect(404);
			await outsider.patch(`/skills/${id}`).send({ instructions: 'x' }).expect(404);
			await owner.get(`/skills/${id}`).expect(200);
		});
	});

	describe('instance skills', () => {
		it('lets only owners and admins create and edit them, and everyone read them', async () => {
			await create(member, { scope: 'instance', skill: body }, 403);
			const { id } = await create(owner, { scope: 'instance', skill: body });

			const read = await member.get(`/skills/${id}`).expect(200);
			expect(read.body.data).toMatchObject({ scope: 'instance', canEdit: false, canDelete: false });
			await member.patch(`/skills/${id}`).send({ instructions: 'x' }).expect(403);
			await member.post(`/skills/${id}/save`).expect(403);
			await member.delete(`/skills/${id}`).expect(403);
		});
	});

	describe('project skills', () => {
		it('lets editors write, viewers read, and hides them from outsiders', async () => {
			const { id } = await create(editor, { scope: 'project', projectId: project.id, skill: body });

			await viewer.get(`/skills/${id}`).expect(200);
			await viewer.patch(`/skills/${id}`).send({ instructions: 'x' }).expect(403);
			await outsider.get(`/skills/${id}`).expect(404);
			await create(viewer, { scope: 'project', projectId: project.id, skill: body }, 403);
			await create(outsider, { scope: 'project', projectId: project.id, skill: body }, 403);
		});

		it('needs a project id', async () => {
			await create(editor, { scope: 'project', skill: body }, 400);
		});
	});

	describe('list', () => {
		it('lists what the user may see, searched and paged on the server', async () => {
			await create(member, { scope: 'user', skill: { ...body, name: 'Mine' } });
			await create(owner, { scope: 'instance', skill: { ...body, name: 'Shared rules' } });
			await create(editor, {
				scope: 'project',
				projectId: project.id,
				skill: { ...body, name: 'Team rules' },
			});

			const all = await member.get('/skills').expect(200);
			const search = await editor.get('/skills').query({ search: 'rules', take: 1 }).expect(200);
			const ownerView = await owner.get('/skills').query({ scope: 'project' }).expect(200);

			expect(all.body.data.data.map((s: { name: string }) => s.name).sort()).toEqual([
				'Mine',
				'Shared rules',
			]);
			expect(search.body.data.count).toBe(2);
			expect(search.body.data.data).toHaveLength(1);
			expect(ownerView.body.data.data).toEqual([
				expect.objectContaining({ name: 'Team rules', projectName: 'Team' }),
			]);
		});
	});

	describe('draft and save', () => {
		it('saves a changed draft as the next version and an unchanged one as nothing', async () => {
			const { id, skillHash } = await create(member, { scope: 'user', skill: body });

			const patched = await member
				.patch(`/skills/${id}`)
				.send({ instructions: 'Be very brief.', baseSkillHash: skillHash })
				.expect(200);
			const pending = await member.get(`/skills/${id}`).expect(200);
			const saved = await member.post(`/skills/${id}/save`).expect(200);
			const again = await member.post(`/skills/${id}/save`).expect(200);

			expect(patched.body.data.skill.instructions).toBe('Be very brief.');
			expect(pending.body.data).toMatchObject({ hasUnsavedChanges: true, latestVersion: 1 });
			expect(saved.body.data).toMatchObject({ id, version: 2, created: true });
			expect(again.body.data).toMatchObject({ id, version: 2, created: false });
		});

		it('refuses a draft update based on a stale hash', async () => {
			const { id } = await create(member, { scope: 'user', skill: body });

			await member
				.patch(`/skills/${id}`)
				.send({ instructions: 'x', baseSkillHash: 'stale' })
				.expect(409);
		});
	});

	describe('delete', () => {
		it('deletes an unused skill', async () => {
			const { id } = await create(member, { scope: 'user', skill: body });

			await member.delete(`/skills/${id}`).expect(200);
			await member.get(`/skills/${id}`).expect(404);
		});

		it('answers 409 and names the agents that use the skill', async () => {
			const { id } = await create(editor, { scope: 'project', projectId: project.id, skill: body });
			const agents = Container.get(AgentRepository);
			const agent = await agents.save(
				agents.create({
					id: randomUUID(),
					name: 'Support bot',
					projectId: project.id,
					integrations: [],
					tools: {},
					skills: {},
					versionId: randomUUID(),
				}),
			);
			await Container.get(SkillRepository).replaceDependencies(agent.id, [{ skillId: id }]);

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
