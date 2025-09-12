import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	createWorkflow,
	randomCredentialPayload,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	PROJECT_ADMIN_ROLE_SLUG,
	PROJECT_EDITOR_ROLE_SLUG,
	PROJECT_VIEWER_ROLE_SLUG,
} from '@n8n/permissions';

import { UserManagementMailer } from '@/user-management/email';

import { cleanupRolesAndScopes } from '../shared/db/roles';
import { createOwner, createMember } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

/**
 * Built-in Role Matrix Testing
 *
 * Tests the behavior of built-in project roles:
 * - Project Admin: Full project access (all permissions)
 * - Project Editor: Full CRUD access (create, read, update, delete)
 * - Project Viewer: Read-only access (read and list only)
 * - Personal Project Owner: Full access within personal projects
 */

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'credentials'],
	enabledFeatures: ['feat:sharing', 'feat:customRoles'],
	quotas: {
		'quota:maxTeamProjects': -1,
	},
});

let owner: User;
let member1: User;
let member2: User;
let member3: User;

// Projects for different test scenarios
let teamProjectA: Project;
let member1PersonalProject: Project;

// Authentication agents
let ownerAgent: SuperAgentTest;
let member1Agent: SuperAgentTest;
let member2Agent: SuperAgentTest;
let member3Agent: SuperAgentTest;

