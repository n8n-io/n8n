/**
 * Pins what a real node type policy decides at `workflowSave` and `workflowTransfer`, through
 * the REST routes and the real decision pipeline.
 *
 * The check's unit tests mock the policy store, so they prove the diff logic but not that a
 * policy written through the API reaches a save at all. Grandfathering is the reason this has
 * to be an integration test: it depends on the stored workflow the host loads, which no unit
 * test supplies for real.
 */
import { createTeamProject, createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import { WorkflowRepository, type Project, type User } from '@n8n/db';
import { PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';

import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const CHECK_ID = 'node-type-availability';

const MANUAL_TRIGGER = 'n8n-nodes-base.manualTrigger';
const SET = 'n8n-nodes-base.set';
const SCHEDULE_TRIGGER = 'n8n-nodes-base.scheduleTrigger';

// `endpointGroups` is load-bearing beyond the routes it mounts: `setupTestServer` only reaches
// `ModuleRegistry.initModules` when it is set, and that init is what registers both the
// enforcement implementation and this feature's check.
const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [
		LICENSE_FEATURES.NODE_TYPE_POLICIES,
		LICENSE_FEATURES.SHARING,
		LICENSE_FEATURES.ADVANCED_PERMISSIONS,
	],
});

mockInstance(ActiveWorkflowManager);

let owner: User;
let projectAdmin: User;
let ownerAgent: SuperAgentTest;
let adminAgent: SuperAgentTest;
let project: Project;
let otherProject: Project;
let workflowRepository: WorkflowRepository;

const node = (type: string, name = type): INode => ({
	id: uuid(),
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

const rule = (id: string, action: 'allow' | 'deny' | 'delegate', value: string) => ({
	id,
	action,
	selector: { kind: 'name', value },
});

type PolicyWrite = { rules: ReturnType<typeof rule>[]; defaultAction?: string; version?: number };

async function putInstancePolicy({ rules, defaultAction = 'allow', version = 0 }: PolicyWrite) {
	const response = await ownerAgent
		.put('/node-type-policies/instance')
		.send({ rules, defaultAction, version });

	expect(response.statusCode).toBe(200);

	return response.body as { version: number };
}

async function putProjectPolicy(
	projectId: string,
	{ rules, defaultAction = 'allow', version = 0 }: PolicyWrite,
) {
	const response = await adminAgent
		.put(`/projects/${projectId}/node-type-policies/project`)
		.send({ rules, defaultAction, version });

	expect(response.statusCode).toBe(200);

	return response.body as { version: number };
}

const violationFor = (typeName: string, scope: 'instance' | 'project', matchedRuleId: string) => ({
	kind: 'node-type-unavailable',
	checkId: CHECK_ID,
	message: `Node type "${typeName}" is blocked by ${scope === 'instance' ? 'an instance policy' : "this project's policy"}`,
	subject: typeName,
	subjectType: 'nodeType',
	scope,
	matchedRuleId,
});

beforeAll(async () => {
	/**
	 * Asserted by id rather than by importing the class: importing it would run
	 * `@PolicyCheck()` here, and every case below would then pass even if the module stopped
	 * registering it — the silent allow-all this suite exists to catch.
	 */
	const registeredIds = Container.get(PolicyCheckMetadata)
		.getClasses()
		.map((checkClass) => Container.get(checkClass).id);
	expect(registeredIds).toContain(CHECK_ID);

	await utils.initNodeTypes();
	workflowRepository = Container.get(WorkflowRepository);

	owner = await createOwner();
	projectAdmin = await createMember();
	ownerAgent = testServer.authAgentFor(owner);
	adminAgent = testServer.authAgentFor(projectAdmin);

	project = await createTeamProject('Policy project', projectAdmin);
	otherProject = await createTeamProject('Other project', projectAdmin);
});

afterEach(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
		'WorkflowPublishHistory',
	]);
});

