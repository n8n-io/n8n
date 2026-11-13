import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { cleanupRolesAndScopes, createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import { setupTestServer } from '../shared/utils/';

beforeAll(async () => await testModules.loadModules(['agents']));

const testServer = setupTestServer({ endpointGroups: ['publicApi'] });

describe('DELETE /agents/:agentId', () => {
	let agentRepository: AgentRepository;

	beforeAll(async () => {
		agentRepository = Container.get(AgentRepository);
		Container.get(InstanceSettings).markAsLeader();
	});

	beforeEach(async () => {
		await agentRepository.delete({});
		await cleanupRolesAndScopes();
	});

	afterEach(async () => {
		await agentRepository.delete({});
		await testDb.truncate(['ProjectRelation', 'Project']);
	});

	const createAgent = async (projectId: string, id: string) =>
		await agentRepository.save({
			id,
			name: 'My Agent',
			projectId,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'draft-version',
		});

	test('should fail due to missing API Key', async () => {
		const response = await testServer.publicApiAgentWithoutApiKey().delete('/agents/abc123');

		expect(response.statusCode).toBe(401);
	});

	test('should fail due to invalid API Key', async () => {
		const response = await testServer.publicApiAgentWithApiKey('abcXYZ').delete('/agents/abc123');

		expect(response.statusCode).toBe(401);
	});

	test('should fail due to non-existing agent', async () => {
		const owner = await createOwnerWithApiKey();

		const response = await testServer.publicApiAgentFor(owner).delete('/agents/missing-agent');

		expect(response.statusCode).toBe(404);
	});

	test('should delete the agent and return its metadata', async () => {
		const member: User = await createMemberWithApiKey();
		const personalProject: Project = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(member.id);
		const agent = await createAgent(personalProject.id, 'agent-to-delete');

		const response = await testServer.publicApiAgentFor(member).delete('/agents/agent-to-delete');

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body).toEqual({
			id: agent.id,
			name: agent.name,
			projectId: personalProject.id,
			availableInMCP: false,
			versionId: 'draft-version',
			activeVersionId: null,
			createdAt: agent.createdAt.toISOString(),
			updatedAt: agent.updatedAt.toISOString(),
		});

		// the row is gone from the database
		expect(await agentRepository.existsBy({ id: agent.id })).toBe(false);
	});

	test('should return 403 when the API key lacks the agent:delete scope', async () => {
		const member = await createMemberWithApiKey({ scopes: ['agent:read'] });
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			member.id,
		);
		const agent = await createAgent(personalProject.id, 'agent-kept');

		const response = await testServer.publicApiAgentFor(member).delete('/agents/agent-kept');

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.existsBy({ id: agent.id })).toBe(true);
	});

	test('should return 403 when the user lacks the agent:delete project permission', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();
		// Project role without agent:delete: the API key scope alone must not be enough.
		const customRole = await createCustomRoleWithScopeSlugs(['agent:read'], {
			roleType: 'project',
			displayName: 'Agent Reader',
			description: 'Can read agents but not delete them',
		});

		const teamProject = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, teamProject, customRole.slug);
		const agent = await createAgent(teamProject.id, 'agent-kept');

		const response = await testServer.publicApiAgentFor(member).delete('/agents/agent-kept');

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.existsBy({ id: agent.id })).toBe(true);
	});

	test('should return 403 when the agent belongs to a project the user cannot access', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();
		const teamProject = await createTeamProject('Other Project', owner);
		const agent = await createAgent(teamProject.id, 'agent-kept');

		const response = await testServer.publicApiAgentFor(member).delete('/agents/agent-kept');

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.existsBy({ id: agent.id })).toBe(true);
	});
});
