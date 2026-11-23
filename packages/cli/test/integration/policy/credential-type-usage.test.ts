import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	shareWorkflowWithProjects,
	testDb,
} from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import {
	WorkflowDependencies,
	WorkflowDependencyRepository,
	type Project,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';
import { createCredentials } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

import { indexVersion } from './shared/workflow-index';

const testServer = utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

const INSTANCE_USAGE = '/credential-type-policies/usage';
const projectUsage = (projectId: string) => `/projects/${projectId}/credential-type-policies/usage`;

let owner: User;
let member: User;
let projectAdmin: User;
let projectEditor: User;
let projectA: Project;
let projectB: Project;

const credential = async (type: string) =>
	await createCredentials({ name: type, type, data: '' }, projectA);

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();
	projectAdmin = await createMember();
	projectEditor = await createMember();
	projectA = await createTeamProject('Project A', projectAdmin);
	projectB = await createTeamProject('Project B');
	await linkUserToProject(projectEditor, projectA, 'project:editor');
});

afterEach(async () => {
	await testDb.truncate(['WorkflowDependency', 'SharedWorkflow', 'WorkflowEntity']);
	await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
});

describe('GET /credential-type-policies/usage', () => {
	test('counts uses, workflows and active workflows of the version that runs', async () => {
		const bitlyOne = await credential('bitlyApi');
		const bitlyTwo = await credential('bitlyApi');

		const inactive = await createWorkflow({}, projectA);
		await indexVersion(inactive, null, 'credentialId', [bitlyOne.id, bitlyTwo.id]);

		const published = await createActiveWorkflow({}, projectA);
		await indexVersion(published, published.activeVersionId, 'credentialId', [bitlyOne.id]);
		// An active workflow counts in its published version only, so its draft rows do not count.
		await indexVersion(published, null, 'credentialId', [bitlyOne.id, bitlyOne.id]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({
			bitlyApi: { uses: 3, workflows: 2, activeWorkflows: 1, projects: 1 },
		});
	});

	test('counts the credentials that HTTP Request nodes select, also one left after an auth mode change', async () => {
		const bitly = await credential('bitlyApi');
		const header = await credential('httpHeaderAuth');
		const httpRequest = (id: string, overrides: Partial<INode>): INode => ({
			id,
			name: id,
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		});

		const workflow = await createWorkflow(
			{
				nodes: [
					httpRequest('predefined', {
						parameters: {
							authentication: 'predefinedCredentialType',
							nodeCredentialType: 'bitlyApi',
						},
						credentials: { bitlyApi: { id: bitly.id, name: 'Bitly' } },
					}),
					// Switched to header auth, with the Bitly credential and selector left behind.
					httpRequest('switched', {
						parameters: {
							authentication: 'genericCredentialType',
							genericAuthType: 'httpHeaderAuth',
							nodeCredentialType: 'bitlyApi',
						},
						credentials: {
							bitlyApi: { id: bitly.id, name: 'Bitly' },
							httpHeaderAuth: { id: header.id, name: 'Header' },
						},
					}),
					// Names Bitly API but has no credential selected.
					httpRequest('unselected', {
						parameters: {
							authentication: 'predefinedCredentialType',
							nodeCredentialType: 'bitlyApi',
						},
					}),
				],
			},
			projectA,
		);
		// `createWorkflow` already indexes the node types, so index as the next version.
		await Container.get(WorkflowIndexService).updateIndexForDraft({
			...workflow,
			versionCounter: workflow.versionCounter + 1,
		});

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({
			bitlyApi: { uses: 2, workflows: 1, activeWorkflows: 0, projects: 1 },
			httpHeaderAuth: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
		});
	});

	test('counts each project that owns a workflow once, and not a project it is shared with', async () => {
		const bitly = await credential('bitlyApi');
		const inA = await createWorkflow({}, projectA);
		await indexVersion(inA, null, 'credentialId', [bitly.id]);
		const alsoInA = await createWorkflow({}, projectA);
		await indexVersion(alsoInA, null, 'credentialId', [bitly.id]);
		const inB = await createWorkflow({}, projectB);
		await indexVersion(inB, null, 'credentialId', [bitly.id]);
		const sharedOnly = await createTeamProject('Shared only');
		await shareWorkflowWithProjects(inA, [{ project: sharedOnly }]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({
			bitlyApi: { uses: 3, workflows: 3, activeWorkflows: 0, projects: 2 },
		});
	});

	test('counts only credential rows of the index', async () => {
		const bitly = await credential('bitlyApi');
		const workflow = await createWorkflow({}, projectA);
		const dependencies = new WorkflowDependencies(workflow.id, workflow.versionCounter + 1, null);
		dependencies.add({
			dependencyType: 'credentialId',
			dependencyKey: bitly.id,
			dependencyInfo: { nodeId: 'node-0', nodeVersion: 1 },
		});
		dependencies.add({
			dependencyType: 'dataTableId',
			dependencyKey: bitly.id,
			dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
		});
		await Container.get(WorkflowDependencyRepository).updateDependenciesForWorkflow(
			workflow.id,
			dependencies,
		);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({
			bitlyApi: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
		});
	});

	test('counts nothing from archived workflows or deleted credentials', async () => {
		const bitly = await credential('bitlyApi');

		const archived = await createWorkflow({ isArchived: true }, projectA);
		await indexVersion(archived, null, 'credentialId', [bitly.id]);
		const withDeletedCredential = await createWorkflow({}, projectA);
		await indexVersion(withDeletedCredential, null, 'credentialId', ['deleted-credential-id']);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({});
	});

	test('counts only the published version of an active workflow whose draft changed type', async () => {
		const bitly = await credential('bitlyApi');
		const slack = await credential('slackApi');

		const workflow = await createActiveWorkflow({}, projectA);
		await indexVersion(workflow, workflow.activeVersionId, 'credentialId', [bitly.id]);
		await indexVersion(workflow, null, 'credentialId', [slack.id]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({
			bitlyApi: { uses: 1, workflows: 1, activeWorkflows: 1, projects: 1 },
		});
	});

	test('ignores the published rows of a workflow that is no longer active', async () => {
		const bitly = await credential('bitlyApi');
		const inactive = await createWorkflow({}, projectA);
		await indexVersion(inactive, 'unpublished-version-id', 'credentialId', [bitly.id]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({});
	});

	test('rejects a member with 403', async () => {
		await testServer.authAgentFor(member).get(INSTANCE_USAGE).expect(403);
	});

	test('rejects an owner with 403 when the license feature is disabled', async () => {
		testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
		try {
			await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(403);
		} finally {
			testServer.license.enable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
		}
	});
});

describe('GET /projects/:projectId/credential-type-policies/usage', () => {
	test('counts a workflow only in the project that owns it', async () => {
		const bitly = await credential('bitlyApi');
		const workflow = await createWorkflow({}, projectA);
		await shareWorkflowWithProjects(workflow, [{ project: projectB }]);
		await indexVersion(workflow, null, 'credentialId', [bitly.id]);

		const agent = testServer.authAgentFor(owner);
		const ownerProject = await agent.get(projectUsage(projectA.id)).expect(200);
		const sharedProject = await agent.get(projectUsage(projectB.id)).expect(200);

		expect(ownerProject.body.data).toEqual({
			bitlyApi: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
		});
		expect(sharedProject.body.data).toEqual({});
	});

	test('counts a credential of another project in the project that owns the workflow', async () => {
		const bitly = await credential('bitlyApi');
		const workflow = await createWorkflow({}, projectB);
		await indexVersion(workflow, null, 'credentialId', [bitly.id]);

		const agent = testServer.authAgentFor(owner);
		const workflowProject = await agent.get(projectUsage(projectB.id)).expect(200);
		const credentialProject = await agent.get(projectUsage(projectA.id)).expect(200);

		expect(workflowProject.body.data).toEqual({
			bitlyApi: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
		});
		expect(credentialProject.body.data).toEqual({});
	});

	test('lets the admin of the project read it', async () => {
		await testServer.authAgentFor(projectAdmin).get(projectUsage(projectA.id)).expect(200);
	});

	test('rejects a project editor with 403', async () => {
		await testServer.authAgentFor(projectEditor).get(projectUsage(projectA.id)).expect(403);
	});
});
