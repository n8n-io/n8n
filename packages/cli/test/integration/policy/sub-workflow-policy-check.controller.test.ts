import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import { type INode } from 'n8n-workflow';
import { type IWorkflowDb, type Project, type User, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';

import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { createParentWorkflowFixture, createSubWorkflowFixture } from '../shared/workflow-fixtures';
import { reloadPolicySnapshot } from './shared/policy-snapshot';

const SET = 'n8n-nodes-base.set';
const CODE = 'n8n-nodes-base.code';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

let owner: User;
let ownerAgent: SuperAgentTest;
let parentEditor: User;
let outsider: User;
let parentProject: Project;
let childProject: Project;

const route = (parentId: string, subWorkflowId: string) =>
	`/workflows/${parentId}/sub-workflows/${subWorkflowId}/policy-check`;

const node = (type: string): INode => ({
	id: uuid(),
	name: type,
	type,
	typeVersion: 1,
	position: [200, 0],
	parameters: {},
});

const deny = (type: string) => ({
	rules: [{ id: `deny-${type}`, action: 'deny', selector: { kind: 'name', value: type } }],
	defaultAction: 'allow',
	version: 0,
});

async function createChild(
	extraNodes: INode[],
	settings: IWorkflowDb['settings'] = { callerPolicy: 'any' },
	home: Project | User = childProject,
) {
	const fixture = createSubWorkflowFixture();
	return await createWorkflow(
		{
			name: 'Child',
			...fixture,
			nodes: [...fixture.nodes, ...extraNodes],
			settings,
		} as unknown as IWorkflowDb,
		home,
	);
}

async function createParent(childId: string) {
	return await createWorkflow(
		{ name: 'Parent', ...createParentWorkflowFixture(childId) } as unknown as IWorkflowDb,
		parentProject,
	);
}

beforeAll(async () => {
	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);
	parentEditor = await createMember();
	outsider = await createMember();

	parentProject = await createTeamProject('Parent project', owner);
	childProject = await createTeamProject('Child project', owner);
	await linkUserToProject(parentEditor, parentProject, 'project:editor');
});

afterEach(async () => {
	vi.restoreAllMocks();
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
	]);
	await reloadPolicySnapshot();
	testServer.license.enable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
});

describe('GET /workflows/:workflowId/sub-workflows/:subWorkflowId/policy-check', () => {
	test("names the node type blocked by the sub-workflow's project, and that project", async () => {
		const child = await createChild([node(SET)]);
		const parent = await createParent(child.id);
		await ownerAgent
			.put(`/projects/${childProject.id}/node-type-policies/project`)
			.send(deny(SET))
			.expect(200);

		const response = await ownerAgent.get(route(parent.id, child.id)).expect(200);

		expect(response.body.data).toEqual({
			projectName: 'Child project',
			draft: [
				expect.objectContaining({
					subject: SET,
					subjectType: 'nodeType',
					scope: 'project',
					projectId: childProject.id,
				}),
			],
			published: null,
		});
	});

	test("ignores the parent project's policy", async () => {
		const child = await createChild([node(SET)]);
		const parent = await createParent(child.id);
		await ownerAgent
			.put(`/projects/${parentProject.id}/node-type-policies/project`)
			.send(deny(SET))
			.expect(200);

		const response = await ownerAgent.get(route(parent.id, child.id)).expect(200);

		expect(response.body.data).toEqual({
			projectName: 'Child project',
			draft: [],
			published: null,
		});
	});

	test('reports an instance block with the instance scope', async () => {
		const child = await createChild([node(SET)]);
		const parent = await createParent(child.id);
		await ownerAgent.put('/node-type-policies/instance').send(deny(SET)).expect(200);

		const response = await ownerAgent.get(route(parent.id, child.id)).expect(200);

		expect(response.body.data.draft).toEqual([
			expect.objectContaining({ subject: SET, scope: 'instance', projectId: childProject.id }),
		]);
	});

	test('judges the draft and the published version separately', async () => {
		const child = await createActiveWorkflow(
			{ name: 'Child', nodes: [node(SET)], settings: { callerPolicy: 'any' } },
			childProject,
		);
		// The draft moves on from the published version: Set is replaced by Code.
		await Container.get(WorkflowRepository).update(child.id, {
			nodes: [...child.nodes.filter((n) => n.type !== SET), node(CODE)],
		});
		const parent = await createParent(child.id);
		await ownerAgent.put('/node-type-policies/instance').send(deny(SET)).expect(200);

		const response = await ownerAgent.get(route(parent.id, child.id)).expect(200);

		expect(response.body.data.draft).toEqual([]);
		expect(response.body.data.published).toEqual([
			expect.objectContaining({ subject: SET, scope: 'instance' }),
		]);
	});

	test("omits the name of a personal project, which holds the owner's name", async () => {
		const child = await createChild([node(SET)], { callerPolicy: 'any' }, owner);
		const parent = await createParent(child.id);
		await ownerAgent.put('/node-type-policies/instance').send(deny(SET)).expect(200);

		const response = await ownerAgent.get(route(parent.id, child.id)).expect(200);

		expect(response.body.data).not.toHaveProperty('projectName');
		expect(response.body.data.draft).toHaveLength(1);
	});

	test('answers a parent editor who has no access to the sub-workflow', async () => {
		const child = await createChild([node(SET)]);
		const parent = await createParent(child.id);
		await ownerAgent.put('/node-type-policies/instance').send(deny(SET)).expect(200);

		const response = await testServer
			.authAgentFor(parentEditor)
			.get(route(parent.id, child.id))
			.expect(200);

		expect(response.body.data.draft).toEqual([expect.objectContaining({ subject: SET })]);
		// The editor is not a member of the sub-workflow's project, so it stays unnamed.
		expect(response.body.data).not.toHaveProperty('projectName');
	});

	test('fails instead of reporting no violations when a policy check cannot run', async () => {
		const child = await createChild([node(SET)]);
		const parent = await createParent(child.id);
		vi.spyOn(Container.get(PolicyEnforcementService), 'evaluateWorkflowStart').mockResolvedValue({
			violations: [],
			checkErrors: [{ checkId: 'node-type-availability', correlationId: 'abc' }],
		});

		await ownerAgent.get(route(parent.id, child.id)).expect(500);
	});

	test("returns 404 when the sub-workflow's caller policy refuses the parent", async () => {
		const child = await createChild([node(SET)], { callerPolicy: 'workflowsFromSameOwner' });
		const parent = await createParent(child.id);
		await ownerAgent.put('/node-type-policies/instance').send(deny(SET)).expect(200);

		await ownerAgent.get(route(parent.id, child.id)).expect(404);
	});

	test('returns 404 for a sub-workflow that does not exist', async () => {
		const parent = await createParent('does-not-exist');

		await ownerAgent.get(route(parent.id, 'does-not-exist')).expect(404);
	});

	test('refuses a user who cannot update the parent', async () => {
		const child = await createChild([node(SET)]);
		const parent = await createParent(child.id);

		await testServer.authAgentFor(outsider).get(route(parent.id, child.id)).expect(403);
	});

	test('refuses the request when the license feature is off', async () => {
		const child = await createChild([node(SET)]);
		const parent = await createParent(child.id);
		testServer.license.disable(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);

		await ownerAgent.get(route(parent.id, child.id)).expect(403);
	});
});
