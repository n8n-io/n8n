import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { IWorkflowDb, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ExecuteWorkflowTrigger } from 'n8n-nodes-base/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node';
import type { IConnections, INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { ResolveSubWorkflowRequest } from '@/modules/engine-v2/engine-sub-workflow.contract';
import { EngineSubWorkflowService } from '@/modules/engine-v2/engine-sub-workflow.service';
import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { reloadPolicySnapshot } from './shared/policy-snapshot';

const MANUAL_TRIGGER = 'n8n-nodes-base.manualTrigger';
const SUB_WORKFLOW_TRIGGER = 'n8n-nodes-base.executeWorkflowTrigger';
const SET = 'n8n-nodes-base.set';

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows', 'type-availability-policies'],
	modules: ['policy-infrastructure', 'type-availability-policies'],
	enabledFeatures: [LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES],
});

const startExecution = vi.fn();

let owner: User;
let ownerAgent: SuperAgentTest;

const node = (name: string, type: string, parameters: INode['parameters'] = {}): INode => ({
	id: uuid(),
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters,
});

const triggerThenSet = (trigger: INode): { nodes: INode[]; connections: IConnections } => ({
	nodes: [trigger, node('Set', SET)],
	connections: { [trigger.name]: { main: [[{ node: 'Set', type: 'main', index: 0 }]] } },
});

const createV2Workflow = async (trigger: INode) =>
	await createWorkflow(
		{
			...triggerThenSet(trigger),
			settings: { engineType: 'v2', callerPolicy: 'any' },
		} as Partial<IWorkflowDb>,
		owner,
	);

async function denySetAtInstanceScope() {
	const response = await ownerAgent.put('/node-type-policies/instance').send({
		rules: [{ id: 'deny-set', action: 'deny', selector: { kind: 'name', value: SET } }],
		defaultAction: 'allow',
		version: 0,
	});
	expect(response.statusCode).toBe(200);
}

const runManually = async (workflow: IWorkflowDb) =>
	await Container.get(WorkflowRunner).run({
		executionMode: 'manual',
		workflowData: workflow,
		userId: owner.id,
		triggerToStartFrom: { name: 'Manual' },
	});

const resolveChild = async (child: IWorkflowDb, parent: IWorkflowDb) => {
	const request: ResolveSubWorkflowRequest = {
		workflowId: child.id,
		executionId: '01a03900-0000-7000-8000-000000000001',
		parent: {
			executionId: '01a03900-0000-7000-8000-00000000000a',
			workflowId: parent.id,
			mode: 'manual',
			node: { id: 'call', name: 'Call', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1 },
		},
		context: { userId: owner.id },
		items: [{ json: { a: 1 } }],
	};
	return await Container.get(EngineSubWorkflowService).resolve(request);
};

beforeAll(async () => {
	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);

	await utils.initNodeTypes({
		...utils.buildDefaultNodes(),
		[SUB_WORKFLOW_TRIGGER]: { type: new ExecuteWorkflowTrigger(), sourcePath: '' },
	});
	await utils.initBinaryDataService();

	Container.get(EngineDataPlaneProxyService).registerProvider({
		startExecution,
		getExecution: vi.fn(),
		searchExecutions: vi.fn().mockResolvedValue({ items: [], nextCursor: null, total: 0 }),
		findLatestExecution: vi.fn(),
		cancelExecution: vi.fn(),
		locateResume: vi.fn(),
		resolveStep: vi.fn(),
		readApprovalCallback: vi.fn(),
	});
});

beforeEach(() => {
	startExecution.mockResolvedValue({ executionId: uuid() });
});

afterEach(async () => {
	vi.clearAllMocks();
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
		'SharedWorkflow',
		'WorkflowEntity',
	]);
	await reloadPolicySnapshot();
});

describe('a v2 workflow with a node type that an instance policy blocks', () => {
	test('a manual run is refused before the data plane gets a start request', async () => {
		const workflow = await createV2Workflow(node('Manual', MANUAL_TRIGGER));
		await denySetAtInstanceScope();

		await expect(runManually(workflow)).rejects.toThrow(
			`Node type "${SET}" is blocked by an instance policy`,
		);
		expect(startExecution).not.toHaveBeenCalled();
	});

	test('a sub-workflow resolve is refused before the engine starts the child', async () => {
		const parent = await createV2Workflow(node('Manual', MANUAL_TRIGGER));
		const child = await createV2Workflow(
			node('When Executed by Another Workflow', SUB_WORKFLOW_TRIGGER, {
				inputSource: 'passthrough',
			}),
		);
		await denySetAtInstanceScope();

		await expect(resolveChild(child, parent)).rejects.toThrow(
			`Node type "${SET}" is blocked by an instance policy`,
		);
	});
});

describe('a v2 workflow that no policy blocks', () => {
	test('a manual run reaches the data plane', async () => {
		const workflow = await createV2Workflow(node('Manual', MANUAL_TRIGGER));

		await runManually(workflow);

		expect(startExecution).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: workflow.id }),
		);
	});

	test('a sub-workflow resolve returns the child graph', async () => {
		const parent = await createV2Workflow(node('Manual', MANUAL_TRIGGER));
		const child = await createV2Workflow(
			node('When Executed by Another Workflow', SUB_WORKFLOW_TRIGGER, {
				inputSource: 'passthrough',
			}),
		);

		await expect(resolveChild(child, parent)).resolves.toEqual(
			expect.objectContaining({ workflowId: child.id }),
		);
	});
});