describe('Built-in Role Matrix Testing', () => {
	beforeAll(async () => {
		mockInstance(UserManagementMailer, {
			invite: jest.fn(),
			passwordReset: jest.fn(),
		});

		// Create standard users
		owner = await createOwner();
		member1 = await createMember();
		member2 = await createMember();
		member3 = await createMember();

		// Get personal projects
		member1PersonalProject = await getPersonalProject(member1);

		// Create team projects for testing
		teamProjectA = await createTeamProject('Team Project A', owner);

		// Create authentication agents
		ownerAgent = testServer.authAgentFor(owner);
		member1Agent = testServer.authAgentFor(member1);
		member2Agent = testServer.authAgentFor(member2);
		member3Agent = testServer.authAgentFor(member3);
	});

	afterAll(async () => {
		await cleanupRolesAndScopes();
	});

	describe('Project Admin Role - Full Project Access', () => {
		beforeEach(async () => {
			// Link member1 to teamProjectA as project admin
			await linkUserToProject(member1, teamProjectA, PROJECT_ADMIN_ROLE_SLUG);
		});

		test('project admin should have full workflow access', async () => {
			// Create a workflow in the project via HTTP endpoint (project admin has workflow:create scope)
			const workflowPayload = {
				name: 'Test Admin Workflow',
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
				staticData: null,
				settings: {
					saveExecutionProgress: true,
				},
				projectId: teamProjectA.id,
			};

			const adminWorkflowResponse = await member1Agent
				.post('/workflows')
				.send(workflowPayload)
				.expect(200);

			const workflow = adminWorkflowResponse.body.data;
			expect(workflow.name).toBe('Test Admin Workflow');

			// Test workflow list access
			const listResponse = await member1Agent.get('/workflows').expect(200);
			expect(listResponse.body.data).toHaveLength(1);
			expect(listResponse.body.data[0].name).toBe('Test Admin Workflow');

			// Test workflow read access
			const getResponse = await member1Agent.get(`/workflows/${workflow.id}`).expect(200);
			expect(getResponse.body.data.name).toBe('Test Admin Workflow');

			// Test workflow update access
			const updateResponse = await member1Agent
				.patch(`/workflows/${workflow.id}`)
				.send({ name: 'Updated Admin Workflow', versionId: workflow.versionId })
				.expect(200);
			expect(updateResponse.body.data.name).toBe('Updated Admin Workflow');

			// Test workflow delete access
			await member1Agent.post(`/workflows/${workflow.id}/archive`).send().expect(200);
			await member1Agent.delete(`/workflows/${workflow.id}`).send().expect(200);
		});

		test('project admin should have full credential access', async () => {
			// Create a credential payload
			const credentialPayload = randomCredentialPayload();

			// Test credential create access
			const adminCredentialResponse = await member1Agent
				.post('/credentials')
				.send({ ...credentialPayload, projectId: teamProjectA.id })
				.expect(200);

			const credentialId = adminCredentialResponse.body.data.id;
			expect(adminCredentialResponse.body.data.name).toBe(credentialPayload.name);

			// Test credential list access
			const listResponse = await member1Agent.get('/credentials').expect(200);
			expect(listResponse.body.data).toHaveLength(1);
			expect(listResponse.body.data[0].name).toBe(credentialPayload.name);

			// Test credential read access
			const getResponse = await member1Agent.get(`/credentials/${credentialId}`).expect(200);
			expect(getResponse.body.data.name).toBe(credentialPayload.name);

			// Test credential update access
			const updateResponse = await member1Agent
				.patch(`/credentials/${credentialId}`)
				.send({ ...credentialPayload, name: 'Updated Admin Credential' })
				.expect(200);
			expect(updateResponse.body.data.name).toBe('Updated Admin Credential');

			// Test credential delete access
			await member1Agent.delete(`/credentials/${credentialId}`).expect(200);
		});
	});

	describe('Project Editor Role - Full CRUD Access', () => {
		beforeEach(async () => {
			// Link member2 to teamProjectA as project editor
			await linkUserToProject(member2, teamProjectA, PROJECT_EDITOR_ROLE_SLUG);
		});

		test('project editor should have full workflow CRUD access', async () => {
			// Create a workflow in the project via HTTP endpoint (project editor has workflow:create scope)
			const workflowPayload = {
				name: 'Test Editor Workflow',
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
				staticData: null,
				settings: {
					saveExecutionProgress: true,
				},
				projectId: teamProjectA.id,
			};

			const editorWorkflowResponse = await member2Agent
				.post('/workflows')
				.send(workflowPayload)
				.expect(200);

			const workflow = editorWorkflowResponse.body.data;
			expect(workflow.name).toBe('Test Editor Workflow');

			// Test workflow list access
			const listResponse = await member2Agent.get('/workflows').expect(200);
			expect(listResponse.body.data).toHaveLength(1);

			// Test workflow read access
			const getResponse = await member2Agent.get(`/workflows/${workflow.id}`).expect(200);
			expect(getResponse.body.data.name).toBe('Test Editor Workflow');

			// Test workflow update access
			const updateResponse = await member2Agent
				.patch(`/workflows/${workflow.id}`)
				.send({ name: 'Updated Editor Workflow', versionId: workflow.versionId })
				.expect(200);
			expect(updateResponse.body.data.name).toBe('Updated Editor Workflow');

			// Test workflow delete access (should succeed - editors have delete permission)
			await member2Agent.post(`/workflows/${workflow.id}/archive`).send().expect(200);
			await member2Agent.delete(`/workflows/${workflow.id}`).send().expect(200);
		});

		test('project editor should have full credential CRUD access', async () => {
			// Create a credential payload
			const credentialPayload = randomCredentialPayload();

			// Test credential create access
			const editorCredentialResponse = await member2Agent
				.post('/credentials')
				.send({ ...credentialPayload, projectId: teamProjectA.id })
				.expect(200);

			const credentialId = editorCredentialResponse.body.data.id;
			expect(editorCredentialResponse.body.data.name).toBe(credentialPayload.name);

			// Test credential list access
			const listResponse = await member2Agent.get('/credentials').expect(200);
			expect(listResponse.body.data).toHaveLength(1);

			// Test credential read access
			const getResponse = await member2Agent.get(`/credentials/${credentialId}`).expect(200);
			expect(getResponse.body.data.name).toBe(credentialPayload.name);

			// Test credential update access
			const updateResponse = await member2Agent
				.patch(`/credentials/${credentialId}`)
				.send({ ...credentialPayload, name: 'Updated Editor Credential' })
				.expect(200);
			expect(updateResponse.body.data.name).toBe('Updated Editor Credential');

			// Test credential delete access (should succeed - editors have delete permission)
			await member2Agent.delete(`/credentials/${credentialId}`).expect(200);
		});
	});

	describe('Project Viewer Role - Read-Only Access (No Create/Update/Delete)', () => {
		beforeEach(async () => {
			// Link member3 to teamProjectA as project viewer
			await linkUserToProject(member3, teamProjectA, PROJECT_VIEWER_ROLE_SLUG);
		});

		test('project viewer should have read-only workflow access (no create/update/delete permissions)', async () => {
			// Create a workflow in the project using helper
			const workflow = await createWorkflow({ name: 'Read-Only Test Workflow' }, teamProjectA);

			// Test workflow list access
			const listResponse = await member3Agent.get('/workflows').expect(200);
			expect(listResponse.body.data).toHaveLength(1);
			expect(listResponse.body.data[0].name).toBe('Read-Only Test Workflow');

			// Test workflow read access
			const getResponse = await member3Agent.get(`/workflows/${workflow.id}`).expect(200);
			expect(getResponse.body.data.name).toBe('Read-Only Test Workflow');

			// Test workflow create access (should be forbidden)
			const workflowPayload = {
				name: 'New Viewer Workflow',
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
				projectId: teamProjectA.id,
			};

			// Project viewer doesn't have workflow:create permissions in this team project
			await member3Agent.post('/workflows').send(workflowPayload).expect(400);

			// Test workflow update access (should be forbidden)
			await member3Agent
				.patch(`/workflows/${workflow.id}`)
				.send({ name: 'Updated Viewer Workflow', versionId: workflow.versionId })
				.expect(403);

			// Test workflow delete access (should be forbidden)
			await member3Agent.post(`/workflows/${workflow.id}/archive`).send().expect(403);
		});

		test('project viewer should have read-only credential access (no create/update/delete permissions)', async () => {
			// Create a credential via owner first
			const credentialPayload = randomCredentialPayload();
			const ownerCredentialResponse = await ownerAgent
				.post('/credentials')
				.send({ ...credentialPayload, projectId: teamProjectA.id })
				.expect(200);

			const credentialId = ownerCredentialResponse.body.data.id;

			// Test credential list access
			const listResponse = await member3Agent.get('/credentials').expect(200);
			expect(listResponse.body.data).toHaveLength(1);
			expect(listResponse.body.data[0].name).toBe(credentialPayload.name);

			// Test credential read access
			const getResponse = await member3Agent.get(`/credentials/${credentialId}`).expect(200);
			expect(getResponse.body.data.name).toBe(credentialPayload.name);

			// Test credential create access (should be forbidden)
			await member3Agent
				.post('/credentials')
				.send({ ...randomCredentialPayload(), projectId: teamProjectA.id })
				.expect(400);

			// Test credential update access (should be forbidden)
			await member3Agent
				.patch(`/credentials/${credentialId}`)
				.send({ ...credentialPayload, name: 'Updated Viewer Credential' })
				.expect(403);

			// Test credential delete access (should be forbidden)
			await member3Agent.delete(`/credentials/${credentialId}`).expect(403);
		});
	});

	describe('Personal Project Owner Role - Personal Project Full Access', () => {
		test('personal project owner should have full access in their own project', async () => {
			// Create a workflow in member1's personal project via HTTP endpoint (personal owner has workflow:create scope)
			const workflowPayload = {
				name: 'Test Personal Workflow',
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
				staticData: null,
				settings: {
					saveExecutionProgress: true,
				},
				projectId: member1PersonalProject.id,
			};

			const personalWorkflowResponse = await member1Agent
				.post('/workflows')
				.send(workflowPayload)
				.expect(200);

			const workflow = personalWorkflowResponse.body.data;
			expect(workflow.name).toBe('Test Personal Workflow');

			// Test workflow list access - filter for personal project workflows only
			const listResponse = await member1Agent.get('/workflows').expect(200);
			const personalWorkflows = listResponse.body.data.filter(
				(wf: any) => wf.homeProject && wf.homeProject.id === member1PersonalProject.id,
			);
			expect(personalWorkflows).toHaveLength(1);
			expect(personalWorkflows[0].name).toBe('Test Personal Workflow');

			// Test workflow operations
			await member1Agent.get(`/workflows/${workflow.id}`).expect(200);
			await member1Agent
				.patch(`/workflows/${workflow.id}`)
				.send({ name: 'Updated Personal Workflow', versionId: workflow.versionId })
				.expect(200);
			await member1Agent.post(`/workflows/${workflow.id}/archive`).send().expect(200);
			await member1Agent.delete(`/workflows/${workflow.id}`).send().expect(200);

			// Test credential operations
			const credentialPayload = randomCredentialPayload();
			const personalCredentialResponse = await member1Agent
				.post('/credentials')
				.send({ ...credentialPayload, projectId: member1PersonalProject.id })
				.expect(200);

			const credentialId = personalCredentialResponse.body.data.id;
			expect(personalCredentialResponse.body.data.name).toBe(credentialPayload.name);

			await member1Agent.get(`/credentials/${credentialId}`).expect(200);
			await member1Agent
				.patch(`/credentials/${credentialId}`)
				.send({ ...credentialPayload, name: 'Updated Personal Credential' })
				.expect(200);
			await member1Agent.delete(`/credentials/${credentialId}`).expect(200);
		});
	});
});
