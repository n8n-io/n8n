import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { createAgent as createTestAgent, ensureInstanceAgent } from '@test-integration/db/agents';

import { ChatIntegrationService } from '@/modules/agents/integrations/chat-integration.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { saveCredential } from '../shared/db/credentials';
import { createFolder } from '../shared/db/folders';
import { cleanupRolesAndScopes, createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import { setupTestServer } from '../shared/utils/';

beforeAll(async () => await testModules.loadModules(['agents']));

const testServer = setupTestServer({ endpointGroups: ['publicApi'] });

/** Builder-only state of the internal `AgentDto` stays off the public responses. */
const builderOnlyFields = [
	'isRunnable',
	'hasPublishHistory',
	'hasVersionHistory',
	'skills',
	'skillHashes',
	'outdatedSkillIds',
	'skillVersions',
];

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
		await createTestAgent({
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
			parentFolder: null,
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

describe('GET /agents/:agentId', () => {
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
		await testDb.truncate(['Folder', 'ProjectRelation', 'Project']);
	});

	const createAgent = async (projectId: string, id: string) =>
		await createTestAgent({
			id,
			name: 'My Agent',
			projectId,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'draft-version',
		});

	test('should return the parent folder in the workflow public API format', async () => {
		const owner = await createOwnerWithApiKey();
		const project = await createTeamProject('Agent project', owner);
		const ancestor = await createFolder(project, { resourceType: 'agent' });
		const folder = await createFolder(project, { resourceType: 'agent', parentFolder: ancestor });
		const agent = await createAgent(project.id, 'agent-in-folder');
		await agentRepository.update(agent.id, { parentFolderId: folder.id });

		const response = await testServer.publicApiAgentFor(owner).get(`/agents/${agent.id}`);

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.parentFolder).toEqual({
			id: folder.id,
			name: folder.name,
			parentFolderId: ancestor.id,
			createdAt: folder.createdAt.toISOString(),
			updatedAt: folder.updatedAt.toISOString(),
		});
		expect(response.body).not.toHaveProperty('parentFolderId');
	});

	test('should fail due to missing API Key', async () => {
		const response = await testServer.publicApiAgentWithoutApiKey().get('/agents/abc123');

		expect(response.statusCode).toBe(401);
	});

	test('should fail due to invalid API Key', async () => {
		const response = await testServer.publicApiAgentWithApiKey('abcXYZ').get('/agents/abc123');

		expect(response.statusCode).toBe(401);
	});

	test('should fail due to non-existing agent', async () => {
		const owner = await createOwnerWithApiKey();

		const response = await testServer.publicApiAgentFor(owner).get('/agents/missing-agent');

		expect(response.statusCode).toBe(404);
	});

	test('should return 404 for an instance agent', async () => {
		const owner = await createOwnerWithApiKey();
		await ensureInstanceAgent('instance-agent', 'Instance Agent');

		const response = await testServer.publicApiAgentFor(owner).get('/agents/instance-agent');

		expect(response.statusCode).toBe(404);
	});

	test('should return the public agent shape for an agent created via the Public API', async () => {
		const member: User = await createMemberWithApiKey();

		const created = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({
				name: 'Readable Agent',
				config: { name: 'Readable Agent', model: 'openai/gpt-5', instructions: 'Help users' },
			});
		expect(created.statusCode, JSON.stringify(created.body)).toBe(201);

		const response = await testServer.publicApiAgentFor(member).get(`/agents/${created.body.id}`);

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body).toMatchObject({
			id: created.body.id,
			name: 'Readable Agent',
			projectId: created.body.projectId,
			parentFolder: null,
			availableInMCP: false,
			isArchived: false,
			activeVersionId: null,
			tools: {},
			activeVersion: null,
		});
		expect(response.body.config).toEqual(created.body.config);
		expect(response.body.configHash).toBe(created.body.configHash);
		for (const field of builderOnlyFields) {
			expect(response.body).not.toHaveProperty(field);
		}
	});

	test('should return 403 when the API key lacks the agent:read scope', async () => {
		const member = await createMemberWithApiKey({ scopes: ['agent:list'] });
		const personalProject: Project = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(member.id);
		await createAgent(personalProject.id, 'agent-kept');

		const response = await testServer.publicApiAgentFor(member).get('/agents/agent-kept');

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when the user lacks the agent:read project permission', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();
		// Project role without agent:read: the API key scope alone must not be enough.
		const customRole = await createCustomRoleWithScopeSlugs(['agent:list'], {
			roleType: 'project',
			displayName: 'Agent Lister',
			description: 'Can list agents but not read one',
		});

		const teamProject = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, teamProject, customRole.slug);
		const agent = await createAgent(teamProject.id, 'agent-kept');

		const response = await testServer.publicApiAgentFor(member).get('/agents/agent-kept');

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.existsBy({ id: agent.id })).toBe(true);
	});

	test('should return 403 when the agent belongs to a project the user cannot access', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();
		const teamProject = await createTeamProject('Other Project', owner);
		const agent = await createAgent(teamProject.id, 'agent-kept');

		const response = await testServer.publicApiAgentFor(member).get('/agents/agent-kept');

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.existsBy({ id: agent.id })).toBe(true);
	});
});

