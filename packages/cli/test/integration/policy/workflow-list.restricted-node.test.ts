import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	testDb,
} from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import {
	WorkflowDependencies,
	WorkflowDependencyRepository,
	WorkflowRepository,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { createFolder } from '../shared/db/folders';
import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { clearPolicyCache } from './shared/policy-cache';

const MANUAL_TRIGGER = 'n8n-nodes-base.manualTrigger';
const SLACK = 'n8n-nodes-base.slack';
const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

let owner: User;
let ownerAgent: SuperAgentTest;

const node = (type: string, overrides: Partial<INode> = {}): INode => ({
	id: uuid(),
	name: type,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

const denySlack = {
	rules: [{ id: 'deny-slack', action: 'deny', selector: { kind: 'name', value: SLACK } }],
	defaultAction: 'allow',
	version: 0,
};

async function indexVersion(
	workflow: { id: string; versionCounter: number },
	publishedVersionId: string | null,
	nodeTypes: string[],
) {
	const dependencies = new WorkflowDependencies(
		workflow.id,
		workflow.versionCounter + 1,
		publishedVersionId,
	);
	for (const nodeType of nodeTypes) {
		dependencies.add({ dependencyType: 'nodeType', dependencyKey: nodeType, dependencyInfo: null });
	}
	await Container.get(WorkflowDependencyRepository).updateDependenciesForWorkflow(
		workflow.id,
		dependencies,
	);
}

async function listRestricted({
	projectId,
	includeFolders,
}: { projectId?: string; includeFolders?: boolean } = {}) {
	const filter = JSON.stringify({
		executionBlockedBy: ['restrictedNode'],
		...(projectId && { projectId }),
	});
	const response = await ownerAgent
		.get('/workflows')
		.query({ filter, ...(includeFolders && { includeFolders }) })
		.expect(200);

	return {
		ids: response.body.data.map((row: { id: string }) => row.id).sort(),
		count: response.body.count,
	};
}

beforeAll(async () => {
	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);
});

afterEach(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
		'WorkflowDependency',
		'SharedWorkflow',
		'WorkflowPublishedVersion',
		'WorkflowPublishHistory',
		'WorkflowEntity',
		'WorkflowHistory',
		'Folder',
	]);
	await clearPolicyCache();
	testServer.license.enable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
});

describe('GET /workflows with the restricted node filter', () => {
	test('matches the version each workflow runs, in the page and in the count', async () => {
		const unpublishedWithSlack = await createWorkflow(
			{ nodes: [node(MANUAL_TRIGGER), node(SLACK)] },
			owner,
		);
		await createWorkflow({ nodes: [node(MANUAL_TRIGGER)] }, owner);

		const publishedWithSlack = await createActiveWorkflow({ nodes: [node(MANUAL_TRIGGER)] }, owner);
		await indexVersion(publishedWithSlack, publishedWithSlack.activeVersionId, [
			MANUAL_TRIGGER,
			SLACK,
		]);

		const draftOnlySlack = await createActiveWorkflow(
			{ nodes: [node(MANUAL_TRIGGER), node(SLACK)] },
			owner,
		);
		await indexVersion(draftOnlySlack, draftOnlySlack.activeVersionId, [MANUAL_TRIGGER]);

		await ownerAgent.put('/node-type-policies/instance').send(denySlack).expect(200);

		expect(await listRestricted()).toEqual({
			ids: [unpublishedWithSlack.id, publishedWithSlack.id].sort(),
			count: 2,
		});
	});

	test("judges each workflow by its owner project's policy", async () => {
		const restrictingProject = await createTeamProject('Restricts Slack', owner);
		const otherProject = await createTeamProject('Allows Slack', owner);
		const restricted = await createWorkflow({ nodes: [node(SLACK)] }, restrictingProject);
		await createWorkflow({ nodes: [node(SLACK)] }, otherProject);

		await ownerAgent
			.put(`/projects/${restrictingProject.id}/node-type-policies/project`)
			.send(denySlack)
			.expect(200);

		expect(await listRestricted()).toEqual({ ids: [restricted.id], count: 1 });
		expect(await listRestricted({ projectId: otherProject.id })).toEqual({ ids: [], count: 0 });
	});

	test('applies the instance verdict with and without a project policy', async () => {
		const optsIn = await createTeamProject('Opts in to Slack', owner);
		const noPolicy = await createTeamProject('No policy', owner);
		await createWorkflow({ nodes: [node(SLACK)] }, optsIn);
		const deniedByInstance = await createWorkflow({ nodes: [node(HTTP_REQUEST)] }, optsIn);
		const delegatedWithoutOptIn = await createWorkflow({ nodes: [node(SLACK)] }, noPolicy);

		await ownerAgent
			.put('/node-type-policies/instance')
			.send({
				rules: [
					{ id: 'deny-http', action: 'deny', selector: { kind: 'name', value: HTTP_REQUEST } },
					{ id: 'delegate-slack', action: 'delegate', selector: { kind: 'name', value: SLACK } },
				],
				defaultAction: 'allow',
				version: 0,
			})
			.expect(200);
		await ownerAgent
			.put(`/projects/${optsIn.id}/node-type-policies/project`)
			.send({
				rules: [{ id: 'allow-slack', action: 'allow', selector: { kind: 'name', value: SLACK } }],
				defaultAction: 'allow',
				version: 0,
			})
			.expect(200);

		expect(await listRestricted()).toEqual({
			ids: [deniedByInstance.id, delegatedWithoutOptIn.id].sort(),
			count: 2,
		});
	});

	test('counts a disabled node, as enforcement does', async () => {
		const disabledSlack = await createWorkflow(
			{ nodes: [node(MANUAL_TRIGGER), node(SLACK, { disabled: true })] },
			owner,
		);

		await ownerAgent.put('/node-type-policies/instance').send(denySlack).expect(200);

		expect(await listRestricted()).toEqual({ ids: [disabledSlack.id], count: 1 });
	});

	test('keeps the folders when the list includes them', async () => {
		const project = await createTeamProject('With folders', owner);
		const folder = await createFolder(project);
		const restricted = await createWorkflow({ nodes: [node(SLACK)] }, project);
		await createWorkflow({ nodes: [node(MANUAL_TRIGGER)] }, project);

		await ownerAgent.put('/node-type-policies/instance').send(denySlack).expect(200);

		expect(await listRestricted({ projectId: project.id, includeFolders: true })).toEqual({
			ids: [folder.id, restricted.id].sort(),
			count: 2,
		});
	});

	test('matches nothing when the license has lapsed, as enforcement stops too', async () => {
		await createWorkflow({ nodes: [node(SLACK)] }, owner);
		await ownerAgent.put('/node-type-policies/instance').send(denySlack).expect(200);

		testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);

		expect(await listRestricted()).toEqual({ ids: [], count: 0 });
	});

	test('matches nothing when no policy restricts a node type in use', async () => {
		await createWorkflow({ nodes: [node(SLACK)] }, owner);

		expect(await listRestricted()).toEqual({ ids: [], count: 0 });
	});
});

