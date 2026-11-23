import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
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

import { NodeTypes } from '@/node-types';
import { createMember, createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

import { fakeResolveBaseName, indexVersion } from './shared/workflow-index';

const nodeTypes = mockInstance(NodeTypes);

const testServer = utils.setupTestServer({
	endpointGroups: ['type-availability-policies'],
	modules: ['type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

const INSTANCE_USAGE = '/node-type-policies/usage';
const projectUsage = (projectId: string) => `/projects/${projectId}/node-type-policies/usage`;

const NOTION = 'n8n-nodes-base.notion';
const SLACK = 'n8n-nodes-base.slack';
const GMAIL = 'n8n-nodes-base.gmail';
const GMAIL_TOOL = 'n8n-nodes-base.gmailTool';
const GMAIL_HITL_TOOL = 'n8n-nodes-base.gmailHitlTool';
/** A real node whose name ends in `Tool`. It is not a variant of anything. */
const REAL_TOOL = '@n8n/n8n-nodes-langchain.mcpClientTool';

let owner: User;
let member: User;
let projectAdmin: User;
let projectEditor: User;
let projectA: Project;
let projectB: Project;

// `createWorkflow` indexes the nodes it gets as the draft, so the workflows here get none and the
// tests index the rows they need.

/** An inactive workflow whose draft has nodes of these types. */
async function draftWorkflow(project: Project, types: string[], attributes = {}) {
	const workflow = await createWorkflow({ nodes: [], ...attributes }, project);
	await indexVersion(workflow, null, 'nodeType', types);
	return workflow;
}

/** An active workflow whose published version has nodes of these types. Its draft does not count. */
async function activeWorkflow(project: Project, types: string[]) {
	const workflow = await createActiveWorkflow({}, project);
	await indexVersion(workflow, workflow.activeVersionId, 'nodeType', types);
	return workflow;
}

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();
	projectAdmin = await createMember();
	projectEditor = await createMember();
	projectA = await createTeamProject('Project A', projectAdmin);
	projectB = await createTeamProject('Project B');
	await linkUserToProject(projectEditor, projectA, 'project:editor');
});

beforeEach(() => {
	nodeTypes.resolveBaseName.mockImplementation(fakeResolveBaseName([REAL_TOOL]));
});

afterEach(async () => {
	await testDb.truncate(['WorkflowDependency', 'SharedWorkflow', 'WorkflowEntity']);
});

describe('GET /node-type-policies/usage', () => {
	test('counts uses, workflows and active workflows of the version that runs', async () => {
		await draftWorkflow(projectA, [NOTION, NOTION]);
		await activeWorkflow(projectA, [NOTION]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({
			[NOTION]: { uses: 3, workflows: 2, activeWorkflows: 1, projects: 1 },
		});
	});

	test('returns counts for every node type in use', async () => {
		const types = Array.from({ length: 150 }, (_, index) => `n8n-nodes-base.type${index}`);
		await draftWorkflow(projectA, types);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(Object.keys(response.body.data)).toHaveLength(150);
	});

	test('counts each project that owns a workflow once, and not a project it is shared with', async () => {
		const inA = await draftWorkflow(projectA, [NOTION]);
		await draftWorkflow(projectA, [NOTION]);
		await draftWorkflow(projectB, [NOTION]);
		const sharedOnly = await createTeamProject('Shared only');
		await shareWorkflowWithProjects(inA, [{ project: sharedOnly }]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({
			[NOTION]: { uses: 3, workflows: 3, activeWorkflows: 0, projects: 2 },
		});
	});

	test('counts only node type rows of the index', async () => {
		const workflow = await createWorkflow({ nodes: [] }, projectA);
		const dependencies = new WorkflowDependencies(workflow.id, workflow.versionCounter + 1, null);
		dependencies.add({
			dependencyType: 'nodeType',
			dependencyKey: NOTION,
			dependencyInfo: { nodeId: 'node-0', nodeVersion: 1 },
		});
		dependencies.add({
			dependencyType: 'webhookPath',
			dependencyKey: NOTION,
			dependencyInfo: { nodeId: 'node-1', nodeVersion: 1 },
		});
		await Container.get(WorkflowDependencyRepository).updateDependenciesForWorkflow(
			workflow.id,
			dependencies,
		);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({
			[NOTION]: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
		});
	});

	test('counts nothing from archived workflows', async () => {
		await draftWorkflow(projectA, [NOTION], { isArchived: true });

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({});
	});

	test('counts an active workflow in its published version, also when its draft has no node of the type', async () => {
		const workflow = await createActiveWorkflow({}, projectA);
		await indexVersion(workflow, workflow.activeVersionId, 'nodeType', [NOTION]);
		await indexVersion(workflow, null, 'nodeType', [SLACK]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		const notion = response.body.data[NOTION];
		expect(notion).toEqual({ uses: 1, workflows: 1, activeWorkflows: 1, projects: 1 });
		expect(notion.activeWorkflows).toBeLessThanOrEqual(notion.workflows);
		expect(response.body.data).not.toHaveProperty(SLACK);
	});

	test('ignores the published rows of a workflow that is no longer active', async () => {
		const inactive = await createWorkflow({ nodes: [] }, projectA);
		await indexVersion(inactive, 'unpublished-version-id', 'nodeType', [NOTION]);

		const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

		expect(response.body.data).toEqual({});
	});

	describe('tool variants', () => {
		test('counts the variants in the entry of their base type, and a workflow once', async () => {
			await draftWorkflow(projectA, [GMAIL, GMAIL_TOOL]);
			await activeWorkflow(projectB, [GMAIL_HITL_TOOL]);

			const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

			expect(response.body.data).toEqual({
				[GMAIL]: { uses: 3, workflows: 2, activeWorkflows: 1, projects: 2 },
				[GMAIL_TOOL]: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
				[GMAIL_HITL_TOOL]: { uses: 1, workflows: 1, activeWorkflows: 1, projects: 1 },
			});
		});

		test('adds an entry for the base type when only a variant is in use', async () => {
			await draftWorkflow(projectA, [GMAIL_TOOL]);

			const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

			expect(response.body.data).toEqual({
				[GMAIL]: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
				[GMAIL_TOOL]: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
			});
		});

		test('does not fold a real node whose name ends in Tool', async () => {
			await draftWorkflow(projectA, [REAL_TOOL]);

			const response = await testServer.authAgentFor(owner).get(INSTANCE_USAGE).expect(200);

			expect(response.body.data).toEqual({
				[REAL_TOOL]: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
			});
		});
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

describe('GET /projects/:projectId/node-type-policies/usage', () => {
	test('counts a workflow only in the project that owns it', async () => {
		const workflow = await draftWorkflow(projectA, [NOTION]);
		await shareWorkflowWithProjects(workflow, [{ project: projectB }]);

		const agent = testServer.authAgentFor(owner);
		const ownerProject = await agent.get(projectUsage(projectA.id)).expect(200);
		const sharedProject = await agent.get(projectUsage(projectB.id)).expect(200);

		expect(ownerProject.body.data).toEqual({
			[NOTION]: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
		});
		expect(sharedProject.body.data).toEqual({});
	});

	test('folds the tool variants of the workflows that the project owns', async () => {
		await draftWorkflow(projectA, [GMAIL_TOOL]);
		await draftWorkflow(projectB, [GMAIL]);

		const response = await testServer
			.authAgentFor(owner)
			.get(projectUsage(projectA.id))
			.expect(200);

		expect(response.body.data).toEqual({
			[GMAIL]: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
			[GMAIL_TOOL]: { uses: 1, workflows: 1, activeWorkflows: 0, projects: 1 },
		});
	});

	test('lets the admin of the project read it', async () => {
		await testServer.authAgentFor(projectAdmin).get(projectUsage(projectA.id)).expect(200);
	});

	test('rejects a project editor with 403', async () => {
		await testServer.authAgentFor(projectEditor).get(projectUsage(projectA.id)).expect(403);
	});
});
