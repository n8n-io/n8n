// NOTE: Diagrams in this file have been created with https://asciiflow.com/#/
// If you update the tests, please update the diagrams as well.
// If you add a test, please create a new diagram.
//
// Map
// 0  means the output has no run data
// 1  means the output has run data
// ►► denotes the node that the user wants to execute to
// XX denotes that the node is disabled
// PD denotes that the node has pinned data

import { mock } from 'jest-mock-extended';
import { pick } from 'lodash';
import type {
	IExecuteData,
	INode,
	INodeType,
	INodeTypes,
	IPinData,
	IRun,
	IRunData,
	IRunExecutionData,
	ITriggerResponse,
	IWorkflowExecuteAdditionalData,
	WorkflowTestData,
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	NodeExecutionOutput,
	NodeHelpers,
	Workflow,
} from 'n8n-workflow';

import { DirectedGraph } from '@/PartialExecutionUtils';
import * as partialExecutionUtils from '@/PartialExecutionUtils';
import { createNodeData, toITaskData } from '@/PartialExecutionUtils/__tests__/helpers';
import { WorkflowExecute } from '@/WorkflowExecute';

import * as Helpers from './helpers';
import { legacyWorkflowExecuteTests, v1WorkflowExecuteTests } from './helpers/constants';

const nodeTypes = Helpers.NodeTypes();

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
				const nodeExecutionOrder: string[] = [];
				const additionalData = Helpers.WorkflowExecuteAdditionalData(
					waitPromise,
					nodeExecutionOrder,
				);

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
				const nodeExecutionOrder: string[] = [];
				const additionalData = Helpers.WorkflowExecuteAdditionalData(
					waitPromise,
					nodeExecutionOrder,
				);

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
				expect(nodeExecutionOrder).toEqual(testData.output.nodeExecutionOrder);

				// Check if other data has correct value
				expect(result.finished).toEqual(true);
				expect(result.data.executionData!.contextData).toEqual({});
				expect(result.data.executionData!.nodeExecutionStack).toEqual([]);
			});
		}
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
				const nodeExecutionOrder: string[] = [];
				const additionalData = Helpers.WorkflowExecuteAdditionalData(
					waitPromise,
					nodeExecutionOrder,
				);

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

	test('WorkflowExecute, NodeExecutionOutput type test', () => {
		//TODO Add more tests here when execution hints are added to some node types
		const nodeExecutionOutput = new NodeExecutionOutput(
			[[{ json: { data: 123 } }]],
			[{ message: 'TEXT HINT' }],
		);

		expect(nodeExecutionOutput).toBeInstanceOf(NodeExecutionOutput);
		expect(nodeExecutionOutput[0][0].json.data).toEqual(123);
		expect(nodeExecutionOutput.getHints()[0].message).toEqual('TEXT HINT');
	});

	describe('runPartialWorkflow2', () => {
		//                Dirty         ►
		// ┌───────┐1     ┌─────┐1     ┌─────┐
		// │trigger├──────►node1├──────►node2│
		// └───────┘      └─────┘      └─────┘
		test("deletes dirty nodes' run data", async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const nodeExecutionOrder: string[] = [];
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise, nodeExecutionOrder);
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

		//                 XX           ►►
		// ┌───────┐1     ┌─────┐1     ┌─────┐
		// │trigger├──────►node1├──────►node2│
		// └───────┘      └─────┘      └─────┘
		test('removes disabled nodes from the workflow', async () => {
			// ARRANGE
			const waitPromise = createDeferredPromise<IRun>();
			const nodeExecutionOrder: string[] = [];
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise, nodeExecutionOrder);
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
			expect(processRunExecutionDataSpy).toHaveBeenCalledTimes(1);
			const nodes = Object.keys(processRunExecutionDataSpy.mock.calls[0][0].nodes);
			expect(nodes).toContain(trigger.name);
			expect(nodes).toContain(node2.name);
			expect(nodes).not.toContain(node1.name);
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
			const nodeExecutionOrder: string[] = [];
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise, nodeExecutionOrder);
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
			const nodeExecutionOrder: string[] = [];
			const additionalData = Helpers.WorkflowExecuteAdditionalData(waitPromise, nodeExecutionOrder);
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
			expect(cleanRunDataSpy).toHaveBeenNthCalledWith(
				1,
				runData,
				new DirectedGraph().addNodes(trigger, node1).addConnections({ from: trigger, to: node1 }),
				new Set([node1]),
			);
		});
	});

	describe('checkReadyForExecution', () => {
		const disabledNode = mock<INode>({ name: 'Disabled Node', disabled: true });
		const startNode = mock<INode>({ name: 'Start Node' });
		const unknownNode = mock<INode>({ name: 'Unknown Node', type: 'unknownNode' });

		const nodeParamIssuesSpy = jest.spyOn(NodeHelpers, 'getNodeParametersIssues');

		const nodeTypes = mock<INodeTypes>();
		nodeTypes.getByNameAndVersion.mockImplementation((type) => {
			// TODO: getByNameAndVersion signature needs to be updated to allow returning undefined
			if (type === 'unknownNode') return undefined as unknown as INodeType;
			return mock<INodeType>({
				description: {
					properties: [],
				},
			});
		});
		const workflowExecute = new WorkflowExecute(mock(), 'manual');

		beforeEach(() => jest.clearAllMocks());

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

		nodeTypes.getByNameAndVersion.mockReturnValue(triggerNodeType);

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
});
