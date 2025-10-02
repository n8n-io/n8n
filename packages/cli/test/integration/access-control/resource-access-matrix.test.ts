import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	createWorkflow,
	randomCredentialPayload,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { Project, User, Role } from '@n8n/db';

import { UserManagementMailer } from '@/user-management/email';

import { createCustomRoleWithScopeSlugs, cleanupRolesAndScopes } from '../shared/db/roles';
import { createOwner, createMember } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'credentials'],
	enabledFeatures: ['feat:sharing', 'feat:customRoles'],
	quotas: {
		'quota:maxTeamProjects': -1,
	},
});

// Foundation users and projects
let owner: User;
let testUser: User;
let teamProject: Project;
let testUserPersonalProject: Project;

// Custom role definitions (8 total - covering all combinations)
let workflowReadOnlyRole: Role;
let workflowAllOperationsRole: Role;
let credentialReadOnlyRole: Role;
let credentialAllOperationsRole: Role;

// Authentication agents
let ownerAgent: SuperAgentTest;
let testUserAgent: SuperAgentTest;

// Test data - created fresh for each test
let testWorkflowId: string;
let testWorkflowVersionId: string;
let testCredentialId: string;

describe('Resource Access Control Matrix Tests', () => {
	beforeAll(async () => {
		mockInstance(UserManagementMailer, {
			invite: jest.fn(),
			passwordReset: jest.fn(),
		});

		// Create foundation users
		owner = await createOwner();
		testUser = await createMember();

		// Get projects
		testUserPersonalProject = await getPersonalProject(testUser);
		teamProject = await createTeamProject('Access Control Test Project', owner);

		// Create authentication agents
		ownerAgent = testServer.authAgentFor(owner);
		testUserAgent = testServer.authAgentFor(testUser);

		// Create custom roles with specific scopes
		workflowReadOnlyRole = await createCustomRoleWithScopeSlugs(
			['workflow:read', 'workflow:list'],
			{
				roleType: 'project',
				displayName: 'Workflow Read-Only',
				description: 'Can only read and list workflows',
			},
		);

		workflowAllOperationsRole = await createCustomRoleWithScopeSlugs(
			[
				'workflow:share',
				'workflow:execute',
				'workflow:read',
				'workflow:list',
				'workflow:create',
				'workflow:update',
				'workflow:delete',
			],
			{
				roleType: 'project',
				displayName: 'Workflow All Operations',
				description: 'Full workflow access (CRUD + list)',
			},
		);

		credentialReadOnlyRole = await createCustomRoleWithScopeSlugs(
			['credential:read', 'credential:list'],
			{
				roleType: 'project',
				displayName: 'Credential Read-Only',
				description: 'Can only read and list credentials',
			},
		);

		credentialAllOperationsRole = await createCustomRoleWithScopeSlugs(
			[
				'credential:read',
				'credential:list',
				'credential:create',
				'credential:update',
				'credential:delete',
			],
			{
				roleType: 'project',
				displayName: 'Credential All Operations',
				description: 'Full credential access (CRUD + list)',
			},
		);
	});

	beforeEach(async () => {
		// Clean up any existing shared resources
		await testDb.truncate(['SharedWorkflow', 'SharedCredentials', 'ProjectRelation']);

		// Create fresh test data for each test
		const workflow = await createWorkflow({ name: 'Matrix Test Workflow' }, teamProject);
		testWorkflowId = workflow.id;
		testWorkflowVersionId = workflow.versionId;

		// Create test credential via owner
		const credentialPayload = randomCredentialPayload();
		const credentialResponse = await ownerAgent
			.post('/credentials')
			.send({ ...credentialPayload, projectId: teamProject.id })
			.expect(200);
		testCredentialId = credentialResponse.body.data.id;
	});

	afterAll(async () => {
		await cleanupRolesAndScopes();
	});

	describe('Foundation Setup Validation', () => {
		test('should have created all required custom roles', () => {
			expect(workflowReadOnlyRole.scopes).toHaveLength(2);
			expect(workflowAllOperationsRole.scopes).toHaveLength(7);

			expect(credentialReadOnlyRole.scopes).toHaveLength(2);
			expect(credentialAllOperationsRole.scopes).toHaveLength(5);
		});

		test('should have functional test setup', async () => {
			expect(testWorkflowId).toBeDefined();
			expect(testCredentialId).toBeDefined();
			expect(teamProject).toBeDefined();

			// Verify owner can access test data
			await ownerAgent.get(`/workflows/${testWorkflowId}`).expect(200);
			await ownerAgent.get(`/credentials/${testCredentialId}`).expect(200);
		});
	});

	describe('Workflow Access Control Matrix', () => {
		describe('Workflow Read-Only Role', () => {
			beforeEach(async () => {
				await linkUserToProject(testUser, teamProject, workflowReadOnlyRole.slug);
			});

			test('POST /workflows should return 400', async () => {
				const workflowPayload = {
					name: 'New Workflow',
					active: false,
					nodes: [
						{
							id: 'uuid-1234',
							parameters: {},
							name: 'Start',
							type: 'n8n-nodes-base.start',
							typeVersion: 1,
							position: [240, 300],
						},
					],
					connections: {},
					projectId: teamProject.id,
				};

				await testUserAgent.post('/workflows').send(workflowPayload).expect(400);
			});

			test('GET /workflows should return 200', async () => {
				const response = await testUserAgent.get('/workflows').expect(200);
				expect(Array.isArray(response.body.data)).toBe(true);
				expect(response.body.data.length).toBeGreaterThan(0);
			});

			test('GET /workflows/new should return 200', async () => {
				await testUserAgent.get('/workflows/new').expect(200);
			});

			test('GET /workflows/:id should return 200', async () => {
				const response = await testUserAgent.get(`/workflows/${testWorkflowId}`).expect(200);
				expect(response.body.data.name).toBe('Matrix Test Workflow');
			});

			test('PATCH /workflows/:id should return 403', async () => {
				await testUserAgent
					.patch(`/workflows/${testWorkflowId}`)
					.send({ name: 'Updated Name', versionId: testWorkflowVersionId })
					.expect(403);
			});

			test('DELETE /workflows/:id should return 403', async () => {
				await testUserAgent.delete(`/workflows/${testWorkflowId}`).expect(403);
			});

			test('POST /workflows/:id/archive should return 403', async () => {
				await testUserAgent.post(`/workflows/${testWorkflowId}/archive`).send().expect(403);
			});

			test('POST /workflows/:id/unarchive should return 403', async () => {
				await testUserAgent.post(`/workflows/${testWorkflowId}/unarchive`).send().expect(403);
			});

			test('POST /workflows/:id/run should return 403', async () => {
				const runPayload = {
					workflowData: { id: testWorkflowId, name: 'Test', nodes: [], connections: {} },
				};
				await testUserAgent.post(`/workflows/${testWorkflowId}/run`).send(runPayload).expect(403);
			});

			test('PUT /workflows/:id/share should return 403', async () => {
				await testUserAgent
					.put(`/workflows/${testWorkflowId}/share`)
					.send({ shareWithIds: [testUserPersonalProject.id] })
					.expect(403);
			});

			test('PUT /workflows/:id/transfer should return 403', async () => {
				await testUserAgent
					.put(`/workflows/${testWorkflowId}/transfer`)
					.send({ destinationProjectId: testUserPersonalProject.id })
					.expect(403);
			});
		});

		describe('Workflow All-Operations Role', () => {
			beforeEach(async () => {
				await linkUserToProject(testUser, teamProject, workflowAllOperationsRole.slug);
			});

			test('POST /workflows should return 200', async () => {
				const workflowPayload = {
					name: 'All-Ops Workflow',
					active: false,
					nodes: [
						{
							id: 'uuid-1234',
							parameters: {},
							name: 'Start',
							type: 'n8n-nodes-base.start',
							typeVersion: 1,
							position: [240, 300],
						},
					],
					connections: {},
					projectId: teamProject.id,
				};

				const response = await testUserAgent.post('/workflows').send(workflowPayload).expect(200);
				expect(response.body.data.name).toBe('All-Ops Workflow');
			});

			test('GET /workflows should return 200', async () => {
				const response = await testUserAgent.get('/workflows').expect(200);
				expect(Array.isArray(response.body.data)).toBe(true);
				expect(response.body.data.length).toBeGreaterThan(0);
			});

			test('GET /workflows/new should return 200', async () => {
				await testUserAgent.get('/workflows/new').expect(200);
			});

			test('GET /workflows/:id should return 200', async () => {
				const response = await testUserAgent.get(`/workflows/${testWorkflowId}`).expect(200);
				expect(response.body.data.name).toBe('Matrix Test Workflow');
			});

			test('PATCH /workflows/:id should return 200', async () => {
				const response = await testUserAgent
					.patch(`/workflows/${testWorkflowId}`)
					.send({ name: 'Updated by All-Ops', versionId: testWorkflowVersionId })
					.expect(200);
				expect(response.body.data.name).toBe('Updated by All-Ops');
			});

			test('POST /workflows/:id/archive should return 200', async () => {
				// All-operations role (includes workflow:delete) can successfully archive workflows
				// Archive operation is allowed when user has full CRUD permissions
				await testUserAgent.post(`/workflows/${testWorkflowId}/archive`).send().expect(200);
			});

			test('DELETE /workflows/:id should return 200', async () => {
				await testUserAgent.post(`/workflows/${testWorkflowId}/archive`).send().expect(200);
				await testUserAgent.delete(`/workflows/${testWorkflowId}`).expect(200);
			});

			test('POST /workflows/:id/unarchive should return 200', async () => {
				await testUserAgent.post(`/workflows/${testWorkflowId}/archive`).send().expect(200);
				await testUserAgent.post(`/workflows/${testWorkflowId}/unarchive`).send().expect(200);
			});

			test('PUT /workflows/:id/share should return 200', async () => {
				// Sharing requires workflow:share scope (not included in CRUD operations)
				await testUserAgent
					.put(`/workflows/${testWorkflowId}/share`)
					.send({ shareWithIds: [testUserPersonalProject.id] })
					.expect(200);
			});
		});
	});

	describe('Credential Access Control Matrix', () => {
		describe('Credential Read-Only Role', () => {
			beforeEach(async () => {
				await linkUserToProject(testUser, teamProject, credentialReadOnlyRole.slug);
			});

			test('GET /credentials should return 200', async () => {
				const response = await testUserAgent.get('/credentials').expect(200);
				expect(Array.isArray(response.body.data)).toBe(true);
				expect(response.body.data.length).toBeGreaterThan(0);
			});

			test('GET /credentials/new should return 200', async () => {
				await testUserAgent.get('/credentials/new').expect(200);
			});

			test('GET /credentials/:id should return 200', async () => {
				const response = await testUserAgent.get(`/credentials/${testCredentialId}`).expect(200);
				expect(response.body.data).toBeDefined();
			});

			test('POST /credentials should return 400', async () => {
				const credentialPayload = randomCredentialPayload();
				await testUserAgent
					.post('/credentials')
					.send({ ...credentialPayload, projectId: teamProject.id })
					.expect(400);
			});

			test('PATCH /credentials/:id should return 403', async () => {
				const updatePayload = { name: 'Updated Credential Name' };
				await testUserAgent
					.patch(`/credentials/${testCredentialId}`)
					.send(updatePayload)
					.expect(403);
			});

			test('DELETE /credentials/:id should return 403', async () => {
				await testUserAgent.delete(`/credentials/${testCredentialId}`).expect(403);
			});

			test('PUT /credentials/:id/share should return 403', async () => {
				await testUserAgent
					.put(`/credentials/${testCredentialId}/share`)
					.send({ shareWithIds: [testUserPersonalProject.id] })
					.expect(403);
			});

			test('PUT /credentials/:id/transfer should return 403', async () => {
				await testUserAgent
					.put(`/credentials/${testCredentialId}/transfer`)
					.send({ destinationProjectId: testUserPersonalProject.id })
					.expect(403);
			});
		});

		describe('Credential All-Operations Role', () => {
			beforeEach(async () => {
				await linkUserToProject(testUser, teamProject, credentialAllOperationsRole.slug);
			});

			test('GET /credentials should return 200', async () => {
				const response = await testUserAgent.get('/credentials').expect(200);
				expect(Array.isArray(response.body.data)).toBe(true);
				expect(response.body.data.length).toBeGreaterThan(0);
			});

			test('GET /credentials/new should return 200', async () => {
				await testUserAgent.get('/credentials/new').expect(200);
			});

			test('GET /credentials/:id should return 200', async () => {
				const response = await testUserAgent.get(`/credentials/${testCredentialId}`).expect(200);
				expect(response.body.data).toBeDefined();
			});

			test('POST /credentials should return 200', async () => {
				const credentialPayload = randomCredentialPayload();
				const response = await testUserAgent
					.post('/credentials')
					.send({ ...credentialPayload, projectId: teamProject.id })
					.expect(200);
				expect(response.body.data.name).toBe(credentialPayload.name);
			});

			test('PATCH /credentials/:id should return 200', async () => {
				const original = await testUserAgent.get(`/credentials/${testCredentialId}`).expect(200);

				const updatePayload = { ...original.body.data, name: 'Updated by All-Ops', data: {} };

				const response = await testUserAgent
					.patch(`/credentials/${testCredentialId}`)
					.send(updatePayload)
					.expect(200);

				expect(response.body.data.name).toBe('Updated by All-Ops');
			});

			test('DELETE /credentials/:id should return 200', async () => {
				await testUserAgent.delete(`/credentials/${testCredentialId}`).expect(200);
			});

			test('PUT /credentials/:id/share should return 403', async () => {
				// Sharing requires credential:share scope (not included in CRUD operations)
				await testUserAgent
					.put(`/credentials/${testCredentialId}/share`)
					.send({ shareWithIds: [testUserPersonalProject.id] })
					.expect(403);
			});

			test('PUT /credentials/:id/transfer should return 403', async () => {
				// Transfer requires credential:move scope (not included in CRUD operations)
				await testUserAgent
					.put(`/credentials/${testCredentialId}/transfer`)
					.send({ destinationProjectId: testUserPersonalProject.id })
					.expect(403);
			});
		});
	});
});