describe('GET /agents', () => {
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
		await createTestAgent({
			id,
			name: `Agent ${id}`,
			projectId,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'draft-version',
		});

	test('should fail due to missing API Key', async () => {
		const response = await testServer.publicApiAgentWithoutApiKey().get('/agents');

		expect(response.statusCode).toBe(401);
	});

	test('should fail due to invalid API Key', async () => {
		const response = await testServer.publicApiAgentWithApiKey('abcXYZ').get('/agents');

		expect(response.statusCode).toBe(401);
	});

	test('should list lean rows across the projects the caller can list', async () => {
		const owner = await createOwnerWithApiKey();
		const member: User = await createMemberWithApiKey();
		const personalProject: Project = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(member.id);
		const ownerProject: Project = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(owner.id);
		const teamProject = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, teamProject, 'project:editor');

		await createAgent(personalProject.id, 'agent-personal');
		await createAgent(teamProject.id, 'agent-team');
		// In a project the caller cannot see: must stay out of the list.
		await createAgent(ownerProject.id, 'agent-foreign');

		const response = await testServer.publicApiAgentFor(member).get('/agents');

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.nextCursor).toBeNull();

		const rowIds = response.body.data.map((row: { id: string }) => row.id);
		expect(rowIds).toHaveLength(2);
		expect(rowIds).toContain('agent-personal');
		expect(rowIds).toContain('agent-team');
		expect(rowIds).not.toContain('agent-foreign');

		for (const row of response.body.data) {
			expect(row).toMatchObject({
				id: expect.any(String),
				name: expect.any(String),
				projectId: expect.any(String),
				availableInMCP: false,
				isArchived: false,
				versionId: 'draft-version',
				activeVersionId: null,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			// A list row is not a full-replace body: no config, no builder state.
			expect(row).not.toHaveProperty('config');
			expect(row).not.toHaveProperty('configHash');
			for (const field of builderOnlyFields) {
				expect(row).not.toHaveProperty(field);
			}
		}
	});

	test('should page through agents with the cursor', async () => {
		const member = await createMemberWithApiKey();
		const personalProject: Project = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(member.id);
		await createAgent(personalProject.id, 'agent-1');
		await createAgent(personalProject.id, 'agent-2');
		await createAgent(personalProject.id, 'agent-3');

		const firstPage = await testServer.publicApiAgentFor(member).get('/agents').query({ limit: 2 });

		expect(firstPage.statusCode, JSON.stringify(firstPage.body)).toBe(200);
		expect(firstPage.body.data).toHaveLength(2);
		expect(firstPage.body.nextCursor).toEqual(expect.any(String));

		const secondPage = await testServer
			.publicApiAgentFor(member)
			.get('/agents')
			.query({ limit: 2, cursor: firstPage.body.nextCursor });

		expect(secondPage.statusCode, JSON.stringify(secondPage.body)).toBe(200);
		expect(secondPage.body.data).toHaveLength(1);
		expect(secondPage.body.nextCursor).toBeNull();
	});

	test('should return 400 for an invalid cursor', async () => {
		const member = await createMemberWithApiKey();

		const response = await testServer
			.publicApiAgentFor(member)
			.get('/agents')
			.query({ cursor: 'not-a-cursor' });

		expect(response.statusCode).toBe(400);
	});

	test('should return 400 for a forged cursor that bypasses the page limit', async () => {
		const member = await createMemberWithApiKey();
		// A cursor minted by hand, not by this API: its limit exceeds the cap.
		const cursor = Buffer.from('{"offset":0,"limit":1000000}').toString('base64');

		const response = await testServer.publicApiAgentFor(member).get('/agents').query({ cursor });

		expect(response.statusCode).toBe(400);
	});

	test('should return 400 for a forged cursor with a negative offset', async () => {
		const member = await createMemberWithApiKey();
		const cursor = Buffer.from('{"offset":-1,"limit":2}').toString('base64');

		const response = await testServer.publicApiAgentFor(member).get('/agents').query({ cursor });

		expect(response.statusCode).toBe(400);
	});

	test('should narrow the list to one project', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();
		const personalProject: Project = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(member.id);
		const teamProject = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, teamProject, 'project:editor');
		await createAgent(personalProject.id, 'agent-personal');
		await createAgent(teamProject.id, 'agent-team');

		const response = await testServer
			.publicApiAgentFor(member)
			.get('/agents')
			.query({ projectId: teamProject.id });

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.data.map((row: { id: string }) => row.id)).toEqual(['agent-team']);
	});

	test('should exclude archived agents by default', async () => {
		const member = await createMemberWithApiKey();
		const personalProject: Project = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(member.id);
		await createAgent(personalProject.id, 'agent-live');
		await createTestAgent({
			id: 'agent-archived',
			name: 'Archived Agent',
			projectId: personalProject.id,
			isArchived: true,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'draft-version',
		});

		const response = await testServer.publicApiAgentFor(member).get('/agents');

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.data.map((row: { id: string }) => row.id)).toEqual(['agent-live']);
	});

	test('should return 403 when the API key lacks the agent:list scope', async () => {
		const member = await createMemberWithApiKey({ scopes: ['agent:read'] });

		const response = await testServer.publicApiAgentFor(member).get('/agents');

		expect(response.statusCode).toBe(403);
	});

	test('should exclude agents of projects where the user lacks agent:list', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();
		// Project role without agent:list: its agents stay out of the list.
		const customRole = await createCustomRoleWithScopeSlugs(['agent:read'], {
			roleType: 'project',
			displayName: 'Agent Reader',
			description: 'Can read agents but not list them',
		});
		const teamProject = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, teamProject, customRole.slug);
		const personalProject: Project = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(member.id);
		await createAgent(teamProject.id, 'agent-team');
		await createAgent(personalProject.id, 'agent-personal');

		const response = await testServer.publicApiAgentFor(member).get('/agents');

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.data.map((row: { id: string }) => row.id)).toEqual(['agent-personal']);
	});
});

