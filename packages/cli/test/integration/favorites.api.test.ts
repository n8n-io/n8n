import { randomUUID } from 'node:crypto';

import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	shareWorkflowWithUsers,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { UserFavoriteRepository } from '@/modules/favorites/database/repositories/user-favorite.repository';

import { createAgent, ensureInstanceAgent } from './shared/db/agents';
import { createDataTable } from './shared/db/data-tables';
import { createFolder } from './shared/db/folders';
import { createMember, createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

beforeAll(async () => {
	await testModules.loadModules(['favorites', 'agents', 'skills']);
});

const testServer = utils.setupTestServer({
	endpointGroups: ['me'],
	modules: ['data-table'],
});

describe('POST /favorites', () => {
	let owner: User;
	let member: User;
	let anotherMember: User;
	let ownerPersonalProject: Project;
	let memberPersonalProject: Project;
	let authOwnerAgent: SuperAgentTest;
	let authMemberAgent: SuperAgentTest;

	beforeEach(async () => {
		await Container.get(UserFavoriteRepository).clear();
		await Container.get(AgentRepository).delete({});
		await testDb.truncate([
			'DataTable',
			'Folder',
			'SharedWorkflow',
			'WorkflowEntity',
			'WorkflowHistory',
			'ProjectRelation',
			'Project',
			'User',
		]);

		owner = await createOwner();
		member = await createMember();
		anotherMember = await createMember();
		ownerPersonalProject = await getPersonalProject(owner);
		memberPersonalProject = await getPersonalProject(member);
		authOwnerAgent = testServer.authAgentFor(owner);
		authMemberAgent = testServer.authAgentFor(member);
	});

	async function createProjectResources(project: Project, ownerUser?: User) {
		const workflow = await createWorkflow({}, ownerUser ?? project);
		const folder = await createFolder(project, { name: 'Folder' });
		const dataTable = await createDataTable(project, {
			name: 'Table',
			columns: [{ name: 'col', type: 'string' }],
		});
		const agent = await createAgent({
			id: randomUUID(),
			name: 'Agent',
			projectId: project.id,
			schema: { name: 'Agent', model: 'anthropic/claude-sonnet-4-5', instructions: 'Help' },
			integrations: [],
			tools: {},
			versionId: randomUUID(),
		});

		return { workflow, folder, dataTable, agent };
	}

	it('rejects favoriting resources in another project with 404 and persists no row', async () => {
		const { workflow, folder, dataTable, agent } = await createProjectResources(
			ownerPersonalProject,
			owner,
		);

		const cases = [
			{ resourceType: 'workflow', resourceId: workflow.id },
			{ resourceType: 'project', resourceId: ownerPersonalProject.id },
			{ resourceType: 'folder', resourceId: folder.id },
			{ resourceType: 'dataTable', resourceId: dataTable.id },
			{ resourceType: 'agent', resourceId: agent.id },
		] as const;
		const withMaskedId = (body: unknown, id: string): unknown =>
			JSON.parse(JSON.stringify(body).replaceAll(id, '<id>'));

		for (const payload of cases) {
			const denied = await authMemberAgent.post('/favorites').send(payload).expect(404);
			const missing = await authMemberAgent
				.post('/favorites')
				.send({ resourceType: payload.resourceType, resourceId: 'nonexistent-id' })
				.expect(404);

			expect(withMaskedId(denied.body, payload.resourceId)).toEqual(
				withMaskedId(missing.body, 'nonexistent-id'),
			);
		}

		const stored = await Container.get(UserFavoriteRepository).findByUser(member.id);
		expect(stored).toHaveLength(0);
	});

	it('rejects favoriting resources when project role lacks read scopes', async () => {
		const teamProject = await createTeamProject('Chat Project', anotherMember);
		await linkUserToProject(member, teamProject, 'project:chatUser');
		const { workflow, folder, dataTable, agent } = await createProjectResources(teamProject);

		const cases = [
			{ resourceType: 'workflow', resourceId: workflow.id },
			{ resourceType: 'project', resourceId: teamProject.id },
			{ resourceType: 'folder', resourceId: folder.id },
			{ resourceType: 'dataTable', resourceId: dataTable.id },
			{ resourceType: 'agent', resourceId: agent.id },
		] as const;

		for (const payload of cases) {
			await authMemberAgent.post('/favorites').send(payload).expect(404);
		}

		const stored = await Container.get(UserFavoriteRepository).findByUser(member.id);
		expect(stored).toHaveLength(0);
	});

	it('allows favoriting accessible resources across all resource types', async () => {
		const teamProject = await createTeamProject('Viewer Project', anotherMember);
		await linkUserToProject(member, teamProject, 'project:viewer');
		const { workflow, folder, dataTable, agent } = await createProjectResources(teamProject);

		const sharedWorkflow = await createWorkflow({}, anotherMember);
		await shareWorkflowWithUsers(sharedWorkflow, [member]);

		const cases = [
			{ resourceType: 'workflow', resourceId: workflow.id },
			{ resourceType: 'workflow', resourceId: sharedWorkflow.id },
			{ resourceType: 'project', resourceId: teamProject.id },
			{ resourceType: 'project', resourceId: memberPersonalProject.id },
			{ resourceType: 'folder', resourceId: folder.id },
			{ resourceType: 'dataTable', resourceId: dataTable.id },
			{ resourceType: 'agent', resourceId: agent.id },
		] as const;

		for (const payload of cases) {
			const response = await authMemberAgent.post('/favorites').send(payload).expect(200);
			expect(response.body.data).toMatchObject({
				userId: member.id,
				resourceId: payload.resourceId,
				resourceType: payload.resourceType,
			});
		}
	});

	it('allows global owner to favorite existing resources in other projects and rejects missing or instance agents', async () => {
		const { workflow, folder, dataTable, agent } = await createProjectResources(
			memberPersonalProject,
			member,
		);
		const instanceAgentId = 'instance-agent-1';
		await ensureInstanceAgent(instanceAgentId, 'Instance Agent');

		const cases = [
			{ resourceType: 'workflow', resourceId: workflow.id },
			{ resourceType: 'project', resourceId: memberPersonalProject.id },
			{ resourceType: 'folder', resourceId: folder.id },
			{ resourceType: 'dataTable', resourceId: dataTable.id },
			{ resourceType: 'agent', resourceId: agent.id },
		] as const;

		for (const payload of cases) {
			await authOwnerAgent.post('/favorites').send(payload).expect(200);
		}

		await authOwnerAgent
			.post('/favorites')
			.send({ resourceType: 'workflow', resourceId: 'missing-workflow' })
			.expect(404);
		await authOwnerAgent
			.post('/favorites')
			.send({ resourceType: 'agent', resourceId: instanceAgentId })
			.expect(404);
	});

	it('rejects re-favoriting a previously favorited resource after access is revoked', async () => {
		const teamProject = await createTeamProject('Temporary Project', anotherMember);
		await linkUserToProject(member, teamProject, 'project:viewer');
		const workflow = await createWorkflow({}, teamProject);

		await authMemberAgent
			.post('/favorites')
			.send({ resourceType: 'workflow', resourceId: workflow.id })
			.expect(200);

		await testDb.truncate(['ProjectRelation']);

		await authMemberAgent
			.post('/favorites')
			.send({ resourceType: 'workflow', resourceId: workflow.id })
			.expect(404);
	});
});
