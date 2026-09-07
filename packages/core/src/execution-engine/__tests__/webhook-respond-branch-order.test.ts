// Documents branch execution order around the Respond to Webhook node, for
// CAT-4050 / GitHub issue #36175.
//
// These tests describe behaviour that already exists and pass on master. They pin
// the ordering rule that produces the reported problem. They are not a regression
// guard for the response handling fixed in `packages/cli`, which has its own tests.
//
// A webhook trigger in `responseMode: responseNode` fans out to two children: the
// work branch, and a shared Respond to Webhook node. With `executionOrder: v1` the
// engine runs the top-most child first, so the y coordinate of the Respond node
// relative to the work branch decides whether the caller is acknowledged
// immediately or only after the work finishes.
//
//   Respond above the work node        Respond below the work node
//   (y = 0 vs y = 500)                 (y = 1000 vs y = 500)
//
//        Trigger                            Trigger
//        /     \                            /     \
//   Respond    Work                     Work     Respond
//   (1st)      (2nd)                    (1st)     (2nd)
//
// When the work node runs first and fails, the Respond node never executes, so the
// execution ends without producing a response. What the HTTP caller receives in
// that case is decided in `packages/cli`, not here.

import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IExecuteFunctions, INodeTypeData, INodeTypeDescription, IRun } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, Workflow } from 'n8n-workflow';

import * as Helpers from '@test/helpers';

import { WorkflowExecute } from '../workflow-execute';

const RESPOND_NODE = 'Respond to Webhook';
const WORK_NODE = 'Agent';
const TRIGGER_NODE = 'Webhook';

/** Records the order in which nodes ran, so a test can assert on it. */
let executed: string[] = [];
/** Set by a test to make the work node fail, as a flaky model call would. */
let workNodeFails = false;

const passThrough: INodeTypeDescription = {
	displayName: 'Test Node',
	name: 'testNode',
	group: ['transform'],
	version: 1,
	description: '',
	defaults: { name: 'Test Node' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [],
};

const nodeTypeData: INodeTypeData = {
	testTrigger: {
		sourcePath: '',
		type: {
			description: { ...passThrough, name: 'trigger', inputs: [] },
			async execute(this: IExecuteFunctions) {
				executed.push(this.getNode().name);
				return [[{ json: { body: { jobId: 'job-1' } } }]];
			},
		},
	},
	testWork: {
		sourcePath: '',
		type: {
			description: { ...passThrough, name: 'work' },
			async execute(this: IExecuteFunctions) {
				executed.push(this.getNode().name);
				if (workNodeFails) {
					throw new NodeOperationError(this.getNode(), 'Model call failed');
				}
				return [this.getInputData()];
			},
		},
	},
	testRespond: {
		sourcePath: '',
		type: {
			description: { ...passThrough, name: 'respond' },
			async execute(this: IExecuteFunctions) {
				executed.push(this.getNode().name);
				return [this.getInputData()];
			},
		},
	},
};

/**
 * Builds the two-child fan-out. Only the Respond node's y coordinate differs
 * between the two cases; every other property is identical.
 */
function buildWorkflow(respondY: number) {
	const nodeTypes = Helpers.NodeTypes(nodeTypeData);

	return new Workflow({
		id: 'repro',
		active: false,
		nodeTypes,
		settings: { executionOrder: 'v1' },
		nodes: [
			{
				id: '1',
				name: TRIGGER_NODE,
				type: 'testTrigger',
				typeVersion: 1,
				position: [0, 500],
				parameters: {},
			},
			{
				id: '2',
				name: WORK_NODE,
				type: 'testWork',
				typeVersion: 1,
				position: [300, 500],
				parameters: {},
			},
			{
				id: '3',
				name: RESPOND_NODE,
				type: 'testRespond',
				typeVersion: 1,
				position: [300, respondY],
				parameters: {},
			},
		],
		connections: {
			[TRIGGER_NODE]: {
				main: [
					[
						{ node: WORK_NODE, type: NodeConnectionTypes.Main, index: 0 },
						{ node: RESPOND_NODE, type: NodeConnectionTypes.Main, index: 0 },
					],
				],
			},
		},
	});
}

async function runWorkflow(respondY: number) {
	const workflow = buildWorkflow(respondY);
	const waitPromise = createDeferredPromise<IRun>();
	const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
	const workflowExecute = new WorkflowExecute(additionalData, 'webhook');

	await workflowExecute.run({ workflow, startNode: workflow.getNode(TRIGGER_NODE)! });

	return await waitPromise.promise;
}

beforeEach(() => {
	executed = [];
	workNodeFails = false;
});

describe('webhook responseNode branch ordering', () => {
	// The connection list is identical in both cases; only the canvas y differs.
	test('runs the Respond node first when it sits above the work node', async () => {
		await runWorkflow(0);

		expect(executed).toEqual([TRIGGER_NODE, RESPOND_NODE, WORK_NODE]);
	});

	test('runs the work node first when the Respond node sits below it', async () => {
		await runWorkflow(1000);

		expect(executed).toEqual([TRIGGER_NODE, WORK_NODE, RESPOND_NODE]);
	});

	test('skips the Respond node when the work node runs first and fails', async () => {
		workNodeFails = true;

		const result = await runWorkflow(1000);

		expect(executed).toEqual([TRIGGER_NODE, WORK_NODE]);
		expect(result.data.resultData.error).toBeDefined();
		// No response was sent, so the caller receives the node error.
		expect(result.data.resultData.runData[RESPOND_NODE]).toBeUndefined();
	});

	test('still runs the Respond node when it precedes a failing work node', async () => {
		workNodeFails = true;

		const result = await runWorkflow(0);

		expect(executed).toEqual([TRIGGER_NODE, RESPOND_NODE, WORK_NODE]);
		expect(result.data.resultData.error).toBeDefined();
		// The caller already received its response, so the failure is invisible.
		expect(result.data.resultData.runData[RESPOND_NODE]).toBeDefined();
	});
});

describe('the reported workflow layout', () => {
	// Canvas y coordinates taken from the attached export. The single shared
	// Respond to Webhook node is at y = 736.
	const SHARED_RESPOND_Y = 736;
	const branches = [
		{ trigger: 'Webhook Gemini', agentY: -240, respondsFirst: false },
		{ trigger: 'Webhook Chat GPT', agentY: 368, respondsFirst: false },
		{ trigger: 'Claude Webhook', agentY: 992, respondsFirst: true },
		{ trigger: 'Free Models Webhook', agentY: 1712, respondsFirst: true },
	];

	test.each(branches)(
		'$trigger acknowledges before its agent: $respondsFirst',
		async ({ agentY, respondsFirst }) => {
			// Reuse the two-node fan-out with the agent fixed at y = 500 by
			// expressing the reported layout relative to the shared Respond node.
			const respondY = 500 + (SHARED_RESPOND_Y - agentY);

			await runWorkflow(respondY);

			expect(executed[1]).toBe(respondsFirst ? RESPOND_NODE : WORK_NODE);
		},
	);
});
