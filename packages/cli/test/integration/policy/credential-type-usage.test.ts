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
	type WorkflowDependency,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, INodeProperties } from 'n8n-workflow';

import { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';
import { createCredentials } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

// Like the real HTTP Request node, each selector shows only for its own auth mode.
const HTTP_REQUEST_SELECTORS: INodeProperties[] = [
	{ displayName: 'Authentication', name: 'authentication', type: 'string', default: 'none' },
	{
		displayName: 'Credential Type',
		name: 'nodeCredentialType',
		type: 'string',
		default: '',
		displayOptions: { show: { authentication: ['predefinedCredentialType'] } },
	},
	{
		displayName: 'Generic Auth Type',
		name: 'genericAuthType',
		type: 'string',
		default: '',
		displayOptions: { show: { authentication: ['genericCredentialType'] } },
	},
];

const INSTANCE_USAGE = '/credential-type-policies/usage';
const projectUsage = (projectId: string) => `/projects/${projectId}/credential-type-policies/usage`;

let owner: User;
let member: User;
let projectAdmin: User;
let projectEditor: User;
let projectA: Project;
let projectB: Project;

type IndexRow = { type: WorkflowDependency['dependencyType']; credentialId: string };
const active = (credentialId: string): IndexRow => ({ type: 'activeCredentialId', credentialId });
const staleOnly = (credentialId: string): IndexRow => ({ type: 'credentialId', credentialId });

async function indexVersion(
	workflow: { id: string; versionCounter: number },
	publishedVersionId: string | null,
	rows: IndexRow[],
) {
	const dependencies = new WorkflowDependencies(
		workflow.id,
		workflow.versionCounter + 1,
		publishedVersionId,
	);
	for (const [index, row] of rows.entries()) {
		dependencies.add({
			dependencyType: row.type,
			dependencyKey: row.credentialId,
			dependencyInfo: { nodeId: `node-${index}`, nodeVersion: 1 },
		});
	}
	await Container.get(WorkflowDependencyRepository).updateDependenciesForWorkflow(
		workflow.id,
		dependencies,
	);
}

const credential = async (type: string) =>
	await createCredentials({ name: type, type, data: '' }, projectA);

beforeAll(async () => {
	await utils.initNodeTypes({
		...utils.buildDefaultNodes(),
		'n8n-nodes-base.httpRequest': utils.minimalNodeType(
			'n8n-nodes-base.httpRequest',
			HTTP_REQUEST_SELECTORS,
		),
	});
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
		await indexVersion(inactive, null, [active(bitlyOne.id), active(bitlyTwo.id)]);

		const published = await createActiveWorkflow({}, projectA);
		await indexVersion(published, published.activeVersionId, [active(bitlyOne.id)]);
		// The draft of an active workflow does not run, so its rows do not count.
		await indexVersion(published, null, [active(bitlyOne.id), active(bitlyOne.id)]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({
			bitlyApi: { uses: 3, workflows: 2, activeWorkflows: 1 },
		});
	});

	test('counts a credential that the node configuration uses, and not a stale one', async () => {
		const bitly = await credential('bitlyApi');
		const header = await credential('httpHeaderAuth');

		// An HTTP Request node switched from "Predefined Credential Type" (Bitly) to header auth
		// keeps the Bitly credential, but the indexer marks only the header credential as active.
		const workflow = await createWorkflow({}, projectA);
		await indexVersion(workflow, null, [
			staleOnly(bitly.id),
			staleOnly(header.id),
			active(header.id),
		]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({
			httpHeaderAuth: { uses: 1, workflows: 1, activeWorkflows: 0 },
		});
	});

	test('counts what the indexer records for HTTP Request nodes', async () => {
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
		const bothCredentials = {
			bitlyApi: { id: bitly.id, name: 'Bitly' },
			httpHeaderAuth: { id: header.id, name: 'Header' },
		};

		const workflow = await createWorkflow(
			{
				nodes: [
					httpRequest('predefined', {
						parameters: {
							authentication: 'predefinedCredentialType',
							nodeCredentialType: 'bitlyApi',
						},
						credentials: bothCredentials,
					}),
					// Switched to header auth, with the Bitly credential and selector left behind.
					httpRequest('switched', {
						parameters: {
							authentication: 'genericCredentialType',
							genericAuthType: 'httpHeaderAuth',
							nodeCredentialType: 'bitlyApi',
						},
						credentials: bothCredentials,
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
			bitlyApi: { uses: 1, workflows: 1, activeWorkflows: 0 },
			httpHeaderAuth: { uses: 1, workflows: 1, activeWorkflows: 0 },
		});
	});

	test('counts nothing from archived workflows or deleted credentials', async () => {
		const bitly = await credential('bitlyApi');

		const archived = await createWorkflow({ isArchived: true }, projectA);
		await indexVersion(archived, null, [active(bitly.id)]);
		const withDeletedCredential = await createWorkflow({}, projectA);
		await indexVersion(withDeletedCredential, null, [active('deleted-credential-id')]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({});
	});

	test('counts only the published version of an active workflow whose draft changed type', async () => {
		const bitly = await credential('bitlyApi');
		const slack = await credential('slackApi');

		const workflow = await createActiveWorkflow({}, projectA);
		await indexVersion(workflow, workflow.activeVersionId, [active(bitly.id)]);
		await indexVersion(workflow, null, [active(slack.id)]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({
			bitlyApi: { uses: 1, workflows: 1, activeWorkflows: 1 },
		});
	});

	test('ignores the published rows of a workflow that is no longer active', async () => {
		const bitly = await credential('bitlyApi');
		const inactive = await createWorkflow({}, projectA);
		await indexVersion(inactive, 'unpublished-version-id', [active(bitly.id)]);

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
		await indexVersion(workflow, null, [active(bitly.id)]);

		const agent = testServer.authAgentFor(owner);
		const ownerProject = await agent.get(projectUsage(projectA.id)).expect(200);
		const sharedProject = await agent.get(projectUsage(projectB.id)).expect(200);

		expect(ownerProject.body.data).toEqual({
			bitlyApi: { uses: 1, workflows: 1, activeWorkflows: 0 },
		});
		expect(sharedProject.body.data).toEqual({});
	});

	test('lets the admin of the project read it', async () => {
		await testServer.authAgentFor(projectAdmin).get(projectUsage(projectA.id)).expect(200);
	});

	test('rejects a project editor with 403', async () => {
		await testServer.authAgentFor(projectEditor).get(projectUsage(projectA.id)).expect(403);
	});
});
