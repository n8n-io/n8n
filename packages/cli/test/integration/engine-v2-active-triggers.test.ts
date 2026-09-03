/**
 * Active trigger runs of an `engineType=v2` workflow (CAT-2921).
 *
 * The trigger node still runs control-plane-side; only the start call changes.
 * Every active trigger — the durable schedule handler and the in-memory emit
 * closures alike — hands off through `WorkflowExecutionService.runWorkflow`, so
 * these tests drive that funnel and assert what reaches the data plane.
 */

import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { UUID_V7_PATTERN } from '@n8n/constants';
import type { User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, INodeExecutionData } from 'n8n-workflow';
import { NodeConnectionTypes, SCHEDULE_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { Telemetry } from '@/telemetry';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { getAllExecutions } from './shared/db/executions';
import { createOwner } from './shared/db/users';
import { initNodeTypes, setupTestServer } from './shared/utils';

mockInstance(Telemetry);

setupTestServer({ endpointGroups: ['workflows'] });

const TRIGGER_NAME = 'Schedule Trigger';
const SET_NAME = 'Edit Fields';

const startExecution = vi.fn();
const getExecution = vi.fn();

let builder: User;

const triggerNode = (): INode => ({
	id: randomUUID(),
	name: TRIGGER_NAME,
	type: SCHEDULE_TRIGGER_NODE_TYPE,
	typeVersion: 1.2,
	position: [0, 0],
	parameters: { rule: { interval: [{ field: 'minutes' }] } },
});

const setNode = (): INode => ({
	id: randomUUID(),
	name: SET_NAME,
	type: 'n8n-nodes-base.set',
	typeVersion: 3.4,
	position: [220, 0],
	parameters: { options: {} },
});

const createV2Workflow = async () =>
	await createWorkflow(
		{
			active: false,
			nodes: [triggerNode(), setNode()],
			connections: {
				[TRIGGER_NAME]: {
					main: [[{ node: SET_NAME, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
			settings: { engineType: 'v2' },
		},
		builder,
	);

/** The hand-off every active trigger makes when it emits items. */
const handOff = async (workflow: WorkflowEntity, items: INodeExecutionData[][]) => {
	const additionalData = await WorkflowExecuteAdditionalData.getBase({
		workflowId: workflow.id,
		workflowSettings: workflow.settings,
	});

	return await Container.get(WorkflowExecutionService).runWorkflow(
		workflow,
		workflow.nodes[0],
		items,
		additionalData,
		'trigger',
	);
};

beforeAll(async () => {
	await initNodeTypes();
	Container.get(EngineDataPlaneProxyService).registerProvider({ startExecution, getExecution });
});

beforeEach(async () => {
	await testDb.truncate(['ExecutionEntity', 'SharedWorkflow', 'WorkflowEntity']);
	vi.clearAllMocks();

	// Deliberately not the id the control plane minted, so a caller echoing the
	// data plane back would fail the assertion below.
	startExecution.mockResolvedValue({ executionId: 'a3c1e0f2-0000-4000-8000-000000000001' });

	builder = await createOwner();
});

describe('active trigger runs on engine 2.0', () => {
	test('hands the trigger payload to the data plane and persists no execution', async () => {
		const workflow = await createV2Workflow();
		const item = { json: { 'Readable date': 'September 3, 2026' } };

		const executionId = await handOff(workflow, [[item]]);

		expect(executionId).toMatch(UUID_V7_PATTERN);

		expect(startExecution).toHaveBeenCalledTimes(1);
		const request = startExecution.mock.calls[0][0];
		expect(request.executionId).toBe(executionId);
		expect(request.workflowId).toBe(workflow.id);
		// An active trigger run is never a manual run.
		expect(request.mode).toBe('production');
		// The trigger node's own output, not a placeholder.
		expect(request.triggerOutputs[0][0].json).toMatchObject(item.json);
		// The graph is rooted at the trigger node, which becomes the trigger step.
		expect(request.graph.nodes).toEqual([
			expect.objectContaining({ name: TRIGGER_NAME, type: 'trigger' }),
			expect.objectContaining({ name: SET_NAME, type: 'v1-node' }),
		]);

		// The data plane is the only store for a v2 run.
		const executions = await getAllExecutions();
		expect(executions.filter((e) => e.workflowId === workflow.id)).toHaveLength(0);
	});

	test('keeps a workflow that did not opt in on the control plane', async () => {
		const workflow = await createV2Workflow();
		workflow.settings = {};

		await handOff(workflow, [[{ json: {} }]]);

		expect(startExecution).not.toHaveBeenCalled();
	});
});
