/**
 * Runs a parent workflow that calls a sub-workflow with a redaction policy, then reads
 * the executions back through the REST API. The parent keeps a copy of the
 * sub-workflow's output, so the parent's execution must be redacted as well.
 */
import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IWorkflowDb, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { parse } from 'flatted';
import { ExecutionContextHookRegistry } from 'n8n-core';
import type { IRunExecutionData, WorkflowSettings } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';
import { loadNodesFromDist } from './shared/utils/node-types-data';
import { createParentWorkflowFixture, createSubWorkflowFixture } from './shared/workflow-fixtures';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'executions'],
	modules: ['redaction'],
	enabledFeatures: ['feat:dataRedaction'],
});

let owner: User;
let ownerAgent: SuperAgentTest;
let executionRepository: ExecutionRepository;

beforeAll(async () => {
	// The redaction module registers its context hooks in `init()`, and the registry
	// only picks up decorated hooks when it initializes.
	await Container.get(ExecutionContextHookRegistry).init();

	await utils.initNodeTypes(
		loadNodesFromDist([
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.executeWorkflow',
			'n8n-nodes-base.executeWorkflowTrigger',
			'n8n-nodes-base.stopAndError',
		]),
	);
	await utils.initBinaryDataService();

	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);
	executionRepository = Container.get(ExecutionRepository);
});

afterEach(async () => {
	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'SharedWorkflow']);
});

async function createChild(name: string, redactionPolicy?: WorkflowSettings.RedactionPolicy) {
	return await createWorkflow(
		{
			name,
			...createSubWorkflowFixture(),
			settings: redactionPolicy ? { redactionPolicy } : {},
		} as unknown as IWorkflowDb,
		owner,
	);
}

