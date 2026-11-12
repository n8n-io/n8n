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

describe('POST /agents', () => {
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

	/** Builder-only state of the internal `AgentDto` stays off the public response. */
	const builderOnlyFields = [
		'isRunnable',
		'hasPublishHistory',
		'hasVersionHistory',
		'skills',
		'skillHashes',
		'outdatedSkillIds',
		'skillVersions',
	];

	test('should fail due to missing API Key', async () => {
		const response = await testServer.publicApiAgentWithoutApiKey().post('/agents');

		expect(response.statusCode).toBe(401);
	});

	test('should fail due to invalid API Key', async () => {
		const response = await testServer.publicApiAgentWithApiKey('abcXYZ').post('/agents');

		expect(response.statusCode).toBe(401);
	});

	test('should create an agent in the personal project by default', async () => {
		const member: User = await createMemberWithApiKey();
		const personalProject: Project = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(member.id);

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({ name: 'My Agent' });

		expect(response.statusCode, JSON.stringify(response.body)).toBe(201);
		expect(response.body).toMatchObject({
			id: expect.any(String),
			name: 'My Agent',
			projectId: personalProject.id,
			availableInMCP: false,
			isArchived: false,
			activeVersionId: null,
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			config: expect.objectContaining({ name: 'My Agent' }),
			tools: {},
			activeVersion: null,
		});
		for (const field of builderOnlyFields) {
			expect(response.body).not.toHaveProperty(field);
		}
		expect(
			await agentRepository.existsBy({ id: response.body.id, projectId: personalProject.id }),
		).toBe(true);
	});

	test('should create an agent in a team project with an explicit projectId', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();
		const teamProject = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, teamProject, 'project:editor');

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({ name: 'Team Agent', projectId: teamProject.id, availableInMCP: true });

		expect(response.statusCode, JSON.stringify(response.body)).toBe(201);
		expect(response.body).toMatchObject({
			name: 'Team Agent',
			projectId: teamProject.id,
			availableInMCP: true,
		});
		expect(
			await agentRepository.existsBy({ id: response.body.id, projectId: teamProject.id }),
		).toBe(true);
	});

	test('should accept an initial config', async () => {
		const member = await createMemberWithApiKey();

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({
				name: 'Configured Agent',
				config: { name: 'Configured Agent', model: 'openai/gpt-5', instructions: 'Help users' },
			});

		expect(response.statusCode, JSON.stringify(response.body)).toBe(201);
		expect(response.body.config).toMatchObject({
			name: 'Configured Agent',
			model: 'openai/gpt-5',
			instructions: 'Help users',
		});
	});

	test('should return 400 for an invalid initial config', async () => {
		const member = await createMemberWithApiKey();

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({
				name: 'Bad Agent',
				// Missing the required config fields `name`, `model`, and `instructions`.
				config: { instructions: 'No name or model' },
			});

		expect(response.statusCode).toBe(400);
	});

	test('should return 400 for an internal-only field', async () => {
		const member = await createMemberWithApiKey();

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({ name: 'Bad Agent', id: '0123456789abcdef' });

		expect(response.statusCode).toBe(400);
	});

	test('should return 403 when the API key lacks the agent:create scope', async () => {
		const member = await createMemberWithApiKey({ scopes: ['agent:read'] });

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({ name: 'My Agent' });

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.count()).toBe(0);
	});

	test('should return 403 when the user lacks the agent:create project permission', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();
		// Project role without agent:create: the API key scope alone must not be enough.
		const customRole = await createCustomRoleWithScopeSlugs(['agent:read'], {
			roleType: 'project',
			displayName: 'Agent Reader',
			description: 'Can read agents but not create them',
		});

		const teamProject = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, teamProject, customRole.slug);

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({ name: 'My Agent', projectId: teamProject.id });

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.existsBy({ projectId: teamProject.id })).toBe(false);
	});

	test('should return 400 for an invalid custom tool name', async () => {
		const member = await createMemberWithApiKey();

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({
				name: 'Tool Agent',
				tools: { 'my-tool': { code: 'return []', descriptor: { name: 'my-tool' } } },
			});

		expect(response.statusCode, JSON.stringify(response.body)).toBe(400);
		expect(await agentRepository.count()).toBe(0);
	});

	test('should accept custom tools with a valid name', async () => {
		const member = await createMemberWithApiKey();

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({
				name: 'Tool Agent',
				tools: { myTool: { code: 'return []', descriptor: { name: 'myTool' } } },
			});

		expect(response.statusCode, JSON.stringify(response.body)).toBe(201);
		expect(await agentRepository.count()).toBe(1);
	});

	test('should return 404 for a non-existing project', async () => {
		const member = await createMemberWithApiKey();

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({ name: 'My Agent', projectId: 'missing-project' });

		expect(response.statusCode).toBe(404);
	});
});
