// Disable task runners until we have fixed the "run test workflows" test
// to mock the Code Node execution
process.env.N8N_RUNNERS_ENABLED = 'false';

// NOTE: Diagrams in this file have been created with https://asciiflow.com/#/
// If you update the tests, please update the diagrams as well.
// If you add a test, please create a new diagram.
//
// Map
// 0  means the output has no run data
// 1  means the output has run data
// ►► denotes the node that the user wants to execute to
// XX denotes that the node is disabled
// DR denotes that the node is dirty
// PD denotes that the node has pinned data

import { mock } from 'jest-mock-extended';
import pick from 'lodash/pick';
import type {
	ExecutionBaseError,
	IConnection,
	IExecuteData,
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypes,
	IPinData,
	IRun,
	IRunData,
	IRunExecutionData,
	ITriggerResponse,
	IWorkflowExecuteAdditionalData,
	WorkflowTestData,
	RelatedExecution,
	IExecuteFunctions,
	IDataObject,
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	NodeApiError,
	NodeConnectionTypes,
	NodeHelpers,
	NodeOperationError,
	Workflow,
} from 'n8n-workflow';
import assert from 'node:assert';

import * as Helpers from '@test/helpers';
import { legacyWorkflowExecuteTests, v1WorkflowExecuteTests } from '@test/helpers/constants';

import type { ExecutionLifecycleHooks } from '../execution-lifecycle-hooks';
import { DirectedGraph } from '../partial-execution-utils';
import * as partialExecutionUtils from '../partial-execution-utils';
import { createNodeData, toITaskData } from '../partial-execution-utils/__tests__/helpers';
import { WorkflowExecute } from '../workflow-execute';

const nodeTypes = Helpers.NodeTypes();

beforeEach(() => {
	jest.resetAllMocks();
});