describe('PUT /agents/:agentId', () => {
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

	test('should fail due to missing API Key', async () => {
		const response = await testServer.publicApiAgentWithoutApiKey().put('/agents/abc123');

		expect(response.statusCode).toBe(401);
	});

	test('should fail due to invalid API Key', async () => {
		const response = await testServer.publicApiAgentWithApiKey('abcXYZ').put('/agents/abc123');

		expect(response.statusCode).toBe(401);
	});

	test('should fail due to non-existing agent', async () => {
		const owner = await createOwnerWithApiKey();

		const response = await testServer
			.publicApiAgentFor(owner)
			.put('/agents/missing-agent')
			.send({ config: { name: 'A', model: '', instructions: '' }, baseConfigHash: null });

		expect(response.statusCode).toBe(404);
	});

	test('should replace the config and return the updated public shape', async () => {
		const member: User = await createMemberWithApiKey();

		const created = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({
				name: 'Updatable Agent',
				config: { name: 'Updatable Agent', model: 'openai/gpt-5', instructions: 'Help users' },
			});
		expect(created.statusCode, JSON.stringify(created.body)).toBe(201);

		const read = await testServer.publicApiAgentFor(member).get(`/agents/${created.body.id}`);
		expect(read.statusCode, JSON.stringify(read.body)).toBe(200);

		const nextConfig = {
			name: 'Renamed Agent',
			model: 'openai/gpt-5',
			instructions: 'New instructions',
		};

		const response = await testServer
			.publicApiAgentFor(member)
			.put(`/agents/${created.body.id}`)
			.send({ config: nextConfig, baseConfigHash: read.body.configHash });

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body).toMatchObject({
			id: created.body.id,
			name: 'Renamed Agent',
			config: expect.objectContaining(nextConfig),
		});
		for (const field of builderOnlyFields) {
			expect(response.body).not.toHaveProperty(field);
		}

		const reread = await testServer.publicApiAgentFor(member).get(`/agents/${created.body.id}`);
		expect(reread.body.config).toEqual(response.body.config);
	});

	test('should accept a body taken verbatim from GET', async () => {
		const member: User = await createMemberWithApiKey();

		const created = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({
				name: 'Round Trip',
				config: { name: 'Round Trip', model: 'openai/gpt-5', instructions: 'Help users' },
			});
		expect(created.statusCode, JSON.stringify(created.body)).toBe(201);

		const read = await testServer.publicApiAgentFor(member).get(`/agents/${created.body.id}`);

		const response = await testServer
			.publicApiAgentFor(member)
			.put(`/agents/${created.body.id}`)
			.send(read.body);

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.config).toEqual(read.body.config);
		expect(response.body.configHash).toBe(read.body.configHash);
	});

	test('should accept the retrieved body of an agent without a configuration', async () => {
		const member: User = await createMemberWithApiKey();
		const personalProject: Project = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(member.id);
		await createTestAgent({
			id: 'agent-empty',
			name: 'Empty Agent',
			projectId: personalProject.id,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'draft-version',
		});

		const read = await testServer.publicApiAgentFor(member).get('/agents/agent-empty');
		expect(read.statusCode, JSON.stringify(read.body)).toBe(200);
		expect(read.body.config).toBeNull();

		const response = await testServer
			.publicApiAgentFor(member)
			.put('/agents/agent-empty')
			.send(read.body);

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.config).toBeNull();
		expect(response.body.configHash).toBeNull();
	});

	test('should return 400 for a null config when the agent has a configuration', async () => {
		const member: User = await createMemberWithApiKey();

		const created = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({
				name: 'Configured',
				config: { name: 'Configured', model: '', instructions: '' },
			});

		const response = await testServer
			.publicApiAgentFor(member)
			.put(`/agents/${created.body.id}`)
			.send({ config: null, baseConfigHash: created.body.configHash });

		expect(response.statusCode).toBe(400);
	});

	test('should return 409 when the config hash is stale', async () => {
		const member: User = await createMemberWithApiKey();

		const created = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({
				name: 'Conflicted',
				config: { name: 'Conflicted', model: '', instructions: '' },
			});
		expect(created.statusCode, JSON.stringify(created.body)).toBe(201);

		const response = await testServer
			.publicApiAgentFor(member)
			.put(`/agents/${created.body.id}`)
			.send({
				config: { name: 'Conflicted', model: '', instructions: 'Changed' },
				baseConfigHash: 'stale-hash',
			});

		expect(response.statusCode, JSON.stringify(response.body)).toBe(409);
	});

	test('should return 400 for an invalid config', async () => {
		const member: User = await createMemberWithApiKey();

		const created = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({ name: 'Bad Update' });

		const response = await testServer
			.publicApiAgentFor(member)
			.put(`/agents/${created.body.id}`)
			.send({
				// Missing the required config fields `name`, `model`, and `instructions`.
				config: { instructions: 'No name or model' },
				baseConfigHash: created.body.configHash,
			});

		expect(response.statusCode).toBe(400);
	});

	test('should return 403 when the API key lacks the agent:update scope', async () => {
		const member = await createMemberWithApiKey({ scopes: ['agent:read'] });
		const personalProject: Project = await Container.get(
			ProjectRepository,
		).getPersonalProjectForUserOrFail(member.id);
		await createTestAgent({
			id: 'agent-kept',
			name: 'My Agent',
			projectId: personalProject.id,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'draft-version',
		});

		const response = await testServer
			.publicApiAgentFor(member)
			.put('/agents/agent-kept')
			.send({ config: { name: 'A', model: '', instructions: '' }, baseConfigHash: null });

		expect(response.statusCode).toBe(403);
	});

	test('should return 403 when the user lacks the agent:update project permission', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();
		// Project role without agent:update: the API key scope alone must not be enough.
		const customRole = await createCustomRoleWithScopeSlugs(['agent:read'], {
			roleType: 'project',
			displayName: 'Agent Reader',
			description: 'Can read agents but not update them',
		});

		const teamProject = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, teamProject, customRole.slug);
		const agent = await createTestAgent({
			id: 'agent-kept',
			name: 'My Agent',
			projectId: teamProject.id,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'draft-version',
		});

		const response = await testServer
			.publicApiAgentFor(member)
			.put('/agents/agent-kept')
			.send({ config: { name: 'A', model: '', instructions: '' }, baseConfigHash: null });

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.existsBy({ id: agent.id })).toBe(true);
	});
});

