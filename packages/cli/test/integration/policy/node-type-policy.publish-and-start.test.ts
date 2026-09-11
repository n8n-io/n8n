/**
 * Pins the two points a real node type policy must reach with no grandfathering: publishing
 * and starting a run.
 *
 * Both use a workflow stored before the policy existed, which saves fine. That pairing is the
 * behaviour the RFC asks for and the one users will call a bug — "my old workflow saves but
 * will not run" — so it is worth pinning on the real paths rather than in the check's own tests.
 */
import { createWorkflow, createWorkflowWithHistory, testDb } from '@n8n/backend-test-utils';
import { WorkflowsConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import { ExecutionRepository, WorkflowRepository, type IWorkflowDb, type User } from '@n8n/db';
import { PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { createRunExecutionData, type INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const CHECK_ID = 'node-type-availability';

const MANUAL_TRIGGER = 'n8n-nodes-base.manualTrigger';
const SCHEDULE_TRIGGER = 'n8n-nodes-base.scheduleTrigger';
const SET = 'n8n-nodes-base.set';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'activeWorkflows', 'type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.NODE_TYPE_POLICIES],
});

let owner: User;
let ownerAgent: SuperAgentTest;
let activeWorkflowManager: ActiveWorkflowManager;
let workflowRepository: WorkflowRepository;
let executionRepository: ExecutionRepository;

const workflowsConfig = Container.get(WorkflowsConfig);
const originalUsePublicationService = workflowsConfig.useWorkflowPublicationService;

const node = (type: string, name = type): INode => ({
	id: uuid(),
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
});

/** The `set` node stays unconnected: the check reads the node list, not the graph. */
const withBlockedNode = (triggerType: string) => [node(triggerType), node(SET)];

async function denySetAtInstanceScope() {
	const response = await ownerAgent.put('/node-type-policies/instance').send({
		rules: [{ id: 'deny-set', action: 'deny', selector: { kind: 'name', value: SET } }],
		defaultAction: 'allow',
		version: 0,
	});

	expect(response.statusCode).toBe(200);
}

const expectedViolation = {
	kind: 'node-type-unavailable',
	checkId: CHECK_ID,
	message: `Node type "${SET}" is blocked by an instance policy`,
	subject: SET,
	subjectType: 'nodeType',
	scope: 'instance',
	matchedRuleId: 'deny-set',
};

beforeAll(async () => {
	// Asserted by id, not by importing the class: the import would register the check itself,
	// and every allowed case below would pass with the module no longer registering it.
	const registeredIds = Container.get(PolicyCheckMetadata)
		.getClasses()
		.map((checkClass) => Container.get(checkClass).id);
	expect(registeredIds).toContain(CHECK_ID);

	// The default set: a real Schedule Trigger that activation can register (its `trigger` is
	// stubbed, so it never fires) and a real Manual Trigger that a run can execute.
	await utils.initNodeTypes();
	await utils.initBinaryDataService();

	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);

	Container.get(InstanceSettings).markAsLeader();
	activeWorkflowManager = Container.get(ActiveWorkflowManager);
	workflowRepository = Container.get(WorkflowRepository);
	executionRepository = Container.get(ExecutionRepository);

	// Activation is asserted through `ActiveWorkflowManager`; the publication applier enforces
	// the same point in its own tests.
	workflowsConfig.useWorkflowPublicationService = false;
});

afterAll(() => {
	workflowsConfig.useWorkflowPublicationService = originalUsePublicationService;
});

afterEach(async () => {
	await activeWorkflowManager.removeAll();
	await activeWorkflowManager.clearAllActivationErrors();

	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
		'ExecutionEntity',
		'WorkflowEntity',
		'SharedWorkflow',
		'WebhookEntity',
		'WorkflowHistory',
		'WorkflowPublishHistory',
	]);
});

describe('POST /workflows/:workflowId/activate', () => {
	test('refuses to publish a stored workflow that carries a blocked type', async () => {
		const workflow = await createWorkflowWithHistory(
			{ name: 'Publishing', nodes: withBlockedNode(SCHEDULE_TRIGGER), connections: {} },
			owner,
		);
		await denySetAtInstanceScope();

		const response = await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId })
			.expect(403);

		expect(response.body).toMatchObject({
			code: 403,
			meta: { violations: [expectedViolation] },
		});

		const stored = await workflowRepository.findOneBy({ id: workflow.id });
		expect(stored?.activeVersionId).toBeNull();
		expect(activeWorkflowManager.allActiveInMemory()).not.toContain(workflow.id);
	});

	test('publishes as usual when no rule matches the workflow', async () => {
		const workflow = await createWorkflowWithHistory(
			{ name: 'Publishing', nodes: [node(SCHEDULE_TRIGGER)], connections: {} },
			owner,
		);
		await denySetAtInstanceScope();

		await ownerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId })
			.expect(200);

		const stored = await workflowRepository.findOneBy({ id: workflow.id });
		expect(stored?.activeVersionId).toBe(workflow.versionId);
	});
});

describe('starting a run', () => {
	const run = async (workflow: IWorkflowDb) =>
		await Container.get(WorkflowRunner).run(
			{
				workflowData: workflow,
				executionMode: 'trigger',
				executionData: createRunExecutionData({}),
			},
			true,
		);

	async function waitForFinalStatus(executionId: string, timeout = 20000) {
		const start = Date.now();

		while (Date.now() - start < timeout) {
			const execution = await executionRepository.findOne({ where: { id: executionId } });
			if (execution && ['error', 'success', 'crashed'].includes(execution.status)) {
				return execution;
			}
			await new Promise((resolve) => setTimeout(resolve, 50));
		}

		throw new Error(`Execution ${executionId} did not finish within ${timeout}ms`);
	}

	test('fails the run with the structured violation', async () => {
		const workflow = await createWorkflow(
			{ name: 'Running', nodes: withBlockedNode(MANUAL_TRIGGER), connections: {} },
			owner,
		);
		await denySetAtInstanceScope();

		const executionId = await run(workflow);

		const execution = await waitForFinalStatus(executionId);
		expect(execution.status).toBe('error');

		const stored = await executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		const error = stored?.data.resultData.error as unknown as {
			message: string;
			violations?: unknown[];
		};

		expect(error?.violations).toEqual([expectedViolation]);
	});

	test('runs as usual when no rule matches the workflow', async () => {
		const workflow = await createWorkflow(
			{ name: 'Running', nodes: [node(MANUAL_TRIGGER)], connections: {} },
			owner,
		);
		await denySetAtInstanceScope();

		const executionId = await run(workflow);

		const execution = await waitForFinalStatus(executionId);
		expect(execution.status).toBe('success');
	});
});
