import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IRun, IRunExecutionData } from 'n8n-workflow';
import { createRunExecutionData, WorkflowOperationError } from 'n8n-workflow';

import * as Helpers from '@test/helpers';

import { DirectedGraph } from '../partial-execution-utils';
import { createNodeData, toITaskData } from '../partial-execution-utils/__tests__/helpers';
import { WorkflowExecute } from '../workflow-execute';

describe('WorkflowExecute suspension', () => {
	const executionMode = 'trigger';
	const nodeTypes = Helpers.NodeTypes();

	const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
	const node1 = createNodeData({ name: 'node1' });
	const node2 = createNodeData({ name: 'node2' });

	const createWorkflow = () =>
		new DirectedGraph()
			.addNodes(trigger, node1, node2)
			.addConnections({ from: trigger, to: node1 }, { from: node1, to: node2 })
			.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

	/** Runs the workflow, requesting suspension right after `suspendAfterNode` executes. */
	const runAndSuspend = async (suspendAfterNode: string) => {
		const workflow = createWorkflow();
		const additionalData = Helpers.WorkflowExecuteAdditionalData(createDeferredPromise<IRun>());
		const workflowExecute = new WorkflowExecute(additionalData, executionMode);

		additionalData.hooks!.addHandler('nodeExecuteAfter', function (nodeName) {
			if (nodeName === suspendAfterNode) workflowExecute.suspend();
		});

		const run = await workflowExecute.run({ workflow, startNode: trigger });
		return { run, workflow };
	};

	test('suspend mid-run parks the execution as waiting with an intact stack', async () => {
		const { run } = await runAndSuspend('node1');

		expect(run.status).toBe('waiting');
		expect(run.waitTill).toBeInstanceOf(Date);
		expect(run.finished).not.toBe(true);
		expect(run.data.resumeInstruction).toBe('run-stack-head');

		// The next, not-yet-executed node is the stack head, untouched.
		const stack = run.data.executionData!.nodeExecutionStack;
		expect(stack).toHaveLength(1);
		expect(stack[0].node.name).toBe('node2');
		expect(stack[0].node.disabled).toBe(false);

		// Executed nodes keep their run data; the unexecuted node has none.
		expect(run.data.resultData.runData.node1).toHaveLength(1);
		expect(run.data.resultData.runData.node2).toBeUndefined();
	});

	test('resume executes the stack head normally and clears the instruction', async () => {
		const { run, workflow } = await runAndSuspend('node1');

		const additionalData = Helpers.WorkflowExecuteAdditionalData(createDeferredPromise<IRun>());
		const resumed = await new WorkflowExecute(
			additionalData,
			executionMode,
			run.data,
		).processRunExecutionData(workflow);

		expect(resumed.status).toBe('success');
		expect(resumed.finished).toBe(true);
		expect(resumed.data.resumeInstruction).toBeUndefined();

		// node2 ran normally: not disabled, exactly one run recorded.
		expect(node2.disabled).toBe(false);
		expect(resumed.data.resultData.runData.node2).toHaveLength(1);
		// The legacy path would have popped node1's run data; it must survive.
		expect(resumed.data.resultData.runData.node1).toHaveLength(1);
	});

	test('legacy waiting state (no resume instruction) keeps the skip-head behavior', async () => {
		const workflow = createWorkflow();
		// A Wait-node-style parked state: the executed node pushed back onto the
		// stack head, its run recorded, waitTill set, no resume instruction.
		const parked: IRunExecutionData = createRunExecutionData({
			startData: {},
			resultData: {
				runData: {
					trigger: [toITaskData([{ data: {} }])],
					node1: [toITaskData([{ data: {} }])],
				},
				lastNodeExecuted: 'node1',
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [
					{ node: { ...node1 }, data: { main: [[{ json: {} }]] }, source: null },
				],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
			waitTill: new Date(),
		});

		const additionalData = Helpers.WorkflowExecuteAdditionalData(createDeferredPromise<IRun>());
		const workflowExecute = new WorkflowExecute(additionalData, executionMode, parked);
		const resumed = await workflowExecute.processRunExecutionData(workflow);

		expect(resumed.status).toBe('success');
		// Skip-head: the pushed-back node was disabled to pass its input through,
		// and its pre-park run entry was popped.
		expect(parked.executionData!.nodeExecutionStack[0]?.node.disabled ?? true).toBe(true);
		expect(resumed.data.resultData.runData.node2).toHaveLength(1);
	});

	test('suspend after the last node yields a normal success', async () => {
		const { run } = await runAndSuspend('node2');

		expect(run.status).toBe('success');
		expect(run.finished).toBe(true);
		expect(run.waitTill).toBeUndefined();
		expect(run.data.resumeInstruction).toBeUndefined();
	});

	test('suspend before the run starts is a no-op', async () => {
		const workflow = createWorkflow();
		const additionalData = Helpers.WorkflowExecuteAdditionalData(createDeferredPromise<IRun>());
		const workflowExecute = new WorkflowExecute(additionalData, executionMode);

		workflowExecute.suspend(); // status is 'new', must not arm suspension

		const run = await workflowExecute.run({ workflow, startNode: trigger });

		expect(run.status).toBe('success');
		expect(run.data.resumeInstruction).toBeUndefined();
	});

	test('an error after suspension clears the resume markers', async () => {
		const workflow = createWorkflow();
		const additionalData = Helpers.WorkflowExecuteAdditionalData(createDeferredPromise<IRun>());
		const workflowExecute = new WorkflowExecute(additionalData, executionMode);

		// Simulate the race: suspension stamped the run data, then a cancel error
		// reaches processSuccessExecution before the waiting state is persisted.
		// @ts-expect-error private property
		workflowExecute.status = 'running';
		workflowExecute.suspend();
		// @ts-expect-error private property
		const runExecutionData: IRunExecutionData = workflowExecute.runExecutionData;
		runExecutionData.waitTill = new Date();
		runExecutionData.resumeInstruction = 'run-stack-head';

		const run = await workflowExecute.processSuccessExecution(
			new Date(),
			workflow,
			new WorkflowOperationError('Workflow execution canceled'),
		);

		expect(run.status).toBe('canceled');
		expect(run.waitTill).toBeUndefined();
		expect(run.data.waitTill).toBeUndefined();
		expect(run.data.resumeInstruction).toBeUndefined();
	});
});