const publishableConfig = {
	name: 'Publishable Agent',
	model: 'openai/gpt-5',
	instructions: 'Help users',
};

describe('POST /agents/:agentId/publish', () => {
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

	const createPublishableAgent = async (user: User) => {
		const credential = await saveCredential(
			{ name: 'OpenAI', type: 'openAiApi', data: { apiKey: 'test-key' } },
			{ user, role: 'credential:owner' },
		);
		const config = { ...publishableConfig, credential: credential.id };
		const response = await testServer.publicApiAgentFor(user).post('/agents').send({
			name: publishableConfig.name,
			config,
		});
		expect(response.statusCode, JSON.stringify(response.body)).toBe(201);
		return { id: response.body.id as string, config };
	};

	test('should publish the current draft and return the live version', async () => {
		const member = await createMemberWithApiKey();
		const agent = await createPublishableAgent(member);

		const response = await testServer
			.publicApiAgentFor(member)
			.post(`/agents/${agent.id}/publish`)
			.send({});

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.activeVersionId).toEqual(expect.any(String));
		for (const field of builderOnlyFields) {
			expect(response.body).not.toHaveProperty(field);
		}
		expect(await agentRepository.findOneBy({ id: agent.id })).toMatchObject({
			activeVersionId: response.body.activeVersionId,
		});
	});

	test('should publish a saved version', async () => {
		const member = await createMemberWithApiKey();
		const agent = await createPublishableAgent(member);

		const first = await testServer
			.publicApiAgentFor(member)
			.post(`/agents/${agent.id}/publish`)
			.send({});
		expect(first.statusCode, JSON.stringify(first.body)).toBe(200);
		const savedVersionId = first.body.activeVersionId as string;

		const read = await testServer.publicApiAgentFor(member).get(`/agents/${agent.id}`);
		const updated = await testServer
			.publicApiAgentFor(member)
			.put(`/agents/${agent.id}`)
			.send({
				config: { ...agent.config, instructions: 'Updated instructions' },
				baseConfigHash: read.body.configHash,
			});
		expect(updated.statusCode, JSON.stringify(updated.body)).toBe(200);

		const republishedDraft = await testServer
			.publicApiAgentFor(member)
			.post(`/agents/${agent.id}/publish`)
			.send({});
		expect(republishedDraft.statusCode, JSON.stringify(republishedDraft.body)).toBe(200);
		expect(republishedDraft.body.activeVersionId).not.toBe(savedVersionId);

		const response = await testServer
			.publicApiAgentFor(member)
			.post(`/agents/${agent.id}/publish`)
			.send({ versionId: savedVersionId });

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.activeVersionId).toBe(savedVersionId);
	});

	test('should return 404 when the agent does not exist', async () => {
		const owner = await createOwnerWithApiKey();

		const response = await testServer
			.publicApiAgentFor(owner)
			.post('/agents/missing-agent/publish')
			.send({});

		expect(response.statusCode).toBe(404);
	});

	test('should return 400 when the body contains an unknown field', async () => {
		const member = await createMemberWithApiKey();
		const agent = await createPublishableAgent(member);

		const response = await testServer
			.publicApiAgentFor(member)
			.post(`/agents/${agent.id}/publish`)
			.send({ extra: true });

		expect(response.statusCode).toBe(400);
	});

	test('should return 422 when the agent is not runnable', async () => {
		const member = await createMemberWithApiKey();
		const created = await testServer
			.publicApiAgentFor(member)
			.post('/agents')
			.send({
				name: 'Draft Agent',
				config: { name: 'Draft Agent', model: '', instructions: '' },
			});
		expect(created.statusCode, JSON.stringify(created.body)).toBe(201);

		const response = await testServer
			.publicApiAgentFor(member)
			.post(`/agents/${created.body.id}/publish`)
			.send({});

		expect(response.statusCode, JSON.stringify(response.body)).toBe(422);
		expect(response.body).toEqual({
			message: 'Agent configuration has errors that must be resolved before publishing',
		});
	});

	test('should return 422 when the agent is archived', async () => {
		const member = await createMemberWithApiKey();
		const agent = await createPublishableAgent(member);
		await agentRepository.update({ id: agent.id }, { isArchived: true });

		const response = await testServer
			.publicApiAgentFor(member)
			.post(`/agents/${agent.id}/publish`)
			.send({});

		expect(response.statusCode, JSON.stringify(response.body)).toBe(422);
		expect(response.body).toEqual({ message: 'Cannot publish an archived agent' });
	});

	test('should return 403 when the API key lacks the agent:publish scope', async () => {
		const member = await createMemberWithApiKey({ scopes: ['agent:read'] });
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			member.id,
		);
		await createTestAgent({
			id: 'agent-kept',
			name: 'Kept',
			projectId: personalProject.id,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
		});

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents/agent-kept/publish')
			.send({});

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.findOneBy({ id: 'agent-kept' })).toMatchObject({
			activeVersionId: null,
		});
	});

	test('should return 403 when the user lacks the agent:publish project permission', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();
		const customRole = await createCustomRoleWithScopeSlugs(['agent:read'], {
			roleType: 'project',
			displayName: 'Agent Reader',
			description: 'Can read agents but not publish them',
		});
		const teamProject = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, teamProject, customRole.slug);
		await createTestAgent({
			id: 'agent-kept',
			name: 'Kept',
			projectId: teamProject.id,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
		});

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents/agent-kept/publish')
			.send({});

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.findOneBy({ id: 'agent-kept' })).toMatchObject({
			activeVersionId: null,
		});
	});
});

