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
} from 'n8n-workflow';
import {
	ApplicationError,
	createDeferredPromise,
	NodeConnectionType,
	NodeExecutionOutput,
	NodeHelpers,
	Workflow,
} from 'n8n-workflow';

import * as Helpers from '@test/helpers';
import { legacyWorkflowExecuteTests, v1WorkflowExecuteTests } from '@test/helpers/constants';

import { DirectedGraph } from '../partial-execution-utils';
import * as partialExecutionUtils from '../partial-execution-utils';
import { createNodeData, toITaskData } from '../partial-execution-utils/__tests__/helpers';
import { WorkflowExecute } from '../workflow-execute';

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
				inputs: [{ type: NodeConnectionType.Main }],
				outputs: [
					{ type: NodeConnectionType.Main },
					{ type: NodeConnectionType.Main, category: 'error' },
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
				[NodeConnectionType.Main]: [
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
						executionTime: 0,
					},
				],
			};

			const inputConnections: IConnection[] = [
				{ node: 'node1', type: NodeConnectionType.Main, index: 0 },
				{ node: 'node1', type: NodeConnectionType.Main, index: 1 },
			];

			const result = workflowExecute.incomingConnectionIsEmpty(runData, inputConnections, 0);
			expect(result).toBe(true);
		});

		test('should return true when input connection node does not exist in runData', () => {
			const runData: IRunData = {};
			const inputConnections: IConnection[] = [
				{ node: 'nonexistentNode', type: NodeConnectionType.Main, index: 0 },
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
						executionTime: 0,
					},
				],
			};

			const inputConnections: IConnection[] = [
				{ node: 'node1', type: NodeConnectionType.Main, index: 0 },
				{ node: 'node1', type: NodeConnectionType.Main, index: 1 },
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
						executionTime: 0,
					},
					{
						source: [],
						data: {
							main: [[{ json: { data: 'test' } }]],
						},
						startTime: 0,
						executionTime: 0,
					},
				],
			};

			const inputConnections: IConnection[] = [
				{ node: 'node1', type: NodeConnectionType.Main, index: 0 },
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
						executionTime: 0,
					},
				],
			};

			const inputConnections: IConnection[] = [
				{ node: 'node1', type: NodeConnectionType.Main, index: 0 },
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
				node1: [{ startTime: 0, executionTime: 0, source: [] }],
			};

			workflowExecute.moveNodeMetadata();

			expect(runExecutionData.resultData.runData.node1[0].metadata).toBeUndefined();
		});

		test('should merge metadata into runData for single node', () => {
			runExecutionData.resultData.runData = {
				node1: [{ startTime: 0, executionTime: 0, source: [] }],
			};
			runExecutionData.executionData!.metadata = {
				node1: [{ parentExecution }],
			};

			workflowExecute.moveNodeMetadata();

			expect(runExecutionData.resultData.runData.node1[0].metadata).toEqual({ parentExecution });
		});

		test('should merge metadata into runData for multiple nodes', () => {
			runExecutionData.resultData.runData = {
				node1: [{ startTime: 0, executionTime: 0, source: [] }],
				node2: [{ startTime: 0, executionTime: 0, source: [] }],
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
					{ startTime: 0, executionTime: 0, source: [] },
					{ startTime: 0, executionTime: 0, source: [] },
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
			workflowExecute = new WorkflowExecute(mock(), 'manual', runExecutionData);

			jest.spyOn(workflowExecute, 'executeHook').mockResolvedValue(undefined);
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
			expect(workflowExecute.executeHook).toHaveBeenCalledWith('workflowExecuteAfter', [
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
});
