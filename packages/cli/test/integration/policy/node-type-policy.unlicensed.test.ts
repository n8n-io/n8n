/**
 * Pins that an unlicensed instance enforces nothing, even with policy rows in its database.
 *
 * A separate file because the license is set once per test server. The rows are written
 * through the service rather than the REST routes: without the license the module skips
 * `init()`, so its controllers are never mounted — which is half of what this suite asserts.
 */
import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { WorkflowRepository, type User } from '@n8n/db';
import { PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { TypeAvailabilityPolicyService } from '@/modules/type-availability-policies/type-availability-policy.service';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const CHECK_ID = 'node-type-availability';

const MANUAL_TRIGGER = 'n8n-nodes-base.manualTrigger';
const SET = 'n8n-nodes-base.set';

// No `enabledFeatures`: the feature module is eligible and its entities are registered, but
// `initModules` skips it, so nothing registers the check.
const testServer = utils.setupTestServer({
	endpointGroups: ['workflows'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
});

let owner: User;
let ownerAgent: SuperAgentTest;
let workflowRepository: WorkflowRepository;

const node = (type: string): INode => ({
	id: uuid(),
	name: type,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

beforeAll(async () => {
	await utils.initNodeTypes();
	workflowRepository = Container.get(WorkflowRepository);

	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);

	await Container.get(TypeAvailabilityPolicyService).setEffectivePolicy(
		'node-types',
		null,
		{
			rules: [{ id: 'deny-set', action: 'deny', selector: { kind: 'name', value: SET } }],
			defaultAction: 'allow',
		},
		0,
		owner.id,
	);
});

afterAll(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
	]);
});

afterEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
		'WorkflowPublishHistory',
	]);
});

test('does not register the check', () => {
	const registeredIds = Container.get(PolicyCheckMetadata)
		.getClasses()
		.map((checkClass) => Container.get(checkClass).id);

	expect(registeredIds).not.toContain(CHECK_ID);
});

test('stores the policy but enforces nothing on create', async () => {
	const stored = await Container.get(TypeAvailabilityPolicyService).getEffectivePolicy(
		'node-types',
		null,
	);
	expect(stored.rules).toHaveLength(1);

	await ownerAgent
		.post('/workflows')
		.send({ name: 'Unpoliced', nodes: [node(MANUAL_TRIGGER), node(SET)], connections: {} })
		.expect(200);

	await expect(workflowRepository.count()).resolves.toBe(1);
});

test('enforces nothing on update', async () => {
	const workflow = await createWorkflow(
		{ name: 'Unpoliced', nodes: [node(MANUAL_TRIGGER)], connections: {} },
		owner,
	);

	await ownerAgent
		.patch(`/workflows/${workflow.id}`)
		.send({ name: 'Renamed', nodes: [node(MANUAL_TRIGGER), node(SET)], connections: {} })
		.expect(200);
});