describe('POST /agents/:agentId/unpublish', () => {
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

	const publishAgent = async (user: User) => {
		const credential = await saveCredential(
			{ name: 'OpenAI', type: 'openAiApi', data: { apiKey: 'test-key' } },
			{ user, role: 'credential:owner' },
		);
		const created = await testServer
			.publicApiAgentFor(user)
			.post('/agents')
			.send({
				name: publishableConfig.name,
				config: { ...publishableConfig, credential: credential.id },
			});
		expect(created.statusCode, JSON.stringify(created.body)).toBe(201);
		const published = await testServer
			.publicApiAgentFor(user)
			.post(`/agents/${created.body.id}/publish`)
			.send({});
		expect(published.statusCode, JSON.stringify(published.body)).toBe(200);
		return published.body as { id: string; activeVersionId: string };
	};

	test('should stop the published version', async () => {
		const member = await createMemberWithApiKey();
		const agent = await publishAgent(member);

		const response = await testServer
			.publicApiAgentFor(member)
			.post(`/agents/${agent.id}/unpublish`);

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.activeVersionId).toBeNull();
		expect(await agentRepository.findOneBy({ id: agent.id })).toMatchObject({
			activeVersionId: null,
		});
	});

	test('should disconnect live channels', async () => {
		const member = await createMemberWithApiKey();
		const agent = await publishAgent(member);
		const integration = { type: 'slack' as const, credentialId: 'channel-credential' };
		await agentRepository.update({ id: agent.id }, { integrations: [integration] });
		const disconnect = vi
			.spyOn(Container.get(ChatIntegrationService), 'disconnectChannel')
			.mockResolvedValue(undefined);

		try {
			const response = await testServer
				.publicApiAgentFor(member)
				.post(`/agents/${agent.id}/unpublish`);

			expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
			expect(response.body.activeVersionId).toBeNull();
			expect(disconnect).toHaveBeenCalledWith(agent.id, integration, {
				deleteSubscriptions: false,
			});
		} finally {
			disconnect.mockRestore();
		}
	});

	test('should return 404 when the agent does not exist', async () => {
		const owner = await createOwnerWithApiKey();

		const response = await testServer
			.publicApiAgentFor(owner)
			.post('/agents/missing-agent/unpublish');

		expect(response.statusCode).toBe(404);
	});

	test('should return 403 when the API key lacks the agent:unpublish scope', async () => {
		const member = await createMemberWithApiKey({ scopes: ['agent:read'] });
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			member.id,
		);
		const agent = await createTestAgent({
			id: 'agent-kept',
			name: 'Kept',
			projectId: personalProject.id,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
		});

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents/agent-kept/unpublish');

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.findOneBy({ id: agent.id })).toMatchObject({
			activeVersionId: null,
		});
	});

	test('should return 403 when the user lacks the agent:unpublish project permission', async () => {
		const owner = await createOwnerWithApiKey();
		const member = await createMemberWithApiKey();
		const customRole = await createCustomRoleWithScopeSlugs(['agent:read'], {
			roleType: 'project',
			displayName: 'Agent Reader',
			description: 'Can read agents but not unpublish them',
		});
		const teamProject = await createTeamProject('Test Project', owner);
		await linkUserToProject(member, teamProject, customRole.slug);
		const agent = await createTestAgent({
			id: 'agent-kept',
			name: 'Kept',
			projectId: teamProject.id,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
		});

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/agents/agent-kept/unpublish');

		expect(response.statusCode).toBe(403);
		expect(await agentRepository.findOneBy({ id: agent.id })).toMatchObject({
			activeVersionId: null,
		});
	});
});