describe('PATCH /workflows/:workflowId', () => {
	/** Stored before the policy exists, the way real content predates a new restriction. */
	const storeWorkflowWith = async (nodes: INode[]) =>
		await createWorkflow({ name: 'Stored workflow', nodes, connections: {} }, owner);

	test('saves a stored workflow whose blocked type it already had', async () => {
		const workflow = await storeWorkflowWith([node(MANUAL_TRIGGER), node(SET)]);
		await putInstancePolicy({ rules: [rule('deny-set', 'deny', SET)] });

		await ownerAgent
			.patch(`/workflows/${workflow.id}`)
			.send({
				name: 'Renamed',
				nodes: [node(MANUAL_TRIGGER), node(SET)],
				connections: {},
			})
			.expect(200);

		const stored = await workflowRepository.findOneBy({ id: workflow.id });
		expect(stored?.name).toBe('Renamed');
	});

	test('reports only the newly added blocked type', async () => {
		const workflow = await storeWorkflowWith([node(MANUAL_TRIGGER), node(SET)]);
		await putInstancePolicy({
			rules: [rule('deny-set', 'deny', SET), rule('deny-schedule', 'deny', SCHEDULE_TRIGGER)],
		});

		const response = await ownerAgent
			.patch(`/workflows/${workflow.id}`)
			.send({
				name: 'Renamed',
				nodes: [node(MANUAL_TRIGGER), node(SET), node(SCHEDULE_TRIGGER)],
				connections: {},
			})
			.expect(403);

		expect(response.body).toMatchObject({
			code: 403,
			meta: { violations: [violationFor(SCHEDULE_TRIGGER, 'instance', 'deny-schedule')] },
		});
	});

	test('leaves the stored workflow untouched when the save is blocked', async () => {
		const workflow = await storeWorkflowWith([node(MANUAL_TRIGGER)]);
		await putInstancePolicy({ rules: [rule('deny-set', 'deny', SET)] });

		await ownerAgent
			.patch(`/workflows/${workflow.id}`)
			.send({ name: 'Renamed', nodes: [node(MANUAL_TRIGGER), node(SET)], connections: {} })
			.expect(403);

		const stored = await workflowRepository.findOneBy({ id: workflow.id });
		expect(stored?.name).toBe('Stored workflow');
		expect(stored?.nodes.map((storedNode) => storedNode.type)).toEqual([MANUAL_TRIGGER]);
	});

	test('saves as usual when no rule matches', async () => {
		const workflow = await storeWorkflowWith([node(MANUAL_TRIGGER)]);
		await putInstancePolicy({ rules: [rule('deny-schedule', 'deny', SCHEDULE_TRIGGER)] });

		await ownerAgent
			.patch(`/workflows/${workflow.id}`)
			.send({ name: 'Renamed', nodes: [node(MANUAL_TRIGGER), node(SET)], connections: {} })
			.expect(200);
	});
});

describe('POST /workflows', () => {
	test('blocks a create that carries a blocked type and writes nothing', async () => {
		await putInstancePolicy({ rules: [rule('deny-set', 'deny', SET)] });

		const response = await ownerAgent
			.post('/workflows')
			.send({
				name: 'New workflow',
				nodes: [node(MANUAL_TRIGGER), node(SET)],
				connections: {},
			})
			.expect(403);

		expect(response.body).toMatchObject({
			code: 403,
			meta: { violations: [violationFor(SET, 'instance', 'deny-set')] },
		});
		await expect(workflowRepository.count()).resolves.toBe(0);
	});

	test('has nothing to grandfather, so a create is judged on its whole content', async () => {
		await putInstancePolicy({
			rules: [rule('deny-set', 'deny', SET), rule('deny-schedule', 'deny', SCHEDULE_TRIGGER)],
		});

		const response = await ownerAgent
			.post('/workflows')
			.send({
				name: 'New workflow',
				nodes: [node(SET), node(SCHEDULE_TRIGGER)],
				connections: {},
			})
			.expect(403);

		expect(response.body.meta.violations).toEqual([
			violationFor(SET, 'instance', 'deny-set'),
			violationFor(SCHEDULE_TRIGGER, 'instance', 'deny-schedule'),
		]);
	});
});

describe('PUT /workflows/:workflowId/transfer', () => {
	test('judges the workflow against the target project, with no grandfathering', async () => {
		const workflow = await createWorkflow(
			{ name: 'Moving workflow', nodes: [node(MANUAL_TRIGGER), node(SET)], connections: {} },
			otherProject,
		);
		await putProjectPolicy(project.id, { rules: [rule('deny-set', 'deny', SET)] });

		const response = await adminAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: project.id })
			.expect(403);

		expect(response.body).toMatchObject({
			code: 403,
			meta: { violations: [violationFor(SET, 'project', 'deny-set')] },
		});
	});

	test('allows the transfer when only the source project restricts the type', async () => {
		const workflow = await createWorkflow(
			{ name: 'Moving workflow', nodes: [node(MANUAL_TRIGGER), node(SET)], connections: {} },
			otherProject,
		);
		await putProjectPolicy(otherProject.id, { rules: [rule('deny-set', 'deny', SET)] });

		await adminAgent
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: project.id })
			.expect(200);
	});
});

/**
 * The composition law reaching a save, not just the evaluator: an instance `delegate` is
 * satisfied only by an explicit project `allow`, so the same workflow flips on the project's
 * rule alone.
 */
describe('instance and project scope composition', () => {
	const saveWithSet = () =>
		adminAgent.post('/workflows').send({
			name: 'Composed',
			nodes: [node(MANUAL_TRIGGER), node(SET)],
			connections: {},
			projectId: project.id,
		});

	test('lets an explicit project allow satisfy an instance delegate', async () => {
		await putInstancePolicy({ rules: [rule('delegate-set', 'delegate', SET)] });
		await putProjectPolicy(project.id, { rules: [rule('allow-set', 'allow', SET)] });

		await saveWithSet().expect(200);
	});

	test('denies an unsatisfied instance delegate, naming the instance scope', async () => {
		await putInstancePolicy({ rules: [rule('delegate-set', 'delegate', SET)] });

		const response = await saveWithSet().expect(403);

		expect(response.body.meta.violations).toEqual([violationFor(SET, 'instance', 'delegate-set')]);
	});

	test('keeps an instance deny in force over a project allow', async () => {
		await putInstancePolicy({ rules: [rule('deny-set', 'deny', SET)] });
		await putProjectPolicy(project.id, { rules: [rule('allow-set', 'allow', SET)] });

		const response = await saveWithSet().expect(403);

		expect(response.body.meta.violations).toEqual([violationFor(SET, 'instance', 'deny-set')]);
	});
});
