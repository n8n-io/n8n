import {
	createTeamProject,
	linkUserToProject,
	randomCredentialPayload,
	createWorkflow,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { Project, User, Role } from '@n8n/db';

import { UserManagementMailer } from '@/user-management/email';

import { createCustomRoleWithScopeSlugs, cleanupRolesAndScopes } from '../shared/db/roles';
import { createOwner, createMember } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

/**
 * Cross-Project Access Control Testing
 *
 * Tests role isolation and permission boundaries across different projects:
 * - Role isolation between projects (permissions should not bleed across projects)
 * - Multi-project role assignments (users with different roles in different projects)
 * - Permission boundaries with complex project setups
 * - Unauthorized cross-project resource manipulation prevention
 * - Project-scoped role validation and enforcement
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
let teamProjectB: Project;

// Custom roles for testing (using existing scope system)
let customWorkflowReader: Role;
let customWorkflowWriter: Role;
let customCredentialReader: Role;
let customCredentialWriter: Role;
let customMixedReader: Role;

// Authentication agents
let ownerAgent: SuperAgentTest;
let member1Agent: SuperAgentTest;
let member2Agent: SuperAgentTest;
let member3Agent: SuperAgentTest;

describe('Cross-Project Access Control Tests', () => {
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

		// Create team projects for testing
		teamProjectA = await createTeamProject('Team Project A', owner);
		teamProjectB = await createTeamProject('Team Project B', owner);

		// Create authentication agents
		ownerAgent = testServer.authAgentFor(owner);
		member1Agent = testServer.authAgentFor(member1);
		member2Agent = testServer.authAgentFor(member2);
		member3Agent = testServer.authAgentFor(member3);

		// Create custom roles using predefined scope slugs from the permissions system
		customWorkflowReader = await createCustomRoleWithScopeSlugs(
			['workflow:read', 'workflow:list'],
			{
				roleType: 'project',
				displayName: 'Custom Workflow Reader',
				description: 'Can read and list workflows only',
			},
		);

		customWorkflowWriter = await createCustomRoleWithScopeSlugs(
			['workflow:read', 'workflow:list', 'workflow:create', 'workflow:update'],
			{
				roleType: 'project',
				displayName: 'Custom Workflow Writer',
				description: 'Can read, list, create and update workflows',
			},
		);

		customCredentialReader = await createCustomRoleWithScopeSlugs(
			['credential:read', 'credential:list'],
			{
				roleType: 'project',
				displayName: 'Custom Credential Reader',
				description: 'Can read and list credentials only',
			},
		);

		customCredentialWriter = await createCustomRoleWithScopeSlugs(
			['credential:read', 'credential:list', 'credential:create', 'credential:update'],
			{
				roleType: 'project',
				displayName: 'Custom Credential Writer',
				description: 'Can read, list, create and update credentials',
			},
		);

		customMixedReader = await createCustomRoleWithScopeSlugs(
			['workflow:read', 'workflow:list', 'credential:read', 'credential:list'],
			{
				roleType: 'project',
				displayName: 'Custom Mixed Reader',
				description: 'Can read and list both workflows and credentials',
			},
		);
	});

	afterAll(async () => {
		await cleanupRolesAndScopes();
	});

	test('should enforce role isolation between projects', async () => {
		// Member1 has workflow writer role in teamProjectA only
		await linkUserToProject(member1, teamProjectA, customWorkflowWriter.slug);

		// Member2 has credential writer role in teamProjectB only
		await linkUserToProject(member2, teamProjectB, customCredentialWriter.slug);

		// Create resources in both projects via owner
		const workflowA = await createWorkflow({ name: 'Project A Workflow' }, teamProjectA);
		const workflowB = await createWorkflow({ name: 'Project B Workflow' }, teamProjectB);

		const credentialAPayload = randomCredentialPayload();
		const credentialAResponse = await ownerAgent
			.post('/credentials')
			.send({ ...credentialAPayload, projectId: teamProjectA.id })
			.expect(200);

		const credentialBPayload = randomCredentialPayload();
		const credentialBResponse = await ownerAgent
			.post('/credentials')
			.send({ ...credentialBPayload, projectId: teamProjectB.id })
			.expect(200);

		// Member1 should only see workflows from teamProjectA
		const member1WorkflowsResponse = await member1Agent.get('/workflows').expect(200);
		expect(member1WorkflowsResponse.body.data).toHaveLength(1);
		expect(member1WorkflowsResponse.body.data[0].name).toBe('Project A Workflow');

		// Member1 should not see credentials from any project (no credential permissions)
		const member1CredentialsResponse = await member1Agent.get('/credentials').expect(200);
		expect(member1CredentialsResponse.body.data).toHaveLength(0);

		// Member2 should only see credentials from teamProjectB
		const member2CredentialsResponse = await member2Agent.get('/credentials').expect(200);
		expect(member2CredentialsResponse.body.data).toHaveLength(1);
		expect(member2CredentialsResponse.body.data[0].name).toBe(credentialBPayload.name);

		// Member2 should not see workflows from any project (no workflow permissions)
		const member2WorkflowsResponse = await member2Agent.get('/workflows').expect(200);
		expect(member2WorkflowsResponse.body.data).toHaveLength(0);

		// Cross-project access should be forbidden
		await member1Agent.get(`/workflows/${workflowB.id}`).expect(403); // Member1 can't access Project B workflow
		await member2Agent.get(`/credentials/${credentialAResponse.body.data.id}`).expect(403); // Member2 can't access Project A credential

		// Verify member1 can still access workflowA in their authorized project
		await member1Agent.get(`/workflows/${workflowA.id}`).expect(200);
		// Verify member2 can still access credentials in their authorized project
		await member2Agent.get(`/credentials/${credentialBResponse.body.data.id}`).expect(200);
	});

	test('should handle multi-project role assignments correctly', async () => {
		// Give member1 different roles in different projects
		await linkUserToProject(member1, teamProjectA, customWorkflowWriter.slug); // Write access to workflows in Project A
		await linkUserToProject(member1, teamProjectB, customCredentialReader.slug); // Read access to credentials in Project B

		// Create resources in both projects
		const workflowA = await createWorkflow(
			{ name: 'Multi-Project Workflow A Test2' },
			teamProjectA,
		);
		const workflowB = await createWorkflow(
			{ name: 'Multi-Project Workflow B Test2' },
			teamProjectB,
		);

		const credentialAPayload = randomCredentialPayload();
		const credentialAResponse = await ownerAgent
			.post('/credentials')
			.send({ ...credentialAPayload, projectId: teamProjectA.id })
			.expect(200);

		const credentialBPayload = randomCredentialPayload();
		const credentialBResponse = await ownerAgent
			.post('/credentials')
			.send({ ...credentialBPayload, projectId: teamProjectB.id })
			.expect(200);

		// Member1 should see workflows from Project A (writer role) - but might see workflows from previous tests
		const workflowsResponse = await member1Agent.get('/workflows').expect(200);
		const member1Workflows = workflowsResponse.body.data.filter(
			(wf: any) => wf.name === 'Multi-Project Workflow A Test2',
		);
		expect(member1Workflows).toHaveLength(1);
		expect(member1Workflows[0].name).toBe('Multi-Project Workflow A Test2');

		// Member1 should see credentials from Project B only (reader role)
		const credentialsResponse = await member1Agent.get('/credentials').expect(200);
		const member1Credentials = credentialsResponse.body.data.filter(
			(cred: any) => cred.name === credentialBPayload.name,
		);
		expect(member1Credentials).toHaveLength(1);
		expect(member1Credentials[0].name).toBe(credentialBPayload.name);

		// Test workflow permissions: Can read/write in Project A
		await member1Agent.get(`/workflows/${workflowA.id}`).expect(200); // Can read
		await member1Agent
			.patch(`/workflows/${workflowA.id}`)
			.send({ name: 'Updated Multi-Project Workflow A Test2', versionId: workflowA.versionId })
			.expect(200); // Can write

		// Test workflow permissions: Cannot access Project B workflows
		await member1Agent.get(`/workflows/${workflowB.id}`).expect(403);

		// Test credential permissions: Can read in Project B
		await member1Agent.get(`/credentials/${credentialBResponse.body.data.id}`).expect(200); // Can read

		// Test credential permissions: Cannot write in Project B (reader role only)
		await member1Agent
			.patch(`/credentials/${credentialBResponse.body.data.id}`)
			.send({ ...credentialBPayload, name: 'Forbidden Update' })
			.expect(403); // Cannot write

		// Test credential permissions: Cannot access Project A credentials (no credential role in Project A)
		await member1Agent.get(`/credentials/${credentialAResponse.body.data.id}`).expect(403);
	});

	test('should validate permission boundaries with complex project setups', async () => {
		// Create a complex permission matrix:
		// Member1: Workflow Writer in Project A, Credential Reader in Project B
		// Member2: Workflow Reader in Project A, Credential Writer in Project B
		// Member3: Mixed Reader in both projects

		await linkUserToProject(member1, teamProjectA, customWorkflowWriter.slug);
		await linkUserToProject(member1, teamProjectB, customCredentialReader.slug);

		await linkUserToProject(member2, teamProjectA, customWorkflowReader.slug);
		await linkUserToProject(member2, teamProjectB, customCredentialWriter.slug);

		await linkUserToProject(member3, teamProjectA, customMixedReader.slug);
		await linkUserToProject(member3, teamProjectB, customMixedReader.slug);

		// Create resources for testing
		const workflowA = await createWorkflow(
			{ name: 'Boundary Test Workflow A Test3' },
			teamProjectA,
		);
		const workflowB = await createWorkflow(
			{ name: 'Boundary Test Workflow B Test3' },
			teamProjectB,
		);

		const credentialAPayload = randomCredentialPayload();
		const credentialAResponse = await ownerAgent
			.post('/credentials')
			.send({ ...credentialAPayload, projectId: teamProjectA.id })
			.expect(200);

		const credentialBPayload = randomCredentialPayload();
		const credentialBResponse = await ownerAgent
			.post('/credentials')
			.send({ ...credentialBPayload, projectId: teamProjectB.id })
			.expect(200);

		// Test Member1 permissions - Should see: workflows from Project A, credentials from Project B
		const member1WorkflowsResponse = await member1Agent.get('/workflows').expect(200);
		const member1SpecificWorkflows = member1WorkflowsResponse.body.data.filter(
			(wf: any) => wf.name === 'Boundary Test Workflow A Test3',
		);
		expect(member1SpecificWorkflows).toHaveLength(1);
		expect(member1SpecificWorkflows[0].name).toBe('Boundary Test Workflow A Test3');

		const member1CredentialsResponse = await member1Agent.get('/credentials').expect(200);
		const member1SpecificCredentials = member1CredentialsResponse.body.data.filter(
			(cred: any) => cred.name === credentialBPayload.name,
		);
		expect(member1SpecificCredentials).toHaveLength(1);
		expect(member1SpecificCredentials[0].name).toBe(credentialBPayload.name);

		// Test Member2 permissions - Should see: workflows from Project A (read-only), credentials from Project B
		const member2WorkflowsResponse = await member2Agent.get('/workflows').expect(200);
		const member2SpecificWorkflows = member2WorkflowsResponse.body.data.filter(
			(wf: any) => wf.name === 'Boundary Test Workflow A Test3',
		);
		expect(member2SpecificWorkflows).toHaveLength(1);
		expect(member2SpecificWorkflows[0].name).toBe('Boundary Test Workflow A Test3');

		const member2CredentialsResponse = await member2Agent.get('/credentials').expect(200);
		const member2SpecificCredentials = member2CredentialsResponse.body.data.filter(
			(cred: any) => cred.name === credentialBPayload.name,
		);
		expect(member2SpecificCredentials).toHaveLength(1);
		expect(member2SpecificCredentials[0].name).toBe(credentialBPayload.name);

		// Test Member3 permissions - Should see: workflows from both projects, credentials from both projects (read-only)
		const member3WorkflowsResponse = await member3Agent.get('/workflows').expect(200);
		const member3SpecificWorkflowsA = member3WorkflowsResponse.body.data.filter(
			(wf: any) => wf.name === 'Boundary Test Workflow A Test3',
		);
		const member3SpecificWorkflowsB = member3WorkflowsResponse.body.data.filter(
			(wf: any) => wf.name === 'Boundary Test Workflow B Test3',
		);
		expect(member3SpecificWorkflowsA).toHaveLength(1);
		expect(member3SpecificWorkflowsB).toHaveLength(1);

		const member3CredentialsResponse = await member3Agent.get('/credentials').expect(200);
		const member3SpecificCredentialsA = member3CredentialsResponse.body.data.filter(
			(cred: any) => cred.name === credentialAPayload.name,
		);
		const member3SpecificCredentialsB = member3CredentialsResponse.body.data.filter(
			(cred: any) => cred.name === credentialBPayload.name,
		);
		expect(member3SpecificCredentialsA).toHaveLength(1);
		expect(member3SpecificCredentialsB).toHaveLength(1);

		// Test write permission boundaries
		// Member1 can write workflows in Project A, but not credentials
		await member1Agent
			.patch(`/workflows/${workflowA.id}`)
			.send({ name: 'Updated by Member1 Test3', versionId: workflowA.versionId })
			.expect(200);

		await member1Agent
			.patch(`/credentials/${credentialAResponse.body.data.id}`)
			.send({ ...credentialAPayload, name: 'Forbidden Update' })
			.expect(403);

		// Member2 cannot write workflows in Project A, but can write credentials in Project B
		await member2Agent
			.patch(`/workflows/${workflowA.id}`)
			.send({ name: 'Forbidden Update', versionId: workflowA.versionId })
			.expect(403);

		await member2Agent
			.patch(`/credentials/${credentialBResponse.body.data.id}`)
			.send({ ...credentialBPayload, name: 'Updated by Member2 Test3' })
			.expect(200);

		// Member3 cannot write anything (read-only role)
		await member3Agent
			.patch(`/workflows/${workflowA.id}`)
			.send({ name: 'Forbidden Update', versionId: workflowA.versionId })
			.expect(403);

		await member3Agent
			.patch(`/credentials/${credentialBResponse.body.data.id}`)
			.send({ ...credentialBPayload, name: 'Forbidden Update' })
			.expect(403);

		// Verify member3 can read workflowB directly
		await member3Agent.get(`/workflows/${workflowB.id}`).expect(200);
	});

	test('should prevent unauthorized cross-project resource manipulation', async () => {
		// Setup: Member1 has permissions only in Project A
		await linkUserToProject(member1, teamProjectA, customWorkflowWriter.slug);

		// Create resources in both projects via owner
		const workflowA = await createWorkflow({ name: 'Protected Workflow A Test4' }, teamProjectA);
		const workflowB = await createWorkflow({ name: 'Protected Workflow B Test4' }, teamProjectB);

		// Member1 should be able to manipulate resources in Project A
		await member1Agent.get(`/workflows/${workflowA.id}`).expect(200);
		await member1Agent
			.patch(`/workflows/${workflowA.id}`)
			.send({ name: 'Modified in Project A Test4', versionId: workflowA.versionId })
			.expect(200);

		// Member1 should NOT be able to manipulate resources in Project B
		await member1Agent.get(`/workflows/${workflowB.id}`).expect(403);
		await member1Agent
			.patch(`/workflows/${workflowB.id}`)
			.send({ name: 'Unauthorized Modification', versionId: workflowB.versionId })
			.expect(403);
		await member1Agent.delete(`/workflows/${workflowB.id}`).expect(403);

		// Member1 should not be able to create workflows with Project B ID
		const unauthorizedWorkflowPayload = {
			name: 'Unauthorized Workflow Test4',
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
			projectId: teamProjectB.id, // Trying to create in Project B
		};

		await member1Agent.post('/workflows').send(unauthorizedWorkflowPayload).expect(400); // Should be rejected due to lack of permissions in Project B
	});
});
