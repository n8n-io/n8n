import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import type { PolicyCheckResult, PolicyViolation, RegisteredPolicyCheck } from '@n8n/decorators';
import { PolicyCheck, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';

import { cleanupRolesAndScopes } from '../shared/db/roles';
import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

/**
 * Pins the `workflowSave` host wiring on the real request path: a registered check that denies
 * every save has to block both the editor and the public API, with its violations in the body.
 * Unit tests construct the services directly, so only this proves the call sites are still there.
 */

const CHECK_ID = 'integration-test-workflow-save';

const DENIAL: PolicyViolation = {
	kind: 'test-denial',
	checkId: CHECK_ID,
	message: 'Denied by the test policy check',
	subject: 'n8n-nodes-base.manualTrigger',
	subjectType: 'nodeType',
};

/**
 * `allow` by default: the check registers process-wide when this file is loaded and
 * `PolicyCheckMetadata` has no unregister, so a leak into another suite has to be a no-op.
 */
let mode: 'allow' | 'deny' | 'break' = 'allow';

@PolicyCheck()
class TestWorkflowSaveCheck implements RegisteredPolicyCheck {
	readonly id = CHECK_ID;

	async onWorkflowSave(): Promise<PolicyCheckResult> {
		if (mode === 'break') throw new Error('Test check failed on purpose');

		return await Promise.resolve({ violations: mode === 'deny' ? [DENIAL] : [] });
	}
}

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'publicApi'],
	modules: ['policy-infrastructure'],
});

mockInstance(ActiveWorkflowManager);

const triggerNode = {
	id: 'a4e5d0e6-1a44-4f7e-9b7d-2c6a1f0b3c11',
	name: 'Manual Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	parameters: {},
	typeVersion: 1,
	position: [240, 300] as [number, number],
};

const editorPayload = { name: 'Policed workflow', nodes: [triggerNode], connections: {} };
const publicApiPayload = { ...editorPayload, settings: { executionOrder: 'v1' } };

let owner: User;
let editorAgent: SuperAgentTest;
let publicApiAgent: SuperAgentTest;
let workflowRepository: WorkflowRepository;

const truncate = async () =>
	await testDb.truncate([
		'SharedWorkflow',
		'ProjectRelation',
		'Folder',
		'WebhookEntity',
		'WorkflowEntity',
		'WorkflowHistory',
		'WorkflowPublishHistory',
		'TagEntity',
		'Project',
		'User',
	]);

beforeAll(async () => {
	await utils.initNodeTypes();
	workflowRepository = Container.get(WorkflowRepository);

	// The public API's OpenAPI validator compiles the whole spec on the first authenticated
	// request that reaches it (~3s). Spend it here, under the 30s hook timeout, so it can't
	// blow a test's 10s timeout inside `PUT /workflows/:id` — the only validator-served route
	// this suite uses. The other three routes are served by controllers, which sit in front of
	// the validator, so they never pay it.
	await truncate();
	const warmUpUser = await createOwnerWithApiKey();
	await testServer.publicApiAgentFor(warmUpUser).put('/workflows/warm-up').send(publicApiPayload);
});

beforeEach(async () => {
	mode = 'allow';
	await truncate();
	await cleanupRolesAndScopes();

	owner = await createOwnerWithApiKey();
	editorAgent = testServer.authAgentFor(owner);
	publicApiAgent = testServer.publicApiAgentFor(owner);
});

test('registers the test check, so a denial below can only come from it', () => {
	expect(Container.get(PolicyCheckMetadata).getClasses()).toContain(TestWorkflowSaveCheck);
});

describe('with a check that denies every save', () => {
	beforeEach(() => {
		mode = 'deny';
	});

	test('editor create fails with 403 and the violations', async () => {
		const response = await editorAgent.post('/workflows').send(editorPayload);

		expect(response.statusCode).toBe(403);
		expect(response.body).toMatchObject({
			code: 403,
			message: DENIAL.message,
			meta: { violations: [DENIAL] },
		});
		await expect(workflowRepository.count()).resolves.toBe(0);
	});

	test('editor update fails with 403 and the violations', async () => {
		const workflow = await createWorkflow({ name: 'Stored name' }, owner);

		const response = await editorAgent
			.patch(`/workflows/${workflow.id}`)
			.send({ name: 'Renamed', nodes: [triggerNode], connections: {} });

		expect(response.statusCode).toBe(403);
		expect(response.body).toMatchObject({
			code: 403,
			message: DENIAL.message,
			meta: { violations: [DENIAL] },
		});
		const stored = await workflowRepository.findOneByOrFail({ id: workflow.id });
		expect(stored.name).toBe('Stored name');
	});

	test('public API create fails with 403 and the violations', async () => {
		const response = await publicApiAgent.post('/workflows').send(publicApiPayload);

		expect(response.statusCode).toBe(403);
		expect(response.body).toEqual({ message: DENIAL.message, violations: [DENIAL] });
		await expect(workflowRepository.count()).resolves.toBe(0);
	});

	test('public API update fails with 403 and the violations', async () => {
		const workflow = await createWorkflow({ name: 'Stored name' }, owner);

		const response = await publicApiAgent
			.put(`/workflows/${workflow.id}`)
			.send({ ...publicApiPayload, name: 'Renamed' });

		expect(response.statusCode).toBe(403);
		expect(response.body).toEqual({ message: DENIAL.message, violations: [DENIAL] });
		const stored = await workflowRepository.findOneByOrFail({ id: workflow.id });
		expect(stored.name).toBe('Stored name');
	});
});

describe('with the same check reporting nothing', () => {
	test('editor create succeeds', async () => {
		const response = await editorAgent.post('/workflows').send(editorPayload);

		expect(response.statusCode).toBe(200);
		const { data } = response.body as { data: { id: string } };
		await expect(workflowRepository.findOneByOrFail({ id: data.id })).resolves.toMatchObject({
			name: editorPayload.name,
		});
	});

	test('public API create succeeds', async () => {
		const response = await publicApiAgent.post('/workflows').send(publicApiPayload);

		expect(response.statusCode).toBe(200);
		const { id } = response.body as { id: string };
		await expect(workflowRepository.findOneByOrFail({ id })).resolves.toMatchObject({
			name: publicApiPayload.name,
		});
	});
});

// A check that didn't answer hasn't said yes: the save is blocked, but nothing about why —
// an infrastructure fault rendered as a policy rule is something a user would try to satisfy.
test('a check that breaks blocks the save without leaking violations', async () => {
	mode = 'break';

	const response = await editorAgent.post('/workflows').send(editorPayload);

	expect(response.statusCode).toBe(503);
	const { meta } = response.body as { meta: Record<string, unknown> };
	expect(meta.violations).toBeUndefined();
	await expect(workflowRepository.count()).resolves.toBe(0);
});