describe('agent archive public API', () => {
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
		await createTestAgent({
			id,
			name: 'My Agent',
			projectId,
			schema: null,
			integrations: [],
			tools: {},
			skills: {},
			versionId: 'draft-version',
		});

	describe('POST /agents/:agentId/archive', () => {
		test('should archive the agent and return it', async () => {
			const member: User = await createMemberWithApiKey();
			const personalProject: Project = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(member.id);
			const agent = await createAgent(personalProject.id, 'agent-to-archive');

			const response = await testServer
				.publicApiAgentFor(member)
				.post('/agents/agent-to-archive/archive');

			expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
			expect(response.body).toMatchObject({
				id: agent.id,
				name: agent.name,
				projectId: personalProject.id,
				isArchived: true,
			});
			for (const field of builderOnlyFields) {
				expect(response.body).not.toHaveProperty(field);
			}
			expect((await agentRepository.findById(agent.id))?.isArchived).toBe(true);
		});

		test('should return 200 when the agent is already archived', async () => {
			const member = await createMemberWithApiKey();
			const personalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(member.id);
			const agent = await createAgent(personalProject.id, 'agent-archived-twice');
			const client = testServer.publicApiAgentFor(member);

			const first = await client.post('/agents/agent-archived-twice/archive');
			expect(first.statusCode, JSON.stringify(first.body)).toBe(200);

			const second = await client.post('/agents/agent-archived-twice/archive');

			expect(second.statusCode, JSON.stringify(second.body)).toBe(200);
			expect(second.body.isArchived).toBe(true);
			expect(await agentRepository.existsBy({ id: agent.id })).toBe(true);
			expect((await agentRepository.findById(agent.id))?.isArchived).toBe(true);
		});

		test('should return 404 when the agent does not exist', async () => {
			const owner = await createOwnerWithApiKey();

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/agents/missing-agent/archive');

			expect(response.statusCode).toBe(404);
		});

		test('should return 403 when the API key lacks the agent:delete scope', async () => {
			const member = await createMemberWithApiKey({ scopes: ['agent:read'] });
			const personalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(member.id);
			const agent = await createAgent(personalProject.id, 'agent-kept');

			const response = await testServer
				.publicApiAgentFor(member)
				.post('/agents/agent-kept/archive');

			expect(response.statusCode).toBe(403);
			expect((await agentRepository.findById(agent.id))?.isArchived).toBe(false);
		});

		test('should return 403 when the user lacks the agent:delete project permission', async () => {
			const owner = await createOwnerWithApiKey();
			const member = await createMemberWithApiKey();
			const customRole = await createCustomRoleWithScopeSlugs(['agent:read'], {
				roleType: 'project',
				displayName: 'Agent Reader',
				description: 'Can read agents but not delete them',
			});

			const teamProject = await createTeamProject('Test Project', owner);
			await linkUserToProject(member, teamProject, customRole.slug);
			const agent = await createAgent(teamProject.id, 'agent-kept');

			const response = await testServer
				.publicApiAgentFor(member)
				.post('/agents/agent-kept/archive');

			expect(response.statusCode).toBe(403);
			expect((await agentRepository.findById(agent.id))?.isArchived).toBe(false);
		});

		test('should return 403 when the agent belongs to a project the user cannot access', async () => {
			const owner = await createOwnerWithApiKey();
			const member = await createMemberWithApiKey();
			const teamProject = await createTeamProject('Other Project', owner);
			const agent = await createAgent(teamProject.id, 'agent-kept');

			const response = await testServer
				.publicApiAgentFor(member)
				.post('/agents/agent-kept/archive');

			expect(response.statusCode).toBe(403);
			expect((await agentRepository.findById(agent.id))?.isArchived).toBe(false);
		});
	});

	describe('POST /agents/:agentId/unarchive', () => {
		test('should restore an archived agent', async () => {
			const member: User = await createMemberWithApiKey();
			const personalProject: Project = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(member.id);
			const agent = await createAgent(personalProject.id, 'agent-to-restore');
			const client = testServer.publicApiAgentFor(member);

			const archived = await client.post('/agents/agent-to-restore/archive');
			expect(archived.statusCode, JSON.stringify(archived.body)).toBe(200);

			const response = await client.post('/agents/agent-to-restore/unarchive');

			expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
			expect(response.body.isArchived).toBe(false);
			expect(response.body.id).toBe(agent.id);
			expect((await agentRepository.findById(agent.id))?.isArchived).toBe(false);
		});

		test('should return 400 when the agent is not archived', async () => {
			const member = await createMemberWithApiKey();
			const personalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(member.id);
			const agent = await createAgent(personalProject.id, 'agent-live');

			const response = await testServer
				.publicApiAgentFor(member)
				.post('/agents/agent-live/unarchive');

			expect(response.statusCode).toBe(400);
			expect((await agentRepository.findById(agent.id))?.isArchived).toBe(false);
		});

		test('should return 404 when the agent does not exist', async () => {
			const owner = await createOwnerWithApiKey();

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/agents/missing-agent/unarchive');

			expect(response.statusCode).toBe(404);
		});

		test('should return 403 when the API key lacks the agent:delete scope', async () => {
			const owner = await createOwnerWithApiKey();
			const member = await createMemberWithApiKey({ scopes: ['agent:read'] });
			const personalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(member.id);
			const agent = await createAgent(personalProject.id, 'agent-kept');
			const archived = await testServer.publicApiAgentFor(owner).post('/agents/agent-kept/archive');
			expect(archived.statusCode, JSON.stringify(archived.body)).toBe(200);

			const response = await testServer
				.publicApiAgentFor(member)
				.post('/agents/agent-kept/unarchive');

			expect(response.statusCode).toBe(403);
			expect((await agentRepository.findById(agent.id))?.isArchived).toBe(true);
		});

		test('should return 403 when the user lacks the agent:delete project permission', async () => {
			const owner = await createOwnerWithApiKey();
			const member = await createMemberWithApiKey();
			const customRole = await createCustomRoleWithScopeSlugs(['agent:read'], {
				roleType: 'project',
				displayName: 'Agent Reader',
				description: 'Can read agents but not delete them',
			});

			const teamProject = await createTeamProject('Test Project Unarchive', owner);
			await linkUserToProject(member, teamProject, customRole.slug);
			const agent = await createAgent(teamProject.id, 'agent-kept');
			const archived = await testServer.publicApiAgentFor(owner).post('/agents/agent-kept/archive');
			expect(archived.statusCode, JSON.stringify(archived.body)).toBe(200);

			const response = await testServer
				.publicApiAgentFor(member)
				.post('/agents/agent-kept/unarchive');

			expect(response.statusCode).toBe(403);
			expect((await agentRepository.findById(agent.id))?.isArchived).toBe(true);
		});
	});
});