describe('WorkflowRepository with restricted node types', () => {
	test('matches each project by its own outcome, however many projects have one', async () => {
		const grouped = await createTeamProject('Own outcome', owner);
		const allowlist = await createTeamProject('Allowlist', owner);
		const shared = await createTeamProject('Shared outcome', owner);
		const restrictsNothing = await createTeamProject('Restricts nothing', owner);
		const groupedSlack = await createWorkflow({ nodes: [node(SLACK)] }, grouped);
		const groupedHttp = await createWorkflow({ nodes: [node(HTTP_REQUEST)] }, grouped);
		const allowlistSlack = await createWorkflow({ nodes: [node(SLACK)] }, allowlist);
		const allowlistManual = await createWorkflow({ nodes: [node(MANUAL_TRIGGER)] }, allowlist);
		const sharedHttp = await createWorkflow({ nodes: [node(HTTP_REQUEST)] }, shared);
		const sharedSlack = await createWorkflow({ nodes: [node(SLACK)] }, shared);
		const unrestrictedHttp = await createWorkflow(
			{ nodes: [node(HTTP_REQUEST)] },
			restrictsNothing,
		);

		const otherOutcomes = Array.from({ length: 1000 }, (_, outcome) => ({
			projectIds: [uuid()],
			nodeTypes: Array.from({ length: 70 }, (_, type) => `n8n-nodes-base.other${outcome}x${type}`),
		}));
		const nodeTypesInUse = [
			MANUAL_TRIGGER,
			SLACK,
			HTTP_REQUEST,
			...otherOutcomes.flatMap(({ nodeTypes }) => nodeTypes),
		];
		const byProjects = [
			...otherOutcomes,
			{ projectIds: [grouped.id], nodeTypes: [SLACK] },
			{ projectIds: [restrictsNothing.id], nodeTypes: [] },
			{
				projectIds: [allowlist.id],
				nodeTypes: nodeTypesInUse.filter((type) => type !== MANUAL_TRIGGER),
			},
		];

		const workflows = await Container.get(WorkflowRepository).getMany(
			[
				groupedSlack,
				groupedHttp,
				allowlistSlack,
				allowlistManual,
				sharedHttp,
				sharedSlack,
				unrestrictedHttp,
			].map(({ id }) => id),
			{
				restrictedNodeTypes: {
					shared: [HTTP_REQUEST],
					byProjects,
					nodeTypesInUse,
				},
			},
		);

		expect(workflows.map(({ id }) => id).sort()).toEqual(
			[groupedSlack.id, allowlistSlack.id, sharedHttp.id].sort(),
		);
	});
});
