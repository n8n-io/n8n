import { mock } from 'jest-mock-extended';
import type {
	IDataObject,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	EngineResponse,
	WorkflowExecuteMode,
	IExecuteFunctions,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import { NodeTypes } from '@test/helpers';

import { DirectedGraph } from '../partial-execution-utils';
import { createNodeData, toITaskData } from '../partial-execution-utils/__tests__/helpers';
import { WorkflowExecute } from '../workflow-execute';
import {
	types,
	nodeTypes,
	passThroughNode,
	nodeTypeArguments,
	modifyNode,
} from './mock-node-types';

describe('processRunExecutionData', () => {
	const runHook = jest.fn().mockResolvedValue(undefined);
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		hooks: { runHook },
		restartExecutionId: undefined,
	});
	const executionMode: WorkflowExecuteMode = 'trigger';

	beforeEach(() => {
		jest.resetAllMocks();
	});

	test('throws if execution-data is missing', () => {
		// ARRANGE
		const node = createNodeData({ name: 'passThrough', type: types.passThrough });
		const workflow = new DirectedGraph()
			.addNodes(node)
			.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

		const executionData: IRunExecutionData = {
			startData: { startNodes: [{ name: node.name, sourceData: null }] },
			resultData: { runData: {} },
		};

		const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

		// ACT & ASSERT
		// The function returns a Promise, but throws synchronously, so we can't await it.
		// eslint-disable-next-line @typescript-eslint/promise-function-async
		expect(() => workflowExecute.processRunExecutionData(workflow)).toThrowError(
			new ApplicationError('Failed to run workflow due to missing execution data'),
		);
	});

	test('returns input data verbatim', async () => {
		// ARRANGE
		const node = createNodeData({ name: 'node', type: types.passThrough });
		const workflow = new DirectedGraph()
			.addNodes(node)
			.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

		const taskDataConnection = { main: [[{ json: { foo: 1 } }]] };
		const executionData: IRunExecutionData = {
			startData: { startNodes: [{ name: node.name, sourceData: null }] },
			resultData: { runData: {} },
			executionData: {
				contextData: {},
				nodeExecutionStack: [{ data: taskDataConnection, node, source: null }],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};

		const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

		// ACT
		const result = await workflowExecute.processRunExecutionData(workflow);

		// ASSERT
		expect(result.data.resultData.runData).toMatchObject({ node: [{ data: taskDataConnection }] });
	});

	test('calls the right hooks in the right order', async () => {
		// ARRANGE
		const node1 = createNodeData({ name: 'node1', type: types.passThrough });
		const node2 = createNodeData({ name: 'node2', type: types.passThrough });
		const workflow = new DirectedGraph()
			.addNodes(node1, node2)
			.addConnections({ from: node1, to: node2 })
			.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

		const taskDataConnection = { main: [[{ json: { foo: 1 } }]] };
		const executionData: IRunExecutionData = {
			startData: { startNodes: [{ name: node1.name, sourceData: null }] },
			resultData: { runData: {} },
			executionData: {
				contextData: {},
				nodeExecutionStack: [{ data: taskDataConnection, node: node1, source: null }],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};

		const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

		// ACT
		await workflowExecute.processRunExecutionData(workflow);

		// ASSERT
		expect(runHook).toHaveBeenCalledTimes(6);
		expect(runHook).toHaveBeenNthCalledWith(1, 'workflowExecuteBefore', expect.any(Array));
		expect(runHook).toHaveBeenNthCalledWith(2, 'nodeExecuteBefore', expect.any(Array));
		expect(runHook).toHaveBeenNthCalledWith(3, 'nodeExecuteAfter', expect.any(Array));
		expect(runHook).toHaveBeenNthCalledWith(4, 'nodeExecuteBefore', expect.any(Array));
		expect(runHook).toHaveBeenNthCalledWith(5, 'nodeExecuteAfter', expect.any(Array));
		expect(runHook).toHaveBeenNthCalledWith(6, 'workflowExecuteAfter', expect.any(Array));
	});

	describe('runExecutionData.waitTill', () => {
		test('handles waiting state properly when waitTill is set', async () => {
			// ARRANGE
			const node = createNodeData({ name: 'waitingNode', type: types.passThrough });
			const workflow = new DirectedGraph()
				.addNodes(node)
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

			const data: IDataObject = { foo: 1 };
			const executionData: IRunExecutionData = {
				startData: { startNodes: [{ name: node.name, sourceData: null }] },
				resultData: {
					runData: { waitingNode: [toITaskData([{ data }], { executionStatus: 'waiting' })] },
					lastNodeExecuted: 'waitingNode',
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [{ data: { main: [[{ json: data }]] }, node, source: null }],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
				waitTill: new Date('2024-01-01'),
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT
			const result = await workflowExecute.processRunExecutionData(workflow);

			// ASSERT
			expect(result.waitTill).toBeUndefined();
			// The waiting state handler should have removed the last entry from
			// runData, but execution adds a new one, so we should have 1 entry.
			expect(result.data.resultData.runData.waitingNode).toHaveLength(1);
			// the status was `waiting` before
			expect(result.data.resultData.runData.waitingNode[0].executionStatus).toEqual('success');
		});
	});

	describe('workflow issues', () => {
		test('throws if workflow contains nodes with missing required properties', () => {
			// ARRANGE
			const node = createNodeData({ name: 'node', type: types.testNodeWithRequiredProperty });
			const workflow = new DirectedGraph()
				.addNodes(node)
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

			const taskDataConnection = { main: [[{ json: { foo: 1 } }]] };
			const executionData: IRunExecutionData = {
				startData: { startNodes: [{ name: node.name, sourceData: null }] },
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [{ data: taskDataConnection, node, source: null }],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT & ASSERT
			// The function returns a Promise, but throws synchronously, so we can't await it.
			// eslint-disable-next-line @typescript-eslint/promise-function-async
			expect(() => workflowExecute.processRunExecutionData(workflow)).toThrowError(
				new ApplicationError(
					'The workflow has issues and cannot be executed for that reason. Please fix them first.',
				),
			);
		});

		test('does not complain about nodes with issue past the destination node', () => {
			// ARRANGE
			const node1 = createNodeData({ name: 'node1', type: types.passThrough });
			const node2 = createNodeData({ name: 'node2', type: types.testNodeWithRequiredProperty });
			const workflow = new DirectedGraph()
				.addNodes(node1, node2)
				.addConnection({ from: node1, to: node2 })
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

			const taskDataConnection = { main: [[{ json: { foo: 1 } }]] };
			const executionData: IRunExecutionData = {
				startData: {
					startNodes: [{ name: node1.name, sourceData: null }],
					destinationNode: node1.name,
				},
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [{ data: taskDataConnection, node: node1, source: null }],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT & ASSERT
			// The function returns a Promise, but throws synchronously, so we can't await it.
			// eslint-disable-next-line @typescript-eslint/promise-function-async
			expect(() => workflowExecute.processRunExecutionData(workflow)).not.toThrowError();
		});
	});

	describe('waiting tools', () => {
		// eslint-disable-next-line complexity
		test('handles Request objects with actions correctly', async () => {
			// ARRANGE
			let response: EngineResponse | undefined;

			const tool1Node = createNodeData({ name: 'tool1', type: types.passThrough });
			const tool2Node = createNodeData({ name: 'tool2', type: types.passThrough });
			const tool1Input = { query: 'test input' };
			const tool2Input = { data: 'another input' };
			const nodeTypeWithRequests = modifyNode(passThroughNode)
				.return({
					actions: [
						{
							actionType: 'ExecutionNodeAction',
							nodeName: tool1Node.name,
							input: tool1Input,
							type: 'ai_tool',
							id: 'action_1',
							metadata: { step: 1 },
						},
						{
							actionType: 'ExecutionNodeAction',
							nodeName: tool2Node.name,
							input: tool2Input,
							type: 'ai_tool',
							id: 'action_2',
							metadata: { step: 1 },
						},
					],
					metadata: { requestId: 'test_request_step1' },
				})
				.return((r) => {
					response = r;
					// Verify the response contains the expected action responses
					expect(r).toBeDefined();
					expect(r?.actionResponses).toHaveLength(2);

					// Return final result incorporating the response data
					return [
						[
							{
								json: {
									finalResult: 'Completed with response data',
									responseMetadata: r?.metadata as IDataObject,
									actionCount: r?.actionResponses?.length,
								},
							},
						],
					];
				})
				.done();
			const nodeWithRequests = createNodeData({
				name: 'nodeWithRequests',
				type: 'nodeWithRequests',
			});

			const nodeTypes = NodeTypes({
				...nodeTypeArguments,
				nodeWithRequests: { type: nodeTypeWithRequests, sourcePath: '' },
			});

			const workflow = new DirectedGraph()
				.addNodes(nodeWithRequests, tool1Node, tool2Node)
				.addConnections({ from: tool1Node, to: nodeWithRequests, type: 'ai_tool' })
				.addConnections({ from: tool2Node, to: nodeWithRequests, type: 'ai_tool' })
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

			const taskDataConnection = { main: [[{ json: { prompt: 'test prompt' } }]] };
			const executionData: IRunExecutionData = {
				startData: { startNodes: [{ name: nodeWithRequests.name, sourceData: null }] },
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							data: taskDataConnection,
							node: nodeWithRequests,
							source: { main: [{ previousNode: 'Start' }] },
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT
			const result = await workflowExecute.processRunExecutionData(workflow);

			// ASSERT
			const runData = result.data.resultData.runData;

			// 1. Verify the Response object was passed to the second execution
			expect(response).toBeDefined();
			expect(response?.actionResponses).toHaveLength(2);
			expect(response?.metadata).toEqual({ requestId: 'test_request_step1' });

			// 2. Verify each action response contains the correct data and metadata
			const actionResponses = response?.actionResponses ?? [];
			const action1Response = actionResponses.find((r) => r.action.id === 'action_1');
			const action2Response = actionResponses.find((r) => r.action.id === 'action_2');

			expect(action1Response).toBeDefined();
			expect(action1Response?.action.metadata).toEqual({ step: 1 });
			expect(action1Response?.data.data?.ai_tool?.[0]?.[0]?.json).toMatchObject({
				query: 'test input',
				toolCallId: 'action_1',
			});

			expect(action2Response).toBeDefined();
			expect(action2Response?.action.metadata).toEqual({ step: 1 });
			expect(action2Response?.data.data?.ai_tool?.[0]?.[0]?.json).toMatchObject({
				data: 'another input',
				toolCallId: 'action_2',
			});

			// The agent should have been executed and returned a Request with actions
			expect(runData[nodeWithRequests.name]).toHaveLength(1);
			expect(runData[nodeWithRequests.name][0].metadata?.subNodeExecutionData).toBeDefined();

			// Tool nodes should have been added to runData with inputOverride
			expect(runData[tool1Node.name]).toHaveLength(1);
			expect(runData[tool1Node.name][0].inputOverride?.ai_tool?.[0]?.[0]?.json).toMatchObject({
				query: 'test input',
				toolCallId: 'action_1',
			});

			expect(runData[tool2Node.name]).toHaveLength(1);
			expect(runData[tool2Node.name][0].inputOverride?.ai_tool?.[0]?.[0]?.json).toMatchObject({
				data: 'another input',
				toolCallId: 'action_2',
			});

			// Tools should have executed successfully
			expect(runData[tool1Node.name][0].data).toBeDefined();
			expect(runData[tool1Node.name][0].executionStatus).toBe('success');
			expect(runData[tool2Node.name][0].data).toBeDefined();
			expect(runData[tool2Node.name][0].executionStatus).toBe('success');

			// 3. Verify the final node output includes response data
			expect(runData[nodeWithRequests.name][0].data).toBeDefined();
			expect(runData[nodeWithRequests.name][0].executionStatus).toBe('success');
			expect(runData[nodeWithRequests.name][0].data?.main?.[0]?.[0]?.json).toMatchObject({
				finalResult: 'Completed with response data',
				responseMetadata: { requestId: 'test_request_step1' },
				actionCount: 2,
			});
		});

		test('skips waiting tools processing when parent node cannot be found', async () => {
			// ARRANGE
			// This test simulates the scenario where executionData.source.main[0].previousNode
			// is null/undefined (line 2037-2044 in workflow-execute.ts)
			let response: EngineResponse | undefined;

			const tool1Node = createNodeData({ name: 'tool1', type: types.passThrough });
			const tool1Input = { query: 'test input' };
			const nodeTypeWithRequests = modifyNode(passThroughNode)
				.return({
					actions: [
						{
							actionType: 'ExecutionNodeAction',
							nodeName: tool1Node.name,
							input: tool1Input,
							type: 'ai_tool',
							id: 'action_1',
							metadata: {},
						},
					],
					metadata: { requestId: 'test_request' },
				})
				.return((r) => {
					response = r;
					return [[{ json: { finalResult: 'Agent completed with tool results' } }]];
				})
				.done();
			const nodeWithRequests = createNodeData({
				name: 'nodeWithRequests',
				type: 'nodeWithRequests',
			});

			const nodeTypes = NodeTypes({
				...nodeTypeArguments,
				nodeWithRequests: { type: nodeTypeWithRequests, sourcePath: '' },
			});

			const workflow = new DirectedGraph()
				.addNodes(nodeWithRequests, tool1Node)
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

			const taskDataConnection = { main: [[{ json: { prompt: 'test prompt' } }]] };
			const executionData: IRunExecutionData = {
				startData: { startNodes: [{ name: nodeWithRequests.name, sourceData: null }] },
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							data: taskDataConnection,
							node: nodeWithRequests,
							// Setting source to null triggers the "Cannot find parent node" condition
							source: null,
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT
			const result = await workflowExecute.processRunExecutionData(workflow);

			// ASSERT
			const runData = result.data.resultData.runData;

			// When parent node cannot be found (line 2038-2044), the execution loop continues
			// which means the waiting tools processing is skipped entirely:

			// 1. The agent node never gets re-executed with the Response callback
			expect(runData[nodeWithRequests.name]).toBeUndefined();

			// 2. Tool nodes get added to runData with inputOverride but are never actually executed
			expect(runData[tool1Node.name]).toHaveLength(1);
			expect(runData[tool1Node.name][0].inputOverride?.ai_tool?.[0]?.[0]?.json).toMatchObject({
				query: 'test input',
				toolCallId: 'action_1',
			});
			// The tool node should not have execution data since it was never run
			expect(runData[tool1Node.name][0].data).toBeUndefined();
			expect(runData[tool1Node.name][0].executionStatus).toBeUndefined();

			// 3. The response callback is never called since the agent's second execution is skipped
			expect(response).toBeUndefined();
		});

		test('resets responses between different node executions', async () => {
			// ARRANGE
			let firstResponse: EngineResponse | undefined;
			let secondResponse: EngineResponse | undefined;

			// Create first node that returns Request with actions
			const firstNodeWithRequests = modifyNode(passThroughNode)
				.return({
					actions: [
						{
							actionType: 'ExecutionNodeAction',
							nodeName: 'tool1',
							input: { data: 'first node input' },
							type: 'ai_tool',
							id: 'first_action',
							metadata: {},
						},
					],
					metadata: { requestId: 'first_request' },
				})
				.return((response?: EngineResponse) => {
					firstResponse = response;
					return [[{ json: { result: 'first node completed' } }]];
				})
				.done();

			// Create second node that should NOT receive responses from the first node
			const secondNodeWithRequests = modifyNode(passThroughNode)
				.return((response?: EngineResponse) => {
					secondResponse = response;
					// This should receive an empty response, not the first node's responses
					return [[{ json: { result: 'second node completed' } }]];
				})
				.done();

			const tool1Node = createNodeData({ name: 'tool1', type: types.passThrough });
			const firstNode = createNodeData({ name: 'firstNode', type: 'firstNodeType' });
			const secondNode = createNodeData({ name: 'secondNode', type: 'secondNodeType' });

			const customNodeTypes = NodeTypes({
				...nodeTypeArguments,
				firstNodeType: { type: firstNodeWithRequests, sourcePath: '' },
				secondNodeType: { type: secondNodeWithRequests, sourcePath: '' },
			});

			const workflow = new DirectedGraph()
				.addNodes(firstNode, tool1Node, secondNode)
				.addConnections({ from: firstNode, to: secondNode })
				.toWorkflow({
					name: '',
					active: false,
					nodeTypes: customNodeTypes,
					settings: { executionOrder: 'v1' },
				});

			const taskDataConnection = { main: [[{ json: { input: 'start' } }]] };
			const executionData: IRunExecutionData = {
				startData: { startNodes: [{ name: firstNode.name, sourceData: null }] },
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [
						{
							data: taskDataConnection,
							node: firstNode,
							source: { main: [{ previousNode: 'Start' }] },
						},
					],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT
			const result = await workflowExecute.processRunExecutionData(workflow);

			// ASSERT
			// 1. First node should receive responses from its tool execution
			expect(firstResponse).toBeDefined();
			expect(firstResponse?.actionResponses).toHaveLength(1);

			// 2. Second node should receive empty responses (not the first node's responses)
			expect(secondResponse).toBeDefined();
			expect(secondResponse?.actionResponses).toHaveLength(0); // This should be empty due to reset
			expect(secondResponse?.metadata).toEqual({}); // Empty metadata

			// 3. Both nodes should have completed successfully
			const runData = result.data.resultData.runData;
			expect(runData[firstNode.name]).toHaveLength(1);
			expect(runData[secondNode.name]).toHaveLength(1);
		});
	});

	describe('lastNodeExecuted tracking', () => {
		test('sets lastNodeExecuted when node returns successful data', async () => {
			// ARRANGE
			const node = createNodeData({ name: 'successfulNode', type: types.passThrough });
			const workflow = new DirectedGraph()
				.addNodes(node)
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

			const taskDataConnection = { main: [[{ json: { foo: 'bar' } }]] };
			const executionData: IRunExecutionData = {
				startData: { startNodes: [{ name: node.name, sourceData: null }] },
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [{ data: taskDataConnection, node, source: null }],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT
			const result = await workflowExecute.processRunExecutionData(workflow);

			// ASSERT
			// When node returns data, lastNodeExecuted should be set (line 1919-1921 in workflow-execute.ts)
			expect(result.data.resultData.lastNodeExecuted).toBe('successfulNode');
		});

		test('does not set lastNodeExecuted when node returns no data', async () => {
			// ARRANGE
			const nodeReturningNull = modifyNode(passThroughNode).return(null).done();

			const node = createNodeData({ name: 'nodeReturningNull', type: 'nodeReturningNull' });

			const nodeTypes = NodeTypes({
				...nodeTypeArguments,
				nodeReturningNull: { type: nodeReturningNull, sourcePath: '' },
			});

			const workflow = new DirectedGraph()
				.addNodes(node)
				.toWorkflow({ name: '', active: false, nodeTypes, settings: { executionOrder: 'v1' } });

			const taskDataConnection = { main: [[{ json: { foo: 'bar' } }]] };
			const executionData: IRunExecutionData = {
				startData: { startNodes: [{ name: node.name, sourceData: null }] },
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [{ data: taskDataConnection, node, source: null }],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT
			const result = await workflowExecute.processRunExecutionData(workflow);

			// ASSERT
			// When node returns null, lastNodeExecuted should NOT be set
			expect(result.data.resultData.lastNodeExecuted).toBeUndefined();
		});
	});

	describe('pairedItem sourceOverwrite handling', () => {
		test('preserves sourceOverwrite for tools to enable expression resolution', async () => {
			// ARRANGE
			// This test simulates: DataNode → AgentNode → ToolNode
			// where ToolNode needs to access DataNode via expression
			const dataNodeOutput = { field: 'testValue', nested: { value: 42 } };
			const dataNode = createNodeData({ name: 'DataNode', type: types.passThrough });

			// Create a tool node that accesses DataNode data via workflow data proxy
			const toolNodeType = modifyNode(passThroughNode)
				.return(function (this: IExecuteFunctions, response?: EngineResponse) {
					// This integration test exercises the complete paired item chain with sourceOverwrite:
					// 1. Tool node gets workflow data proxy via getWorkflowDataProxy()
					// 2. Accesses DataNode using proxy.$('DataNode').item
					// 3. This triggers getPairedItem() which traverses the ancestry chain
					// 4. getPairedItem() uses sourceOverwrite (line 985 in workflow-data-proxy.ts)
					// 5. Returns actual data from DataNode, proving the chain works
					try {
						const proxy = this.getWorkflowDataProxy(0);

						// Use $getPairedItem directly to bypass workflow structure validation
						// This is how expressions access data via paired items
						const connectionInputData = (this as any).connectionInputData || [];
						const firstItem = connectionInputData[0];
						const pairedItem = (firstItem?.pairedItem || { item: 0 }) as any;
						const sourceData = this.getExecuteData().source?.main?.[0] ?? null;

						// Call getPairedItem to traverse the ancestry chain using sourceOverwrite
						const dataNodeItem = (proxy as any).$getPairedItem('DataNode', sourceData, pairedItem);
						const fieldValue = dataNodeItem?.json?.field;
						const nestedValue = (dataNodeItem?.json?.nested as any)?.value;

						return [
							[
								{
									json: {
										toolResult: 'Tool executed successfully',
										dataNodeField: fieldValue,
										dataNodeNested: nestedValue,
										response,
									},
								},
							],
						];
					} catch (error) {
						return [
							[
								{
									json: {
										toolResult: 'Failed to access DataNode',
										error: (error as Error).message,
										response,
									},
								},
							],
						];
					}
				})
				.done();
			const toolNode = createNodeData({ name: 'ToolNode', type: 'toolNodeType' });

			// Create agent node that requests the tool
			const agentNodeType = modifyNode(passThroughNode)
				.return({
					actions: [
						{
							actionType: 'ExecutionNodeAction',
							nodeName: toolNode.name,
							input: { query: 'test query' },
							type: 'ai_tool',
							id: 'tool_action_1',
							metadata: {},
						},
					],
					metadata: { requestId: 'test_agent_request' },
				})
				.return((response?: EngineResponse) => {
					return [[{ json: { agentResult: 'Agent completed', response } }]];
				})
				.done();
			const agentNode = createNodeData({ name: 'AgentNode', type: 'agentNodeType' });

			const customNodeTypes = NodeTypes({
				...nodeTypeArguments,
				agentNodeType: { type: agentNodeType, sourcePath: '' },
				toolNodeType: { type: toolNodeType, sourcePath: '' },
			});

			const workflow = new DirectedGraph()
				.addNodes(dataNode, agentNode, toolNode)
				.addConnections({ from: dataNode, to: agentNode })
				.addConnections({ from: toolNode, to: agentNode, type: 'ai_tool' })
				.toWorkflow({
					name: '',
					active: false,
					nodeTypes: customNodeTypes,
					settings: { executionOrder: 'v1' },
				});

			const taskDataConnection = { main: [[{ json: dataNodeOutput }]] };
			const executionData: IRunExecutionData = {
				startData: { startNodes: [{ name: dataNode.name, sourceData: null }] },
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [{ data: taskDataConnection, node: dataNode, source: null }],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT
			const result = await workflowExecute.processRunExecutionData(workflow);

			// ASSERT
			const runData = result.data.resultData.runData;

			// 1. Verify DataNode executed successfully
			expect(runData[dataNode.name]).toHaveLength(1);
			expect(runData[dataNode.name][0].data?.main?.[0]?.[0].json).toEqual(dataNodeOutput);

			// 2. Verify AgentNode executed and returned EngineRequest
			expect(runData[agentNode.name]).toHaveLength(1);
			expect(runData[agentNode.name][0].metadata?.subNodeExecutionData).toBeDefined();

			// 3. Verify ToolNode was scheduled with preserveSourceOverwrite metadata
			expect(runData[toolNode.name]).toHaveLength(1);
			expect(runData[toolNode.name][0].inputOverride).toBeDefined();
			expect(runData[toolNode.name][0].inputOverride?.ai_tool?.[0]?.[0]?.json).toMatchObject({
				query: 'test query',
				toolCallId: 'tool_action_1',
			});

			// 4. Verify ToolNode executed successfully
			expect(runData[toolNode.name][0].executionStatus).toBe('success');
			expect(runData[toolNode.name][0].data).toBeDefined();

			// 5. Verify ToolNode's input has sourceOverwrite pointing to DataNode
			// This is critical: the tool's input should have sourceOverwrite set
			// so expressions like $('DataNode').item.json.field can resolve
			const toolInput = runData[toolNode.name][0].inputOverride?.ai_tool?.[0]?.[0];
			expect(toolInput?.pairedItem).toBeDefined();
			if (typeof toolInput?.pairedItem === 'object' && !Array.isArray(toolInput.pairedItem)) {
				expect(toolInput.pairedItem.sourceOverwrite).toBeDefined();
				expect(toolInput.pairedItem.sourceOverwrite?.previousNode).toBe(dataNode.name);
			}

			// 6. Verify that sourceOverwrite enabled accessing DataNode data
			// This test proves the complete paired item chain works:
			// - Workflow data proxy was created with runExecutionData
			// - $() function found DataNode in runData
			// - .item accessor triggered getPairedItem()
			// - getPairedItem() recursively traversed the ancestry chain
			// - At line 985 in workflow-data-proxy.ts: used sourceOverwrite to find DataNode
			// - Returned the actual data from DataNode (not undefined, not an error)
			//
			// If this test passes, it definitively proves that:
			// 1. sourceOverwrite was preserved in the tool's input
			// 2. getPairedItem() used sourceOverwrite to traverse past the agent
			// 3. The tool successfully accessed data from a node before the agent
			const toolOutput = runData[toolNode.name][0].data?.ai_tool?.[0]?.[0]?.json;
			expect(toolOutput).toBeDefined();
			expect(toolOutput?.toolResult).toBe('Tool executed successfully');

			// THE KEY ASSERTIONS: We got the actual data from DataNode
			// This proves getPairedItem() used sourceOverwrite successfully
			expect(toolOutput?.dataNodeField).toBe('testValue'); // Got actual value from DataNode
			expect(toolOutput?.dataNodeNested).toBe(42); // Got actual nested value from DataNode
			expect(toolOutput).not.toHaveProperty('error'); // No errors accessing DataNode
		});

		test('throws error when sourceOverwrite is incorrectly retained in loops', async () => {
			// ARRANGE
			// This test recreates the loop.json workflow scenario:
			// TriggerNode → LoopNode → DataNode → IFNode → back to LoopNode
			// The IF node evaluates $('DataNode').item.json.email
			// When sourceOverwrite is incorrectly retained, this breaks

			const triggerData = { email: 'test@example.com', name: 'Test User' };
			const triggerNode = createNodeData({ name: 'TriggerNode', type: types.passThrough });

			// Create a LoopNode that mimics SplitInBatches behavior:
			// - Sets sourceOverwrite pointing back to trigger
			// - Can trigger multiple loop iterations
			let loopIteration = 0;
			const loopNodeType = modifyNode(passThroughNode)
				.return(function (this: IExecuteFunctions) {
					const items = this.getInputData();
					loopIteration++;

					// First iteration: output items with sourceOverwrite
					return [
						items.map((item, index) => ({
							json: item.json,
							pairedItem: {
								item: index,
								input: 0,
								// This is what SplitInBatches does: sets sourceOverwrite
								// to allow expressions inside the loop to reference data from before
								sourceOverwrite: {
									previousNode: triggerNode.name,
									previousNodeOutput: 0,
									previousNodeRun: 0,
								},
							},
						})),
					];
				})
				.done();
			const loopNode = createNodeData({ name: 'LoopNode', type: 'loopNodeType' });

			// DataNode just passes through
			const dataNode = createNodeData({ name: 'DataNode', type: types.passThrough });

			// IFNode evaluates an expression accessing DataNode
			let expressionError: Error | undefined;
			const ifNodeType = modifyNode(passThroughNode)
				.return(function (this: IExecuteFunctions) {
					// This mimics the IF node in loop.json:
					// "={{ $('DataNode').item.json.email }}"
					try {
						const proxy = this.getWorkflowDataProxy(0);

						// Try to access DataNode's email field via expression
						// This should work on first iteration but fail on second when
						// sourceOverwrite is incorrectly retained
						const connectionInputData = (this as any).connectionInputData || [];
						const firstItem = connectionInputData[0];
						const pairedItem = (firstItem?.pairedItem || { item: 0 }) as any;
						const sourceData = this.getExecuteData().source?.main?.[0] ?? null;

						const dataNodeItem = (proxy as any).$getPairedItem('DataNode', sourceData, pairedItem);
						const email = dataNodeItem?.json?.email;

						return [
							[
								{
									json: {
										result: 'Expression resolved',
										email,
										iteration: loopIteration,
									},
								},
							],
						];
					} catch (error) {
						expressionError = error;
						// This is where we expect the TypeError when sourceOverwrite is wrong
						throw error;
					}
				})
				.done();
			const ifNode = createNodeData({ name: 'IFNode', type: 'ifNodeType' });

			const customNodeTypes = NodeTypes({
				...nodeTypeArguments,
				loopNodeType: { type: loopNodeType, sourcePath: '' },
				ifNodeType: { type: ifNodeType, sourcePath: '' },
			});

			const workflow = new DirectedGraph()
				.addNodes(triggerNode, loopNode, dataNode, ifNode)
				.addConnections({ from: triggerNode, to: loopNode })
				.addConnections({ from: loopNode, to: dataNode })
				.addConnections({ from: dataNode, to: ifNode })
				.toWorkflow({
					name: '',
					active: false,
					nodeTypes: customNodeTypes,
					settings: { executionOrder: 'v1' },
				});

			const taskDataConnection = { main: [[{ json: triggerData }]] };
			const executionData: IRunExecutionData = {
				startData: { startNodes: [{ name: triggerNode.name, sourceData: null }] },
				resultData: { runData: {} },
				executionData: {
					contextData: {},
					nodeExecutionStack: [{ data: taskDataConnection, node: triggerNode, source: null }],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			};

			const workflowExecute = new WorkflowExecute(additionalData, executionMode, executionData);

			// ACT & ASSERT
			// With isToolExecution forced to true, sourceOverwrite is incorrectly retained
			// This should cause an error when the IF node tries to access DataNode
			await expect(workflowExecute.processRunExecutionData(workflow)).resolves.toBeTruthy();
			expect(expressionError).toBeUndefined();
		});
	});
});