/** Manual Trigger → Execute Workflow (first child) → Execute Workflow (second child). */
function createTwoCallParentFixture(firstChildId: string, secondChildId: string) {
	const callNode = (name: string, workflowId: string, x: number) => ({
		id: uuid(),
		name,
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1.3,
		position: [x, 0] as [number, number],
		parameters: {
			workflowId: { __rl: true, value: workflowId, mode: 'id' },
			workflowInputs: {
				mappingMode: 'defineBelow',
				value: { test: 'test' },
				matchingColumns: [],
				schema: [],
				attemptToConvertTypes: false,
				convertFieldsToString: true,
			},
			options: {},
		},
	});
	const main = (node: string) => ({
		main: [[{ node, type: NodeConnectionTypes.Main, index: 0 }]],
	});

	return {
		nodes: [
			{
				id: uuid(),
				name: 'Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			},
			callNode('Call first', firstChildId, 200),
			callNode('Call second', secondChildId, 400),
		],
		connections: { Trigger: main('Call first'), 'Call first': main('Call second') },
		pinData: {},
	};
}

async function runManually(workflowId: string) {
	const response = await ownerAgent
		.post(`/workflows/${workflowId}/run`)
		.send({ triggerToStartFrom: { name: 'Trigger' } })
		.expect(200);
	const executionId = response.body.data.executionId as string;
	await waitForFinalStatus(executionId);
	return executionId;
}

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

async function readExecution(executionId: string) {
	const response = await ownerAgent.get(`/executions/${executionId}`).expect(200);
	return parse(response.body.data.data as string) as IRunExecutionData;
}

async function findChildExecutionId(workflowId: string) {
	const [execution] = await executionRepository.find({ where: { workflowId } });
	return execution.id;
}

test('redacts the calling execution when the sub-workflow redacts its channel', async () => {
	const child = await createChild('Child with policy', 'all');
	const parent = await createWorkflow(
		{ name: 'Parent', ...createParentWorkflowFixture(child.id) } as unknown as IWorkflowDb,
		owner,
	);

	const parentExecutionId = await runManually(parent.id);

	const stored = await executionRepository.findSingleExecution(parentExecutionId, {
		includeData: true,
		unflattenData: true,
	});
	expect(stored?.status).toBe('success');
	expect(stored?.data.executionData?.runtimeData).toMatchObject({
		redaction: { version: 2, production: false, manual: false },
		subWorkflowRedaction: { production: true, manual: true },
	});

	const data = await readExecution(parentExecutionId);
	expect(data.redactionInfo).toEqual({
		isRedacted: true,
		reason: 'workflow_redaction_policy',
		canReveal: true,
	});
	for (const nodeName of ['Trigger', 'Execute Workflow']) {
		for (const items of data.resultData.runData[nodeName][0].data!.main) {
			for (const item of items ?? []) {
				expect(item.json).toEqual({});
				expect(item.redaction).toEqual({
					redacted: true,
					reason: 'workflow_redaction_policy',
				});
			}
		}
	}
});

test('does not redact a manual calling execution when the sub-workflow redacts production only', async () => {
	const child = await createChild('Child with production policy', 'non-manual');
	const parent = await createWorkflow(
		{ name: 'Parent', ...createParentWorkflowFixture(child.id) } as unknown as IWorkflowDb,
		owner,
	);

	const parentExecutionId = await runManually(parent.id);

	const data = await readExecution(parentExecutionId);
	expect(data.redactionInfo).toBeUndefined();
	expect(data.resultData.runData['Execute Workflow'][0].data!.main[0]![0].json).toEqual({
		test: 'test',
	});
});

test('redacts a later sibling sub-workflow that receives the redacted output', async () => {
	const redactedChild = await createChild('Child with policy', 'all');
	const plainChild = await createChild('Child without policy');
	const parent = await createWorkflow(
		{
			name: 'Parent',
			...createTwoCallParentFixture(redactedChild.id, plainChild.id),
		} as unknown as IWorkflowDb,
		owner,
	);

	const parentExecutionId = await runManually(parent.id);
	expect((await readExecution(parentExecutionId)).redactionInfo?.reason).toBe(
		'workflow_redaction_policy',
	);

	const plainChildData = await readExecution(await findChildExecutionId(plainChild.id));
	expect(plainChildData.redactionInfo).toMatchObject({ isRedacted: true });
	// The sibling inherits the escalation with the parent's context. Its own snapshot keeps its own policy.
	expect(plainChildData.executionData?.runtimeData).toMatchObject({
		redaction: { production: false, manual: false },
		subWorkflowRedaction: { production: true, manual: true },
	});
});

test('redacts a retry that reuses the sub-workflow output without calling the sub-workflow again', async () => {
	const child = await createChild('Child with policy', 'all');
	const fixture = createParentWorkflowFixture(child.id);
	const parent = await createWorkflow(
		{
			name: 'Parent',
			...fixture,
			nodes: [
				...fixture.nodes,
				{
					id: uuid(),
					name: 'Stop and Error',
					type: 'n8n-nodes-base.stopAndError',
					typeVersion: 1,
					position: [400, 0] as [number, number],
					parameters: { errorMessage: 'Fail after the call' },
				},
			],
			connections: {
				...fixture.connections,
				'Execute Workflow': {
					main: [[{ node: 'Stop and Error', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
		} as unknown as IWorkflowDb,
		owner,
	);

	const parentExecutionId = await runManually(parent.id);
	expect((await waitForFinalStatus(parentExecutionId)).status).toBe('error');

	await ownerAgent.post(`/executions/${parentExecutionId}/retry`).send({}).expect(200);

	// The retry keeps the stored output of `Execute Workflow` and runs only the failed node, so
	// the escalation must come from the stored execution context.
	expect(await executionRepository.count({ where: { workflowId: child.id } })).toBe(1);
	const retry = await executionRepository.findOneOrFail({
		where: { retryOf: parentExecutionId },
	});
	expect(retry.mode).toBe('retry');

	const data = await readExecution(retry.id);
	expect(data.executionData?.runtimeData?.subWorkflowRedaction).toEqual({
		production: true,
		manual: true,
	});
	expect(data.redactionInfo).toMatchObject({ isRedacted: true });
	for (const item of data.resultData.runData['Execute Workflow'][0].data!.main[0] ?? []) {
		expect(item.json).toEqual({});
	}
});