describe('WorkflowExecute', () => {
	describe('v0 execution order', () => {
		const tests: WorkflowTestData[] = legacyWorkflowExecuteTests;

		const executionMode = 'manual';

		for (const testData of tests) {
			test(testData.description, async () => {
				const workflowInstance = new Workflow({
					id: 'test',
					nodes: testData.input.workflowData.nodes,
					connections: testData.input.workflowData.connections,
					active: false,
					nodeTypes,
					settings: {
						executionOrder: 'v0',
					},
				});

				const waitPromise = createDeferredPromise<IRun>();
				const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance);

				const result = await waitPromise.promise;

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				expect(executionData).toEqual(result);

				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new ApplicationError('Data for node is missing', { extra: { nodeName } });
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
						if (nodeData.data === undefined) {
							return null;
						}
						return nodeData.data.main[0]!.map((entry) => entry.json);
					});

					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Check if the nodes did execute in the correct order
				const nodeExecutionOrder: string[] = [];
				Object.entries(result.data.resultData.runData).forEach(([nodeName, taskDataArr]) => {
					taskDataArr.forEach((taskData) => {
						nodeExecutionOrder[taskData.executionIndex] = nodeName;
					});
				});
				expect(nodeExecutionOrder).toEqual(testData.output.nodeExecutionOrder);

				// Check if other data has correct value
				expect(result.finished).toEqual(true);
				expect(result.data.executionData!.contextData).toEqual({});
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
			});
		}
	});

	describe('v1 execution order', () => {
		const tests: WorkflowTestData[] = v1WorkflowExecuteTests;

		const executionMode = 'manual';
		const nodeTypes = Helpers.NodeTypes();

		for (const testData of tests) {
			test(testData.description, async () => {
				const workflowInstance = new Workflow({
					id: 'test',
					nodes: testData.input.workflowData.nodes,
					connections: testData.input.workflowData.connections,
					active: false,
					nodeTypes,
					settings: {
						executionOrder: 'v1',
					},
				});

				const waitPromise = createDeferredPromise<IRun>();
				const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance);

				const result = await waitPromise.promise;

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				expect(executionData).toEqual(result);

				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new ApplicationError('Data for node is missing', { extra: { nodeName } });
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
						if (nodeData.data === undefined) {
							return null;
						}
						const toMap = testData.output.testAllOutputs
							? nodeData.data.main
							: [nodeData.data.main[0]!];
						return toMap.map((data) => data!.map((entry) => entry.json));
					});

					// expect(resultData).toEqual(testData.output.nodeData[nodeName]);
					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Check if the nodes did execute in the correct order
				const nodeExecutionOrder: string[] = [];
				Object.entries(result.data.resultData.runData).forEach(([nodeName, taskDataArr]) => {
					taskDataArr.forEach((taskData) => {
						nodeExecutionOrder[taskData.executionIndex] = nodeName;
					});
				});
				expect(nodeExecutionOrder).toEqual(testData.output.nodeExecutionOrder);

				// Check if other data has correct value
				expect(result.finished).toEqual(true);
				expect(result.data.executionData!.contextData).toEqual({});
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
			});
		}
	});

	describe('v0 hook order', () => {
		const executionMode = 'manual';
		const executionOrder = 'v0';
		const nodeTypes = Helpers.NodeTypes();

		test("don't run hooks for siblings of the destination node", async () => {
			// ARRANGE
			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const node1 = createNodeData({ name: 'node1' });
			const node2 = createNodeData({ name: 'node2' });
			const workflowInstance = new DirectedGraph()
				.addNodes(trigger, node1, node2)
				.addConnections({ from: trigger, to: node1 }, { from: trigger, to: node2 })
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder } });

			const additionalData = Helpers.WorkflowExecuteAdditionalData(createDeferredPromise<IRun>());
			const runHookSpy = jest.spyOn(additionalData.hooks!, 'runHook');

			const workflowExecute = new WorkflowExecute(additionalData, executionMode);

			// ACT
			await workflowExecute.run(workflowInstance, trigger, 'node1');

			// ASSERT
			const workflowHooks = runHookSpy.mock.calls.filter(
				(call) => call[0] === 'workflowExecuteBefore' || call[0] === 'workflowExecuteAfter',
			);
			const nodeHooks = runHookSpy.mock.calls.filter(
				(call) => call[0] === 'nodeExecuteBefore' || call[0] === 'nodeExecuteAfter',
			);

			expect(workflowHooks.map((hook) => hook[0])).toEqual([
				'workflowExecuteBefore',
				'workflowExecuteAfter',
			]);

			expect(nodeHooks.map((hook) => ({ name: hook[0], node: hook[1][0] }))).toEqual([
				{ name: 'nodeExecuteBefore', node: 'trigger' },
				{ name: 'nodeExecuteAfter', node: 'trigger' },
				{ name: 'nodeExecuteBefore', node: 'node1' },
				{ name: 'nodeExecuteAfter', node: 'node1' },
			]);
		});

		test("don't run hooks if a node does not have input data", async () => {
			// ARRANGE
			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const workflowInstance = new DirectedGraph()
				.addNodes(trigger)
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder } });

			const additionalData = Helpers.WorkflowExecuteAdditionalData(createDeferredPromise<IRun>());
			const runHookSpy = jest.spyOn(additionalData.hooks!, 'runHook');

			const workflowExecute = new WorkflowExecute(additionalData, executionMode);
			jest.spyOn(workflowExecute, 'ensureInputData').mockReturnValue(false);

			// ACT
			await workflowExecute.run(workflowInstance, trigger);

			// ASSERT
			const workflowHooks = runHookSpy.mock.calls.filter(
				(call) => call[0] === 'workflowExecuteBefore' || call[0] === 'workflowExecuteAfter',
			);
			const nodeHooks = runHookSpy.mock.calls.filter(
				(call) => call[0] === 'nodeExecuteBefore' || call[0] === 'nodeExecuteAfter',
			);

			expect(workflowHooks.map((hook) => hook[0])).toEqual([
				'workflowExecuteBefore',
				'workflowExecuteAfter',
			]);

			expect(nodeHooks).toHaveLength(0);
		});
	});

	describe('v1 hook order', () => {
		const executionMode = 'manual';
		const executionOrder = 'v1';
		const nodeTypes = Helpers.NodeTypes();

		test("don't run hooks for siblings of the destination node", async () => {
			// ARRANGE
			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const node1 = createNodeData({ name: 'node1' });
			const node2 = createNodeData({ name: 'node2' });
			const workflowInstance = new DirectedGraph()
				.addNodes(trigger, node1, node2)
				.addConnections({ from: trigger, to: node1 }, { from: trigger, to: node2 })
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder } });

			const additionalData = Helpers.WorkflowExecuteAdditionalData(createDeferredPromise<IRun>());
			const runHookSpy = jest.spyOn(additionalData.hooks!, 'runHook');

			const workflowExecute = new WorkflowExecute(additionalData, executionMode);

			// ACT
			await workflowExecute.run(workflowInstance, trigger, 'node1');

			// ASSERT
			const workflowHooks = runHookSpy.mock.calls.filter(
				(call) => call[0] === 'workflowExecuteBefore' || call[0] === 'workflowExecuteAfter',
			);
			const nodeHooks = runHookSpy.mock.calls.filter(
				(call) => call[0] === 'nodeExecuteBefore' || call[0] === 'nodeExecuteAfter',
			);

			expect(workflowHooks.map((hook) => hook[0])).toEqual([
				'workflowExecuteBefore',
				'workflowExecuteAfter',
			]);

			expect(nodeHooks.map((hook) => ({ name: hook[0], node: hook[1][0] }))).toEqual([
				{ name: 'nodeExecuteBefore', node: 'trigger' },
				{ name: 'nodeExecuteAfter', node: 'trigger' },
				{ name: 'nodeExecuteBefore', node: 'node1' },
				{ name: 'nodeExecuteAfter', node: 'node1' },
			]);
		});

		test("don't run hooks if a node does not have input data", async () => {
			// ARRANGE
			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const workflowInstance = new DirectedGraph()
				.addNodes(trigger)
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder } });

			const additionalData = Helpers.WorkflowExecuteAdditionalData(createDeferredPromise<IRun>());
			const runHookSpy = jest.spyOn(additionalData.hooks!, 'runHook');

			const workflowExecute = new WorkflowExecute(additionalData, executionMode);
			jest.spyOn(workflowExecute, 'ensureInputData').mockReturnValue(false);

			// ACT
			await workflowExecute.run(workflowInstance, trigger);

			// ASSERT
			const workflowHooks = runHookSpy.mock.calls.filter(
				(call) => call[0] === 'workflowExecuteBefore' || call[0] === 'workflowExecuteAfter',
			);
			const nodeHooks = runHookSpy.mock.calls.filter(
				(call) => call[0] === 'nodeExecuteBefore' || call[0] === 'nodeExecuteAfter',
			);

			expect(workflowHooks.map((hook) => hook[0])).toEqual([
				'workflowExecuteBefore',
				'workflowExecuteAfter',
			]);

			expect(nodeHooks).toHaveLength(0);
		});
	});

	//run tests on json files from specified directory, default 'workflows'
	//workflows must have pinned data that would be used to test output after execution
	describe('run test workflows', () => {
		const tests: WorkflowTestData[] = Helpers.workflowToTests(__dirname);

		const executionMode = 'manual';
		const nodeTypes = Helpers.NodeTypes(Helpers.getNodeTypes(tests));

		for (const testData of tests) {
			test(testData.description, async () => {
				const workflowInstance = new Workflow({
					id: 'test',
					nodes: testData.input.workflowData.nodes,
					connections: testData.input.workflowData.connections,
					active: false,
					nodeTypes,
					settings: testData.input.workflowData.settings,
				});

				const waitPromise = createDeferredPromise<IRun>();
				const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);

				const workflowExecute = new WorkflowExecute(additionalData, executionMode);

				const executionData = await workflowExecute.run(workflowInstance);

				const result = await waitPromise.promise;

				// Check if the data from WorkflowExecute is identical to data received
				// by the webhooks
				expect(executionData).toEqual(result);

				// Check if the output data of the nodes is correct
				for (const nodeName of Object.keys(testData.output.nodeData)) {
					if (result.data.resultData.runData[nodeName] === undefined) {
						throw new ApplicationError('Data for node is missing', { extra: { nodeName } });
					}

					const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
						if (nodeData.data === undefined) {
							return null;
						}
						return nodeData.data.main[0]!.map((entry) => {
							// remove pairedItem from entry if it is an error output test
							if (testData.description.includes('error_outputs')) delete entry.pairedItem;
							return entry;
						});
					});

					expect(resultData).toEqual(testData.output.nodeData[nodeName]);
				}

				// Check if other data has correct value
				expect(result.finished).toEqual(true);
				// expect(result.data.executionData!.contextData).toEqual({}); //Fails when test workflow Includes splitInbatches
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
			});
		}
	});

	describe('runPartialWorkflow2', () => {
		//                Dirty         ►
		// ┌───────┐1     ┌─────┐1     ┌─────┐
		// │trigger├──────►node1├──────►node2│
		// └───────┘      └─────┘      └─────┘
		test("deletes dirty nodes' run data", async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const node1 = createNodeData({ name: 'node1' });
			const node2 = createNodeData({ name: 'node2' });
			const workflow = new DirectedGraph()
				.addNodes(trigger, node1, node2)
				.addConnections({ from: trigger, to: node1 }, { from: node1, to: node2 })
				.toWorkflow({ name: '', active: false, nodeTypes });
			const pinData: IPinData = {};
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { name: trigger.name } }])],
				[node1.name]: [toITaskData([{ data: { name: node1.name } }])],
				[node2.name]: [toITaskData([{ data: { name: node2.name } }])],
			};
			const dirtyNodeNames = [node1.name];
			const destinationNode = node2.name;

			jest.spyOn(workflowExecute, 'processRunExecutionData').mockImplementationOnce(jest.fn());

			// ACT
			await workflowExecute.runPartialWorkflow2(
				workflow,
				runData,
				pinData,
				dirtyNodeNames,
				destinationNode,
			);

			// ASSERT
			const fullRunData = workflowExecute.getFullRunData(new Date());
			expect(fullRunData.data.resultData.runData).toHaveProperty(trigger.name);
			expect(fullRunData.data.resultData.runData).not.toHaveProperty(node1.name);
		});

		//
		// ┌───────┐1  ┌────┐1
		// │trigger├───►set1├─┐ ┌─────┐    ►►
		// └───────┘   └────┘ └─►     │1  ┌───────────┐
		//              DR      │merge├───►destination│
		//             ┌────┐1┌─►     │   └───────────┘
		//             │set2├─┘ └─────┘
		//             └────┘
		test('deletes run data of children of dirty nodes as well', async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');
			jest.spyOn(workflowExecute, 'processRunExecutionData').mockImplementationOnce(jest.fn());

			const recreateNodeExecutionStackSpy = jest.spyOn(
				partialExecutionUtils,
				'recreateNodeExecutionStack',
			);

			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const set1 = createNodeData({ name: 'set1' });
			const set2 = createNodeData({ name: 'set2' });
			const merge = createNodeData({ name: 'merge' });
			const destination = createNodeData({ name: 'destination' });
			const workflow = new DirectedGraph()
				.addNodes(trigger, set1, set2, merge, destination)
				.addConnections(
					{ from: trigger, to: set1 },
					{ from: trigger, to: set2 },
					{ from: set1, to: merge, inputIndex: 0 },
					{ from: set2, to: merge, inputIndex: 1 },
					{ from: merge, to: destination },
				)
				.toWorkflow({ name: '', active: false, nodeTypes });
			const pinData: IPinData = {};
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { node: 'trigger' } }])],
				[set1.name]: [toITaskData([{ data: { node: 'set1' } }])],
				[set2.name]: [toITaskData([{ data: { node: 'set2' } }])],
				[merge.name]: [toITaskData([{ data: { node: 'merge' } }])],
				[destination.name]: [toITaskData([{ data: { node: 'destination' } }])],
			};
			const dirtyNodeNames = [set2.name];
			const destinationNode = destination.name;

			// ACT
			await workflowExecute.runPartialWorkflow2(
				workflow,
				runData,
				pinData,
				dirtyNodeNames,
				destinationNode,
			);

			// ASSERT
			expect(recreateNodeExecutionStackSpy).toHaveBeenCalledTimes(1);
			expect(recreateNodeExecutionStackSpy).toHaveBeenCalledWith(
				expect.any(DirectedGraph),
				new Set([merge, set2]),
				pick(runData, [trigger.name, set1.name]),
				pinData,
			);
		});

		//                 XX           ►►
		// ┌───────┐1     ┌─────┐1     ┌─────┐
		// │trigger├──────►node1├──────►node2│
		// └───────┘      └─────┘      └─────┘
		test('removes disabled nodes from the runNodeFilter, but not the graph', async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const node1 = createNodeData({ name: 'node1', disabled: true });
			const node2 = createNodeData({ name: 'node2' });
			const workflow = new DirectedGraph()
				.addNodes(trigger, node1, node2)
				.addConnections({ from: trigger, to: node1 }, { from: node1, to: node2 })
				.toWorkflow({ name: '', active: false, nodeTypes });
			const pinData: IPinData = {};
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { name: trigger.name } }])],
				[node1.name]: [toITaskData([{ data: { name: node1.name } }])],
				[node2.name]: [toITaskData([{ data: { name: node2.name } }])],
			};
			const dirtyNodeNames: string[] = [];
			const destinationNode = node2.name;

			const processRunExecutionDataSpy = jest
				.spyOn(workflowExecute, 'processRunExecutionData')
				.mockImplementationOnce(jest.fn());

			// ACT
			await workflowExecute.runPartialWorkflow2(
				workflow,
				runData,
				pinData,
				dirtyNodeNames,
				destinationNode,
			);

			// ASSERT
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const runNodeFilter: string[] = (workflowExecute as any).runExecutionData.startData
				?.runNodeFilter;
			expect(runNodeFilter).toContain(trigger.name);
			expect(runNodeFilter).toContain(node2.name);
			expect(runNodeFilter).not.toContain(node1.name);
			expect(processRunExecutionDataSpy).toHaveBeenCalledTimes(1);
			const nodes = Object.keys(processRunExecutionDataSpy.mock.calls[0][0].nodes);
			expect(nodes).toContain(trigger.name);
			expect(nodes).toContain(node2.name);
			expect(nodes).toContain(node1.name);
		});

		//                             ►►
		//                ┌────┐0     ┌─────────┐
		// ┌───────┐1     │    ├──────►afterLoop│
		// │trigger├───┬──►loop│1     └─────────┘
		// └───────┘   │  │    ├─┐
		//             │  └────┘ │
		//             │         │ ┌──────┐1
		//             │         └─►inLoop├─┐
		//             │           └──────┘ │
		//             └────────────────────┘
		test('passes filtered run data to `recreateNodeExecutionStack`', async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const loop = createNodeData({ name: 'loop', type: 'n8n-nodes-base.splitInBatches' });
			const inLoop = createNodeData({ name: 'inLoop' });
			const afterLoop = createNodeData({ name: 'afterLoop' });
			const workflow = new DirectedGraph()
				.addNodes(trigger, loop, inLoop, afterLoop)
				.addConnections(
					{ from: trigger, to: loop },
					{ from: loop, to: afterLoop },
					{ from: loop, to: inLoop, outputIndex: 1 },
					{ from: inLoop, to: loop },
				)
				.toWorkflow({ name: '', active: false, nodeTypes });

			const pinData: IPinData = {};
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
				[loop.name]: [toITaskData([{ data: { nodeName: loop.name }, outputIndex: 1 }])],
				[inLoop.name]: [toITaskData([{ data: { nodeName: inLoop.name } }])],
			};
			const dirtyNodeNames: string[] = [];

			jest.spyOn(workflowExecute, 'processRunExecutionData').mockImplementationOnce(jest.fn());
			const recreateNodeExecutionStackSpy = jest.spyOn(
				partialExecutionUtils,
				'recreateNodeExecutionStack',
			);

			// ACT
			await workflowExecute.runPartialWorkflow2(
				workflow,
				runData,
				pinData,
				dirtyNodeNames,
				afterLoop.name,
			);

			// ASSERT
			expect(recreateNodeExecutionStackSpy).toHaveBeenNthCalledWith(
				1,
				expect.any(DirectedGraph),
				expect.any(Set),
				// The run data should only contain the trigger node because the loop
				// node has no data on the done branch. That means we have to rerun the
				// whole loop, because we don't know how many iterations would be left.
				pick(runData, trigger.name),
				expect.any(Object),
			);
		});

		// ┌───────┐    ┌─────┐
		// │trigger├┬──►│node1│
		// └───────┘│   └─────┘
		//          │   ┌─────┐
		//          └──►│node2│
		//              └─────┘
		test('passes subgraph to `cleanRunData`', async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const node1 = createNodeData({ name: 'node1' });
			const node2 = createNodeData({ name: 'node2' });
			const workflow = new DirectedGraph()
				.addNodes(trigger, node1, node2)
				.addConnections({ from: trigger, to: node1 }, { from: trigger, to: node2 })
				.toWorkflow({ name: '', active: false, nodeTypes });

			const pinData: IPinData = {};
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
				[node1.name]: [toITaskData([{ data: { nodeName: node1.name } }])],
				[node2.name]: [toITaskData([{ data: { nodeName: node2.name } }])],
			};
			const dirtyNodeNames: string[] = [];

			jest.spyOn(workflowExecute, 'processRunExecutionData').mockImplementationOnce(jest.fn());
			const cleanRunDataSpy = jest.spyOn(partialExecutionUtils, 'cleanRunData');

			// ACT
			await workflowExecute.runPartialWorkflow2(
				workflow,
				runData,
				pinData,
				dirtyNodeNames,
				node1.name,
			);

			// ASSERT
			const subgraph = new DirectedGraph()
				.addNodes(trigger, node1)
				.addConnections({ from: trigger, to: node1 });
			expect(cleanRunDataSpy).toHaveBeenCalledTimes(2);
			expect(cleanRunDataSpy).toHaveBeenNthCalledWith(
				1,
				runData,
				subgraph,
				// first call with the dirty nodes, which are an empty set in this case
				new Set(),
			);
			expect(cleanRunDataSpy).toHaveBeenNthCalledWith(
				2,
				pick(runData, [trigger.name, node1.name]),
				subgraph,
				// second call with start nodes, which is the destination node in this
				// case
				new Set([node1]),
			);
		});

		//  DR          ►►              DR
		// ┌───────┐   ┌───────────┐   ┌─────────┐
		// │trigger├───►destination├───►dirtyNode│
		// └───────┘   └───────────┘   └─────────┘
		test('passes pruned dirty nodes to `cleanRunData`', async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const destination = createNodeData({ name: 'destination' });
			const dirtyNode = createNodeData({ name: 'dirtyNode' });
			const workflow = new DirectedGraph()
				.addNodes(trigger, destination, dirtyNode)
				.addConnections({ from: trigger, to: destination }, { from: destination, to: dirtyNode })
				.toWorkflow({ name: '', active: false, nodeTypes });

			const pinData: IPinData = {};
			const runData: IRunData = {};
			const dirtyNodeNames: string[] = [trigger.name, dirtyNode.name];

			jest.spyOn(workflowExecute, 'processRunExecutionData').mockImplementationOnce(jest.fn());
			const cleanRunDataSpy = jest.spyOn(partialExecutionUtils, 'cleanRunData');

			// ACT
			await workflowExecute.runPartialWorkflow2(
				workflow,
				runData,
				pinData,
				dirtyNodeNames,
				destination.name,
			);

			// ASSERT
			const subgraph = new DirectedGraph()
				.addNodes(trigger, destination)
				.addConnections({ from: trigger, to: destination });
			expect(cleanRunDataSpy).toHaveBeenCalledTimes(2);
			expect(cleanRunDataSpy).toHaveBeenNthCalledWith(
				1,
				runData,
				subgraph,
				// first call with the dirty nodes, which are an empty set in this case
				new Set([trigger]),
			);
		});

		//                 ►►
		//                ┌──────┐
		//                │orphan│
		//                └──────┘
		//  ┌───────┐     ┌───────────┐
		//  │trigger├────►│destination│
		//  └───────┘     └───────────┘
		test('works with a single node', async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			const trigger = createNodeData({ name: 'trigger' });
			const destination = createNodeData({ name: 'destination' });
			const orphan = createNodeData({ name: 'orphan' });

			const workflow = new DirectedGraph()
				.addNodes(trigger, destination, orphan)
				.addConnections({ from: trigger, to: destination })
				.toWorkflow({ name: '', active: false, nodeTypes });

			const pinData: IPinData = {};
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
				[destination.name]: [toITaskData([{ data: { nodeName: destination.name } }])],
			};
			const dirtyNodeNames: string[] = [];

			const processRunExecutionDataSpy = jest
				.spyOn(workflowExecute, 'processRunExecutionData')
				.mockImplementationOnce(jest.fn());

			// ACT
			await workflowExecute.runPartialWorkflow2(
				workflow,
				runData,
				pinData,
				dirtyNodeNames,
				orphan.name,
			);

			// ASSERT
			expect(processRunExecutionDataSpy).toHaveBeenCalledTimes(1);
			expect(processRunExecutionDataSpy).toHaveBeenCalledWith(
				new DirectedGraph().addNode(orphan).toWorkflow({ ...workflow }),
			);
		});

		//  ┌───────┐     ┌───────────┐
		//  │trigger├────►│agentNode  │
		//  └───────┘     └───────────┘
		//                       │ ┌──────┐
		//                       └─│ Tool │
		//                         └──────┘
		it('rewires graph for partial execution of tools', async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');
			const nodeTypes = Helpers.NodeTypes();

			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const tool = createNodeData({ name: 'tool', type: 'n8n-nodes-base.toolTest' });
			const agentNode = createNodeData({ name: 'agent' });

			const workflow = new DirectedGraph()
				.addNodes(trigger, tool, agentNode)
				.addConnections(
					{ from: trigger, to: agentNode },
					{ from: tool, to: agentNode, type: NodeConnectionTypes.AiTool },
				)
				.toWorkflow({ name: '', active: false, nodeTypes });
			const pinData: IPinData = {};
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { value: 1 } }])],
			};
			const dirtyNodeNames: string[] = [];

			const processRunExecutionDataSpy = jest
				.spyOn(workflowExecute, 'processRunExecutionData')
				.mockImplementationOnce(jest.fn());

			const expectedToolExecutor: INode = {
				name: 'PartialExecutionToolExecutor',
				disabled: false,
				type: '@n8n/n8n-nodes-langchain.toolExecutor',
				parameters: {
					query: {},
					toolName: '',
				},
				id: agentNode.id,
				typeVersion: 0,
				position: [0, 0],
			};

			const expectedTool = {
				...tool,
				rewireOutputLogTo: NodeConnectionTypes.AiTool,
			};

			const expectedGraph = new DirectedGraph()
				.addNodes(trigger, expectedToolExecutor, expectedTool)
				.addConnections({ from: trigger, to: expectedToolExecutor })
				.addConnections({
					from: expectedTool,
					to: expectedToolExecutor,
					type: NodeConnectionTypes.AiTool,
				})
				.toWorkflow({ ...workflow });

			// ACT
			await workflowExecute.runPartialWorkflow2(
				workflow,
				runData,
				pinData,
				dirtyNodeNames,
				tool.name,
			);

			// ASSERT
			expect(processRunExecutionDataSpy).toHaveBeenCalledTimes(1);
			expect(processRunExecutionDataSpy).toHaveBeenCalledWith(expectedGraph);
		});

		//                             ►►
		// ┌───────┐1     ┌─────┐1     ┌─────┐
		// │trigger├──────►node1├──────►node2│
		// └───────┘      └─────┘      └─────┘
		test('increments partial execution index starting with max index of previous runs', async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			additionalData.hooks = mock<ExecutionLifecycleHooks>();
			jest.spyOn(additionalData.hooks, 'runHook');

			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const node1 = createNodeData({ name: 'node1' });
			const node2 = createNodeData({ name: 'node2' });
			const workflow = new DirectedGraph()
				.addNodes(trigger, node1, node2)
				.addConnections({ from: trigger, to: node1 }, { from: node1, to: node2 })
				.toWorkflow({ name: '', active: false, nodeTypes });
			const pinData: IPinData = {};
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { name: trigger.name } }], { executionIndex: 0 })],
				[node1.name]: [
					toITaskData([{ data: { name: node1.name } }], { executionIndex: 3 }),
					toITaskData([{ data: { name: node1.name } }], { executionIndex: 4 }),
				],
				[node2.name]: [toITaskData([{ data: { name: node2.name } }], { executionIndex: 2 })],
			};
			const dirtyNodeNames: string[] = [];
			const destinationNode = node2.name;

			const processRunExecutionDataSpy = jest.spyOn(workflowExecute, 'processRunExecutionData');

			// ACT
			await workflowExecute.runPartialWorkflow2(
				workflow,
				runData,
				pinData,
				dirtyNodeNames,
				destinationNode,
			);

			// ASSERT
			expect(processRunExecutionDataSpy).toHaveBeenCalledTimes(1);
			expect(additionalData.hooks?.runHook).toHaveBeenCalledWith('nodeExecuteBefore', [
				node2.name,
				expect.objectContaining({ executionIndex: 5 }),
			]);
		});

		//                ►►
		// ┌───────┐1     ┌─────┐1
		// │trigger├──────►node1|
		// └───────┘      └─────┘
		test('increments partial execution index starting with max index of 0 of previous runs', async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			additionalData.hooks = mock<ExecutionLifecycleHooks>();
			jest.spyOn(additionalData.hooks, 'runHook');

			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			const trigger = createNodeData({ name: 'trigger', type: 'n8n-nodes-base.manualTrigger' });
			const node1 = createNodeData({ name: 'node1' });
			const workflow = new DirectedGraph()
				.addNodes(trigger, node1)
				.addConnections({ from: trigger, to: node1 })
				.toWorkflow({ name: '', active: false, nodeTypes });
			const pinData: IPinData = {};
			const runData: IRunData = {
				[trigger.name]: [toITaskData([{ data: { name: trigger.name } }], { executionIndex: 0 })],
				[node1.name]: [
					toITaskData([{ data: { name: node1.name } }], { executionIndex: 3 }),
					toITaskData([{ data: { name: node1.name } }], { executionIndex: 4 }),
				],
			};
			const dirtyNodeNames: string[] = [];
			const destinationNode = node1.name;

			const processRunExecutionDataSpy = jest.spyOn(workflowExecute, 'processRunExecutionData');

			// ACT
			await workflowExecute.runPartialWorkflow2(
				workflow,
				runData,
				pinData,
				dirtyNodeNames,
				destinationNode,
			);

			// ASSERT
			expect(processRunExecutionDataSpy).toHaveBeenCalledTimes(1);
			expect(additionalData.hooks?.runHook).toHaveBeenCalledWith('nodeExecuteBefore', [
				node1.name,
				expect.objectContaining({ executionIndex: 1 }),
			]);
		});

		//                    ►►
		// ┌─────┐1     ┌─────┐
		// │node1├──────►node2│
		// └─────┘      └─────┘
		test('should find closest parent with run data when no trigger exists', async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			const node1 = createNodeData({ name: 'node1' });
			const node2 = createNodeData({ name: 'node2' });
			const workflow = new DirectedGraph()
				.addNodes(node1, node2)
				.addConnections({ from: node1, to: node2 })
				.toWorkflow({ name: '', active: false, nodeTypes });

			const pinData: IPinData = {};
			const runData: IRunData = {
				[node1.name]: [toITaskData([{ data: { name: node1.name } }])],
			};
			const dirtyNodeNames: string[] = [];
			const destinationNode = node2.name;

			const processRunExecutionDataSpy = jest
				.spyOn(workflowExecute, 'processRunExecutionData')
				.mockImplementationOnce(jest.fn());

			// ACT
			await workflowExecute.runPartialWorkflow2(
				workflow,
				runData,
				pinData,
				dirtyNodeNames,
				destinationNode,
			);

			// ASSERT
			expect(processRunExecutionDataSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('checkReadyForExecution', () => {
		const disabledNode = mock<INode>({ name: 'Disabled Node', disabled: true });
		const startNode = mock<INode>({ name: 'Start Node' });
		const unknownNode = mock<INode>({ name: 'Unknown Node', type: 'unknownNode' });

		const nodeParamIssuesSpy = jest.spyOn(NodeHelpers, 'getNodeParametersIssues');

		const nodeTypes = mock<INodeTypes>();

		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockImplementation((type) => {
				// TODO: getByNameAndVersion signature needs to be updated to allow returning undefined
				if (type === 'unknownNode') return undefined as unknown as INodeType;
				return mock<INodeType>({
					description: {
						properties: [],
					},
				});
			});
		});
		const workflowExecute = new WorkflowExecute(mock(), 'manual');

		it('should return null if there are no nodes', () => {
			const workflow = new Workflow({
				nodes: [],
				connections: {},
				active: false,
				nodeTypes,
			});

			const issues = workflowExecute.checkReadyForExecution(workflow);
			expect(issues).toBe(null);
			expect(nodeTypes.getByNameAndVersion).not.toHaveBeenCalled();
			expect(nodeParamIssuesSpy).not.toHaveBeenCalled();
		});

		it('should return null if there are no enabled nodes', () => {
			const workflow = new Workflow({
				nodes: [disabledNode],
				connections: {},
				active: false,
				nodeTypes,
			});

			const issues = workflowExecute.checkReadyForExecution(workflow, {
				startNode: disabledNode.name,
			});
			expect(issues).toBe(null);
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalledTimes(1);
			expect(nodeParamIssuesSpy).not.toHaveBeenCalled();
		});

		it('should return typeUnknown for unknown nodes', () => {
			const workflow = new Workflow({
				nodes: [unknownNode],
				connections: {},
				active: false,
				nodeTypes,
			});

			const issues = workflowExecute.checkReadyForExecution(workflow, {
				startNode: unknownNode.name,
			});
			expect(issues).toEqual({ [unknownNode.name]: { typeUnknown: true } });
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalledTimes(2);
			expect(nodeParamIssuesSpy).not.toHaveBeenCalled();
		});

		it('should return issues for regular nodes', () => {
			const workflow = new Workflow({
				nodes: [startNode],
				connections: {},
				active: false,
				nodeTypes,
			});
			nodeParamIssuesSpy.mockReturnValue({ execution: false });

			const issues = workflowExecute.checkReadyForExecution(workflow, {
				startNode: startNode.name,
			});
			expect(issues).toEqual({ [startNode.name]: { execution: false } });
			expect(nodeTypes.getByNameAndVersion).toHaveBeenCalledTimes(2);
			expect(nodeParamIssuesSpy).toHaveBeenCalled();
		});
	});

	describe('runNode', () => {
		const nodeTypes = mock<INodeTypes>();
		const triggerNode = mock<INode>();
		const triggerResponse = mock<ITriggerResponse>({
			closeFunction: jest.fn(),
			// This node should never trigger, or return
			manualTriggerFunction: async () => await new Promise(() => {}),
		});
		const triggerNodeType = mock<INodeType>({
			description: {
				properties: [],
			},
			execute: undefined,
			poll: undefined,
			webhook: undefined,
			async trigger() {
				return triggerResponse;
			},
		});

		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(triggerNodeType);
		});

		const workflow = new Workflow({
			nodeTypes,
			nodes: [triggerNode],
			connections: {},
			active: false,
		});

		const executionData = mock<IExecuteData>();
		const runExecutionData = mock<IRunExecutionData>();
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const abortController = new AbortController();
		const workflowExecute = new WorkflowExecute(additionalData, 'manual');

		test('should call closeFunction when manual trigger is aborted', async () => {
			const runPromise = workflowExecute.runNode(
				workflow,
				executionData,
				runExecutionData,
				0,
				additionalData,
				'manual',
				abortController.signal,
			);
			// Yield back to the event-loop to let async parts of `runNode` execute
			await new Promise((resolve) => setImmediate(resolve));

			let isSettled = false;
			void runPromise.then(() => {
				isSettled = true;
			});
			expect(isSettled).toBe(false);
			expect(abortController.signal.aborted).toBe(false);
			expect(triggerResponse.closeFunction).not.toHaveBeenCalled();

			abortController.abort();
			expect(triggerResponse.closeFunction).toHaveBeenCalled();
		});
	});

	describe('handleNodeErrorOutput', () => {
		const testNode: INode = {
			id: '1',
			name: 'Node1',
			type: 'test.set',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		const nodeType = mock<INodeType>({
			description: {
				name: 'test',
				displayName: 'test',
				defaultVersion: 1,
				properties: [],
				inputs: [{ type: NodeConnectionTypes.Main }],
				outputs: [
					{ type: NodeConnectionTypes.Main },
					{ type: NodeConnectionTypes.Main, category: 'error' },
				],
			},
		});

		const nodeTypes = mock<INodeTypes>();

		const workflow = new Workflow({
			id: 'test',
			nodes: [testNode],
			connections: {},
			active: false,
			nodeTypes,
		});

		const executionData = {
			node: workflow.nodes.Node1,
			data: {
				main: [
					[
						{
							json: { data: 'test' },
							pairedItem: { item: 0, input: 0 },
						},
					],
				],
			},
			source: {
				[NodeConnectionTypes.Main]: [
					{
						previousNode: 'previousNode',
						previousNodeOutput: 0,
						previousNodeRun: 0,
					},
				],
			},
		};

		const runExecutionData: IRunExecutionData = {
			resultData: {
				runData: {
					previousNode: [
						{
							data: {
								main: [[{ json: { someData: 'test' } }]],
							},
							source: [],
							startTime: 0,
							executionIndex: 0,
							executionTime: 0,
						},
					],
				},
			},
		};

		let workflowExecute: WorkflowExecute;

		beforeEach(() => {
			jest.clearAllMocks();

			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			workflowExecute = new WorkflowExecute(mock(), 'manual', runExecutionData);
		});

		test('should handle undefined error data input correctly', () => {
			const nodeSuccessData: INodeExecutionData[][] = [
				[undefined as unknown as INodeExecutionData],
			];
			workflowExecute.handleNodeErrorOutput(workflow, executionData, nodeSuccessData, 0);
			expect(nodeSuccessData[0]).toEqual([undefined]);
			expect(nodeSuccessData[1]).toEqual([]);
		});

		test('should handle empty input', () => {
			const nodeSuccessData: INodeExecutionData[][] = [[]];

			workflowExecute.handleNodeErrorOutput(workflow, executionData, nodeSuccessData, 0);

			expect(nodeSuccessData[0]).toHaveLength(0);
			expect(nodeSuccessData[1]).toHaveLength(0);
		});

		test('should route error items to last output', () => {
			const nodeSuccessData: INodeExecutionData[][] = [
				[
					{
						json: { error: 'Test error', additionalData: 'preserved' },
						pairedItem: { item: 0, input: 0 },
					},
					{
						json: { regularData: 'success' },
						pairedItem: { item: 1, input: 0 },
					},
				],
			];

			workflowExecute.handleNodeErrorOutput(workflow, executionData, nodeSuccessData, 0);

			expect(nodeSuccessData[0]).toEqual([
				{
					json: { additionalData: 'preserved', error: 'Test error' },
					pairedItem: { item: 0, input: 0 },
				},
				{ json: { regularData: 'success' }, pairedItem: { item: 1, input: 0 } },
			]);
			expect(nodeSuccessData[1]).toEqual([]);
		});

		test('should handle error in json with message property', () => {
			const nodeSuccessData: INodeExecutionData[][] = [
				[
					{
						json: {
							error: 'Error occurred',
							message: 'Error details',
						},
						pairedItem: { item: 0, input: 0 },
					},
				],
			];

			workflowExecute.handleNodeErrorOutput(workflow, executionData, nodeSuccessData, 0);

			expect(nodeSuccessData[0]).toEqual([]);
			expect(nodeSuccessData[1]).toEqual([
				{
					json: {
						error: 'Error occurred',
						message: 'Error details',
						someData: 'test',
					},
					pairedItem: { item: 0, input: 0 },
				},
			]);
		});

		test('should preserve pairedItem data when routing errors', () => {
			const nodeSuccessData: INodeExecutionData[][] = [
				[
					{
						json: { error: 'Test error' },
						pairedItem: [
							{ item: 0, input: 0 },
							{ item: 1, input: 1 },
						],
					},
				],
			];

			workflowExecute.handleNodeErrorOutput(workflow, executionData, nodeSuccessData, 0);

			expect(nodeSuccessData[0]).toEqual([]);
			expect(nodeSuccessData[1]).toEqual([
				{
					json: { someData: 'test', error: 'Test error' },
					pairedItem: [
						{ item: 0, input: 0 },
						{ item: 1, input: 1 },
					],
				},
			]);
		});

		test('should route multiple error items correctly', () => {
			const nodeSuccessData: INodeExecutionData[][] = [
				[
					{
						json: { error: 'Error 1', data: 'preserved1' },
						pairedItem: { item: 0, input: 0 },
					},
					{
						json: { error: 'Error 2', data: 'preserved2' },
						pairedItem: { item: 1, input: 0 },
					},
				],
			];

			workflowExecute.handleNodeErrorOutput(workflow, executionData, nodeSuccessData, 0);

			expect(nodeSuccessData[1]).toEqual([]);
			expect(nodeSuccessData[0]).toEqual([
				{
					json: { error: 'Error 1', data: 'preserved1' },
					pairedItem: { item: 0, input: 0 },
				},
				{
					json: { error: 'Error 2', data: 'preserved2' },
					pairedItem: { item: 1, input: 0 },
				},
			]);
		});

		test('should handle complex pairedItem data correctly', () => {
			const nodeSuccessData: INodeExecutionData[][] = [
				[
					{
						json: { error: 'Test error' },
						pairedItem: [
							{ item: 0, input: 0 },
							{ item: 1, input: 1 },
						],
					},
				],
			];

			workflowExecute.handleNodeErrorOutput(workflow, executionData, nodeSuccessData, 0);

			expect(nodeSuccessData[0]).toEqual([]);
			expect(nodeSuccessData[1]).toEqual([
				{
					json: { someData: 'test', error: 'Test error' },
					pairedItem: [
						{ item: 0, input: 0 },
						{ item: 1, input: 1 },
					],
				},
			]);
		});
	});

	describe('prepareWaitingToExecution', () => {
		let runExecutionData: IRunExecutionData;
		let workflowExecute: WorkflowExecute;

		beforeEach(() => {
			runExecutionData = {
				startData: {},
				resultData: {
					runData: {},
					pinData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};
			workflowExecute = new WorkflowExecute(mock(), 'manual', runExecutionData);
		});

		test('should initialize waitingExecutionSource if undefined', () => {
			runExecutionData.executionData!.waitingExecutionSource = null;
			const nodeName = 'testNode';
			const numberOfConnections = 2;
			const runIndex = 0;

			workflowExecute.prepareWaitingToExecution(nodeName, numberOfConnections, runIndex);

			expect(runExecutionData.executionData?.waitingExecutionSource).toBeDefined();
		});

		test('should create arrays of correct length with null values', () => {
			const nodeName = 'testNode';
			const numberOfConnections = 3;
			const runIndex = 0;
			runExecutionData.executionData!.waitingExecution[nodeName] = {};

			workflowExecute.prepareWaitingToExecution(nodeName, numberOfConnections, runIndex);

			const nodeWaiting = runExecutionData.executionData!.waitingExecution[nodeName];
			const nodeWaitingSource = runExecutionData.executionData!.waitingExecutionSource![nodeName];

			expect(nodeWaiting[runIndex].main).toHaveLength(3);
			expect(nodeWaiting[runIndex].main).toEqual([null, null, null]);
			expect(nodeWaitingSource[runIndex].main).toHaveLength(3);
			expect(nodeWaitingSource[runIndex].main).toEqual([null, null, null]);
		});

		test('should work with zero connections', () => {
			const nodeName = 'testNode';
			const numberOfConnections = 0;
			const runIndex = 0;
			runExecutionData.executionData!.waitingExecution[nodeName] = {};

			workflowExecute.prepareWaitingToExecution(nodeName, numberOfConnections, runIndex);

			expect(
				runExecutionData.executionData!.waitingExecution[nodeName][runIndex].main,
			).toHaveLength(0);
			expect(
				runExecutionData.executionData!.waitingExecutionSource![nodeName][runIndex].main,
			).toHaveLength(0);
		});

		test('should handle multiple run indices', () => {
			const nodeName = 'testNode';
			const numberOfConnections = 2;
			runExecutionData.executionData!.waitingExecution[nodeName] = {};

			workflowExecute.prepareWaitingToExecution(nodeName, numberOfConnections, 0);
			workflowExecute.prepareWaitingToExecution(nodeName, numberOfConnections, 1);

			const nodeWaiting = runExecutionData.executionData!.waitingExecution[nodeName];
			const nodeWaitingSource = runExecutionData.executionData!.waitingExecutionSource![nodeName];

			expect(nodeWaiting[0].main).toHaveLength(2);
			expect(nodeWaiting[1].main).toHaveLength(2);
			expect(nodeWaitingSource[0].main).toHaveLength(2);
			expect(nodeWaitingSource[1].main).toHaveLength(2);
		});
	});

	describe('incomingConnectionIsEmpty', () => {
		let workflowExecute: WorkflowExecute;

		beforeEach(() => {
			workflowExecute = new WorkflowExecute(mock(), 'manual');
		});

		test('should return true when there are no input connections', () => {
			const result = workflowExecute.incomingConnectionIsEmpty({}, [], 0);
			expect(result).toBe(true);
		});

		test('should return true when all input connections have no data', () => {
			const runData: IRunData = {
				node1: [
					{
						source: [],
						data: { main: [[], []] },
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
					},
				],
			};

			const inputConnections: IConnection[] = [
				{ node: 'node1', type: NodeConnectionTypes.Main, index: 0 },
				{ node: 'node1', type: NodeConnectionTypes.Main, index: 1 },
			];

			const result = workflowExecute.incomingConnectionIsEmpty(runData, inputConnections, 0);
			expect(result).toBe(true);
		});

		test('should return true when input connection node does not exist in runData', () => {
			const runData: IRunData = {};
			const inputConnections: IConnection[] = [
				{ node: 'nonexistentNode', type: NodeConnectionTypes.Main, index: 0 },
			];

			const result = workflowExecute.incomingConnectionIsEmpty(runData, inputConnections, 0);
			expect(result).toBe(true);
		});

		test('should return false when any input connection has data', () => {
			const runData: IRunData = {
				node1: [
					{
						source: [],
						data: {
							main: [[{ json: { data: 'test' } }], []],
						},
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
					},
				],
			};

			const inputConnections: IConnection[] = [
				{ node: 'node1', type: NodeConnectionTypes.Main, index: 0 },
				{ node: 'node1', type: NodeConnectionTypes.Main, index: 1 },
			];

			const result = workflowExecute.incomingConnectionIsEmpty(runData, inputConnections, 0);
			expect(result).toBe(false);
		});

		test('should check correct run index', () => {
			const runData: IRunData = {
				node1: [
					{
						source: [],
						data: {
							main: [[]],
						},
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
					},
					{
						source: [],
						data: {
							main: [[{ json: { data: 'test' } }]],
						},
						startTime: 0,
						executionIndex: 1,
						executionTime: 0,
					},
				],
			};

			const inputConnections: IConnection[] = [
				{ node: 'node1', type: NodeConnectionTypes.Main, index: 0 },
			];

			expect(workflowExecute.incomingConnectionIsEmpty(runData, inputConnections, 0)).toBe(true);
			expect(workflowExecute.incomingConnectionIsEmpty(runData, inputConnections, 1)).toBe(false);
		});

		test('should handle undefined data in runData correctly', () => {
			const runData: IRunData = {
				node1: [
					{
						source: [],
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
					},
				],
			};

			const inputConnections: IConnection[] = [
				{ node: 'node1', type: NodeConnectionTypes.Main, index: 0 },
			];

			const result = workflowExecute.incomingConnectionIsEmpty(runData, inputConnections, 0);
			expect(result).toBe(true);
		});
	});

	describe('moveNodeMetadata', () => {
		let runExecutionData: IRunExecutionData;
		let workflowExecute: WorkflowExecute;
		const parentExecution = mock<RelatedExecution>();

		beforeEach(() => {
			runExecutionData = {
				startData: {},
				resultData: {
					runData: {},
					pinData: {},
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};
			workflowExecute = new WorkflowExecute(mock(), 'manual', runExecutionData);
		});

		test('should do nothing when there is no metadata', () => {
			runExecutionData.resultData.runData = {
				node1: [{ startTime: 0, executionTime: 0, source: [], executionIndex: 0 }],
			};

			workflowExecute.moveNodeMetadata();

			expect(runExecutionData.resultData.runData.node1[0].metadata).toBeUndefined();
		});

		test('should merge metadata into runData for single node', () => {
			runExecutionData.resultData.runData = {
				node1: [{ startTime: 0, executionTime: 0, source: [], executionIndex: 0 }],
			};
			runExecutionData.executionData!.metadata = {
				node1: [{ parentExecution }],
			};

			workflowExecute.moveNodeMetadata();

			expect(runExecutionData.resultData.runData.node1[0].metadata).toEqual({ parentExecution });
		});

		test('should merge metadata into runData for multiple nodes', () => {
			runExecutionData.resultData.runData = {
				node1: [{ startTime: 0, executionTime: 0, source: [], executionIndex: 0 }],
				node2: [{ startTime: 0, executionTime: 0, source: [], executionIndex: 1 }],
			};
			runExecutionData.executionData!.metadata = {
				node1: [{ parentExecution }],
				node2: [{ subExecutionsCount: 4 }],
			};

			workflowExecute.moveNodeMetadata();

			const { runData } = runExecutionData.resultData;
			expect(runData.node1[0].metadata).toEqual({ parentExecution });
			expect(runData.node2[0].metadata).toEqual({ subExecutionsCount: 4 });
		});

		test('should preserve existing metadata when merging', () => {
			runExecutionData.resultData.runData = {
				node1: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						source: [],
						metadata: { subExecutionsCount: 4 },
					},
				],
			};
			runExecutionData.executionData!.metadata = {
				node1: [{ parentExecution }],
			};

			workflowExecute.moveNodeMetadata();

			expect(runExecutionData.resultData.runData.node1[0].metadata).toEqual({
				parentExecution,
				subExecutionsCount: 4,
			});
		});

		test('should handle multiple run indices', () => {
			runExecutionData.resultData.runData = {
				node1: [
					{ startTime: 0, executionTime: 0, source: [], executionIndex: 0 },
					{ startTime: 0, executionTime: 0, source: [], executionIndex: 1 },
				],
			};
			runExecutionData.executionData!.metadata = {
				node1: [{ parentExecution }, { subExecutionsCount: 4 }],
			};

			workflowExecute.moveNodeMetadata();

			const { runData } = runExecutionData.resultData;
			expect(runData.node1[0].metadata).toEqual({ parentExecution });
			expect(runData.node1[1].metadata).toEqual({ subExecutionsCount: 4 });
		});
	});

	describe('getFullRunData', () => {
		afterAll(() => {
			jest.useRealTimers();
		});

		test('should return complete IRun object with all properties correctly set', () => {
			const runExecutionData = mock<IRunExecutionData>();

			const workflowExecute = new WorkflowExecute(mock(), 'manual', runExecutionData);

			const startedAt = new Date('2023-01-01T00:00:00.000Z');
			jest.useFakeTimers().setSystemTime(startedAt);

			const result1 = workflowExecute.getFullRunData(startedAt);

			expect(result1).toEqual({
				data: runExecutionData,
				mode: 'manual',
				startedAt,
				stoppedAt: startedAt,
				status: 'new',
			});

			const stoppedAt = new Date('2023-01-01T00:00:10.000Z');
			jest.setSystemTime(stoppedAt);
			// @ts-expect-error read-only property
			workflowExecute.status = 'running';

			const result2 = workflowExecute.getFullRunData(startedAt);

			expect(result2).toEqual({
				data: runExecutionData,
				mode: 'manual',
				startedAt,
				stoppedAt,
				status: 'running',
			});
		});
	});

	describe('processSuccessExecution', () => {
		const startedAt: Date = new Date('2023-01-01T00:00:00.000Z');
		const workflow = new Workflow({
			id: 'test',
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: mock<INodeTypes>(),
		});

		let runExecutionData: IRunExecutionData;
		let workflowExecute: WorkflowExecute;
		let additionalData: IWorkflowExecuteAdditionalData;

		beforeEach(() => {
			runExecutionData = {
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: null,
				},
			};
			additionalData = mock();
			additionalData.hooks = mock<ExecutionLifecycleHooks>();

			workflowExecute = new WorkflowExecute(additionalData, 'manual', runExecutionData);

			jest.spyOn(additionalData.hooks, 'runHook').mockResolvedValue(undefined);
			jest.spyOn(workflowExecute, 'moveNodeMetadata').mockImplementation();
		});

		test('should handle different workflow completion scenarios', async () => {
			// Test successful execution
			const successResult = await workflowExecute.processSuccessExecution(startedAt, workflow);
			expect(successResult.status).toBe('success');
			expect(successResult.finished).toBe(true);

			// Test execution with wait
			runExecutionData.waitTill = new Date('2024-01-01');
			const waitResult = await workflowExecute.processSuccessExecution(startedAt, workflow);
			expect(waitResult.status).toBe('waiting');
			expect(waitResult.waitTill).toEqual(runExecutionData.waitTill);

			// Test execution with error
			const testError = new Error('Test error') as ExecutionBaseError;

			// Reset the status since it was changed by previous tests
			// @ts-expect-error read-only property
			workflowExecute.status = 'new';
			runExecutionData.waitTill = undefined;

			const errorResult = await workflowExecute.processSuccessExecution(
				startedAt,
				workflow,
				testError,
			);

			expect(errorResult.data.resultData.error).toBeDefined();
			expect(errorResult.data.resultData.error?.message).toBe('Test error');

			// Test canceled execution
			const cancelError = new Error('Workflow execution canceled') as ExecutionBaseError;
			const cancelResult = await workflowExecute.processSuccessExecution(
				startedAt,
				workflow,
				cancelError,
			);
			expect(cancelResult.data.resultData.error).toBeDefined();
			expect(cancelResult.data.resultData.error?.message).toBe('Workflow execution canceled');
		});

		test('should handle static data, hooks, and cleanup correctly', async () => {
			// Mock static data change
			workflow.staticData.__dataChanged = true;
			workflow.staticData.testData = 'changed';

			// Mock cleanup function that's actually a promise
			let cleanupCalled = false;
			const mockCleanupPromise = new Promise<void>((resolve) => {
				setTimeout(() => {
					cleanupCalled = true;
					resolve();
				}, 0);
			});

			const result = await workflowExecute.processSuccessExecution(
				startedAt,
				workflow,
				undefined,
				mockCleanupPromise,
			);

			// Verify static data handling
			expect(result).toBeDefined();
			expect(workflowExecute.moveNodeMetadata).toHaveBeenCalled();
			expect(additionalData.hooks?.runHook).toHaveBeenCalledWith('workflowExecuteAfter', [
				result,
				workflow.staticData,
			]);

			// Verify cleanup was called
			await mockCleanupPromise;
			expect(cleanupCalled).toBe(true);
		});
	});

	describe('assignPairedItems', () => {
		let workflowExecute: WorkflowExecute;

		beforeEach(() => {
			workflowExecute = new WorkflowExecute(mock(), 'manual');
		});

		test('should handle undefined node output', () => {
			const result = workflowExecute.assignPairedItems(
				undefined,
				mock<IExecuteData>({ data: { main: [] } }),
			);
			expect(result).toBeNull();
		});

		test('should auto-fix pairedItem for single input/output scenario', () => {
			const nodeOutput = [[{ json: { test: true } }]];
			const executionData = mock<IExecuteData>({ data: { main: [[{ json: { input: true } }]] } });

			const result = workflowExecute.assignPairedItems(nodeOutput, executionData);

			expect(result?.[0][0].pairedItem).toEqual({ item: 0 });
		});

		test('should auto-fix pairedItem when number of items match', () => {
			const nodeOutput = [[{ json: { test: 1 } }, { json: { test: 2 } }]];
			const executionData = mock<IExecuteData>({
				data: { main: [[{ json: { input: 1 } }, { json: { input: 2 } }]] },
			});

			const result = workflowExecute.assignPairedItems(nodeOutput, executionData);

			expect(result?.[0][0].pairedItem).toEqual({ item: 0 });
			expect(result?.[0][1].pairedItem).toEqual({ item: 1 });
		});

		test('should not modify existing pairedItem data', () => {
			const existingPairedItem = { item: 5, input: 2 };
			const nodeOutput = [[{ json: { test: true }, pairedItem: existingPairedItem }]];
			const executionData = mock<IExecuteData>({ data: { main: [[{ json: { input: true } }]] } });

			const result = workflowExecute.assignPairedItems(nodeOutput, executionData);

			expect(result?.[0][0].pairedItem).toEqual(existingPairedItem);
		});

		test('should process multiple output branches correctly', () => {
			const nodeOutput = [[{ json: { test: 1 } }], [{ json: { test: 2 } }]];
			const executionData = mock<IExecuteData>({ data: { main: [[{ json: { input: true } }]] } });

			const result = workflowExecute.assignPairedItems(nodeOutput, executionData);

			expect(result?.[0][0].pairedItem).toEqual({ item: 0 });
			expect(result?.[1][0].pairedItem).toEqual({ item: 0 });
		});
	});

	describe('ensureInputData', () => {
		const node: INode = {
			id: '1',
			name: 'TestNode',
			type: 'test.set',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		const parentNode: INode = {
			id: '2',
			name: 'ParentNode',
			type: 'test.set',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		const runExecutionData = mock<IRunExecutionData>({
			executionData: {
				nodeExecutionStack: [],
			},
		});
		const workflow = new Workflow({
			id: 'test',
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: mock(),
		});

		let executionData: IExecuteData;
		let workflowExecute: WorkflowExecute;
		beforeEach(() => {
			executionData = {
				node,
				data: {},
				source: null,
			};
			workflowExecute = new WorkflowExecute(mock(), 'manual', runExecutionData);
			jest.resetAllMocks();
		});

		test('should return true when node has no input connections', () => {
			workflow.nodes = {};
			workflow.setConnections({});

			const hasInputData = workflowExecute.ensureInputData(workflow, node, executionData);

			expect(hasInputData).toBe(true);
		});

		test('should return false when execution data does not have main connection', () => {
			workflow.nodes = {
				[node.name]: node,
				[parentNode.name]: parentNode,
			};

			workflow.setConnections({
				[parentNode.name]: {
					main: [[{ node: node.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			});

			const hasInputData = workflowExecute.ensureInputData(workflow, node, executionData);

			expect(hasInputData).toBe(false);
			expect(runExecutionData.executionData?.nodeExecutionStack).toContain(executionData);
		});

		test('should return true when input data is available for force input node execution', () => {
			workflow.nodes = {
				[node.name]: node,
				[parentNode.name]: parentNode,
			};

			workflow.setConnections({
				[parentNode.name]: {
					main: [[{ node: node.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			});

			executionData.data = { main: [[{ json: { test: 'data' } }]] };

			const hasInputData = workflowExecute.ensureInputData(workflow, node, executionData);

			expect(hasInputData).toBe(true);
		});

		test('should return false when input data is not available for force input node execution', () => {
			workflow.nodes = {
				[node.name]: node,
				[parentNode.name]: parentNode,
			};

			workflow.setConnections({
				[parentNode.name]: {
					main: [[{ node: node.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			});

			executionData.data = { main: [null] };

			const hasInputData = workflowExecute.ensureInputData(workflow, node, executionData);

			expect(hasInputData).toBe(false);
			expect(runExecutionData.executionData?.nodeExecutionStack).toContain(executionData);
		});
	});

	describe('customOperations', () => {
		const nodeTypes = mock<INodeTypes>();

		const runExecutionData = mock<IRunExecutionData>();
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const workflowExecute = new WorkflowExecute(additionalData, 'manual');

		const testCases: Array<{
			title: string;
			parameters?: INode['parameters'];
			forceCustomOperation?: INode['forceCustomOperation'];
			expectedOutput: IDataObject | undefined;
		}> = [
			{
				title: 'only parameters are set',
				parameters: { resource: 'test', operation: 'test1' },
				forceCustomOperation: undefined,
				expectedOutput: { data: [[{ json: { customOperationsRun: 1 } }]], hints: [] },
			},
			{
				title: 'both parameters and forceCustomOperation are set',
				parameters: { resource: 'test', operation: 'test1' },
				forceCustomOperation: { resource: 'test', operation: 'test2' },
				expectedOutput: { data: [[{ json: { customOperationsRun: 2 } }]], hints: [] },
			},
			{
				title: 'only forceCustomOperation is set',
				parameters: undefined,
				forceCustomOperation: { resource: 'test', operation: 'test1' },
				expectedOutput: { data: [[{ json: { customOperationsRun: 1 } }]], hints: [] },
			},
			{
				title: 'neither option is set',
				parameters: undefined,
				forceCustomOperation: undefined,
				expectedOutput: { data: undefined },
			},
			{
				title: 'non relevant parameters are set',
				parameters: { test: 1 },
				forceCustomOperation: undefined,
				expectedOutput: { data: undefined },
			},
			{
				title: 'only parameter.resource is set',
				parameters: { resource: 'test' },
				forceCustomOperation: undefined,
				expectedOutput: { data: undefined },
			},
			{
				title: 'only parameter.operation is set',
				parameters: { operation: 'test1' },
				forceCustomOperation: undefined,
				expectedOutput: { data: undefined },
			},
			{
				title: 'unknown parameter.resource is set',
				parameters: { resource: 'unknown', operation: 'test1' },
				forceCustomOperation: undefined,
				expectedOutput: { data: undefined },
			},
			{
				title: 'unknown parameter.operation is set',
				parameters: { resource: 'test', operation: 'unknown' },
				forceCustomOperation: undefined,
				expectedOutput: { data: undefined, hints: [] },
			},
		];
		testCases.forEach(({ title, parameters, forceCustomOperation, expectedOutput }) => {
			test(`should execute customOperations - ${title}`, async () => {
				const testNode = mock<INode>({
					name: 'nodeName',
					parameters,
					forceCustomOperation,
				});

				const workflow = new Workflow({
					nodeTypes,
					nodes: [testNode],
					connections: {},
					active: false,
				});

				const executionData: IExecuteData = {
					node: testNode,
					data: { main: [[{ json: {} }]] },
					source: null,
				};

				const nodeType = mock<INodeType>({
					description: {
						properties: [],
					},
					execute: undefined,
					customOperations: {
						test: {
							async test1(this: IExecuteFunctions) {
								return [[{ json: { customOperationsRun: 1 } }]];
							},
							async test2(this: IExecuteFunctions) {
								return [[{ json: { customOperationsRun: 2 } }]];
							},
						},
					},
				});

				nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

				const runPromise = workflowExecute.runNode(
					workflow,
					executionData,
					runExecutionData,
					0,
					additionalData,
					'manual',
				);

				const result = await runPromise;

				expect(result).toEqual(expectedOutput);
			});
		});
	});

	describe('error chunk handling', () => {
		const nodeTypes = mock<INodeTypes>();
		let workflowExecute: WorkflowExecute;
		let additionalData: IWorkflowExecuteAdditionalData;
		let runExecutionData: IRunExecutionData;
		let mockHooks: ExecutionLifecycleHooks;

		beforeEach(() => {
			runExecutionData = {
				startData: {},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: null,
				},
			};

			mockHooks = mock<ExecutionLifecycleHooks>();
			additionalData = mock<IWorkflowExecuteAdditionalData>();
			additionalData.hooks = mockHooks;
			additionalData.currentNodeExecutionIndex = 0;

			workflowExecute = new WorkflowExecute(additionalData, 'manual', runExecutionData);

			jest.spyOn(mockHooks, 'runHook').mockResolvedValue(undefined);
		});

		test('should send error chunk when workflow execution fails', async () => {
			// ARRANGE
			const errorNode: INode = {
				id: '1',
				name: 'ErrorNode',
				type: 'test.error',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const nodeOperationError = new NodeOperationError(errorNode, 'Node execution failed');
			nodeOperationError.description = 'A detailed error description';

			const errorNodeType = mock<INodeType>({
				description: {
					name: 'test.error',
					displayName: 'Test Error Node',
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute() {
					throw nodeOperationError;
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(errorNodeType);

			const workflow = new Workflow({
				id: 'test',
				nodes: [errorNode],
				connections: {},
				active: false,
				nodeTypes,
			});

			const waitPromise = createDeferredPromise<IRun>();
			const testAdditionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			testAdditionalData.hooks = mockHooks;

			// ACT
			try {
				await workflowExecute.run(workflow, errorNode);
			} catch {
				// Expected to throw
			}

			// ASSERT
			expect(mockHooks.runHook).toHaveBeenCalledWith('sendChunk', [
				{
					type: 'error',
					content: 'A detailed error description',
					metadata: {
						nodeId: errorNode.id,
						nodeName: errorNode.name,
						runIndex: 0,
						itemIndex: 0,
					},
				},
			]);
		});

		test('should send error chunk when workflow execution fails with NodeApiError', async () => {
			// ARRANGE
			const errorNode: INode = {
				id: 'error-node-id',
				name: 'ErrorNode',
				type: 'test.error',
				typeVersion: 1,
				position: [100, 200],
				parameters: {},
			};

			const nodeApiError = new NodeApiError(errorNode, { message: 'API request failed' });
			nodeApiError.description = 'The API returned an error';

			const errorNodeType = mock<INodeType>({
				description: {
					name: 'test.error',
					displayName: 'Test Error Node',
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute() {
					throw nodeApiError;
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(errorNodeType);

			const workflow = new Workflow({
				id: 'test',
				nodes: [errorNode],
				connections: {},
				active: false,
				nodeTypes,
			});

			const waitPromise = createDeferredPromise<IRun>();
			const testAdditionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			testAdditionalData.hooks = mockHooks;

			// ACT
			try {
				await workflowExecute.run(workflow, errorNode);
			} catch {
				// Expected to throw
			}

			// ASSERT
			expect(mockHooks.runHook).toHaveBeenCalledWith('sendChunk', [
				{
					type: 'error',
					content: 'The API returned an error',
					metadata: {
						nodeId: errorNode.id,
						nodeName: errorNode.name,
						runIndex: 0,
						itemIndex: 0,
					},
				},
			]);
		});

		test('should not send error chunk when workflow execution succeeds', async () => {
			// ARRANGE
			const successNode: INode = {
				id: '1',
				name: 'SuccessNode',
				type: 'test.success',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const successNodeType = mock<INodeType>({
				description: {
					name: 'test.success',
					displayName: 'Test Success Node',
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute() {
					return [[{ json: { success: true } }]];
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(successNodeType);

			const workflow = new Workflow({
				id: 'test',
				nodes: [successNode],
				connections: {},
				active: false,
				nodeTypes,
			});

			const waitPromise = createDeferredPromise<IRun>();
			const testAdditionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			testAdditionalData.hooks = mockHooks;

			// ACT
			await workflowExecute.run(workflow, successNode);

			// ASSERT
			expect(mockHooks.runHook).not.toHaveBeenCalledWith('sendChunk', expect.anything());
		});

		test('should send error chunk when workflow execution fails with NodeOperationError', async () => {
			// ARRANGE
			const errorNode: INode = {
				id: '1',
				name: 'ErrorNode',
				type: 'test.error',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const nodeOperationError = new NodeOperationError(errorNode, 'Operation failed');
			nodeOperationError.description = 'Custom error description';

			const errorNodeType = mock<INodeType>({
				description: {
					name: 'test.error',
					displayName: 'Test Error Node',
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute() {
					throw nodeOperationError;
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(errorNodeType);

			const workflow = new Workflow({
				id: 'test',
				nodes: [errorNode],
				connections: {},
				active: false,
				nodeTypes,
			});

			const waitPromise = createDeferredPromise<IRun>();
			const testAdditionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			testAdditionalData.hooks = mockHooks;

			// ACT
			try {
				await workflowExecute.run(workflow, errorNode);
			} catch {
				// Expected to throw
			}

			// ASSERT
			expect(mockHooks.runHook).toHaveBeenCalledWith('sendChunk', [
				{
					type: 'error',
					content: 'Custom error description',
					metadata: {
						nodeId: errorNode.id,
						nodeName: errorNode.name,
						runIndex: 0,
						itemIndex: 0,
					},
				},
			]);
		});

		test('should send error chunk with undefined content when error has no description', async () => {
			// ARRANGE
			const errorNode: INode = {
				id: '1',
				name: 'ErrorNode',
				type: 'test.error',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const simpleError = new Error('Simple error message');

			const errorNodeType = mock<INodeType>({
				description: {
					name: 'test.error',
					displayName: 'Test Error Node',
					defaultVersion: 1,
					properties: [],
					inputs: [{ type: NodeConnectionTypes.Main }],
					outputs: [{ type: NodeConnectionTypes.Main }],
				},
				async execute() {
					throw simpleError;
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(errorNodeType);

			const workflow = new Workflow({
				id: 'test',
				nodes: [errorNode],
				connections: {},
				active: false,
				nodeTypes,
			});

			const waitPromise = createDeferredPromise<IRun>();
			const testAdditionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			testAdditionalData.hooks = mockHooks;

			// ACT
			try {
				await workflowExecute.run(workflow, errorNode);
			} catch {
				// Expected to throw
			}

			// ASSERT
			expect(mockHooks.runHook).toHaveBeenCalledWith('sendChunk', [
				{
					type: 'error',
					content: undefined, // When no description is available, content should be undefined
					metadata: {
						nodeId: errorNode.id,
						nodeName: errorNode.name,
						runIndex: 0,
						itemIndex: 0,
					},
				},
			]);
		});
	});

	describe('Cancellation', () => {
		test('should update only running task statuses to cancelled when workflow is cancelled', () => {
			// Arrange - create a workflow with some nodes
			const startNode = createNodeData({ name: 'Start' });
			const processingNode = createNodeData({ name: 'Processing' });
			const completedNode = createNodeData({ name: 'Completed' });

			const workflow = new Workflow({
				id: 'test-workflow',
				nodes: [startNode, processingNode, completedNode],
				connections: {},
				active: false,
				nodeTypes,
			});

			const waitPromise = createDeferredPromise<IRun>();
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise);
			const workflowExecute = new WorkflowExecute(additionalData, 'manual');

			// Create run execution data with tasks in various statuses
			const runExecutionData: IRunExecutionData = {
				startData: { startNodes: [{ name: 'Start', sourceData: null }] },
				resultData: {
					runData: {
						Start: [toITaskData([{ data: { test: 'data' } }], { executionStatus: 'success' })],
						Processing: [toITaskData([{ data: { test: 'data' } }], { executionStatus: 'running' })],
						Completed: [
							toITaskData([{ data: { test: 'data1' } }], { executionStatus: 'error' }),
							toITaskData([{ data: { test: 'data2' } }], { executionStatus: 'running' }),
							toITaskData([{ data: { test: 'data3' } }], { executionStatus: 'waiting' }),
						],
					},
					lastNodeExecuted: 'Processing',
				},
				executionData: mock<IRunExecutionData['executionData']>({
					nodeExecutionStack: [],
					metadata: {},
				}),
			};

			// Set the run execution data on the workflow execute instance
			// @ts-expect-error private data
			workflowExecute.runExecutionData = runExecutionData;

			assert(additionalData.hooks);
			const runHook = jest.fn();
			additionalData.hooks.runHook = runHook;

			const promise = workflowExecute.processRunExecutionData(workflow);
			promise.cancel('reason');

			const updatedExecutionData = {
				data: {
					startData: { startNodes: [{ name: 'Start', sourceData: null }] },
					resultData: {
						runData: {
							Start: [toITaskData([{ data: { test: 'data' } }], { executionStatus: 'success' })],
							Processing: [
								toITaskData([{ data: { test: 'data' } }], { executionStatus: 'canceled' }),
							],
							Completed: [
								toITaskData([{ data: { test: 'data1' } }], { executionStatus: 'error' }),
								toITaskData([{ data: { test: 'data2' } }], { executionStatus: 'canceled' }),
								toITaskData([{ data: { test: 'data3' } }], { executionStatus: 'waiting' }),
							],
						},
						lastNodeExecuted: 'Processing',
					},
					executionData: mock<IRunExecutionData['executionData']>({
						nodeExecutionStack: [],
						metadata: {},
					}),
				},
			};

			expect(runHook.mock.lastCall[0]).toEqual('workflowExecuteAfter');
			expect(JSON.stringify(runHook.mock.lastCall[1][0].data)).toBe(
				JSON.stringify(updatedExecutionData.data),
			);
			expect(runHook.mock.lastCall[1][0].status).toEqual('canceled');
		});
	});
});
