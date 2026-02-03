import type { Tool } from '@langchain/core/tools';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { mock } from 'jest-mock-extended';
import type {
	INode,
	ITaskDataConnections,
	IRunExecutionData,
	INodeExecutionData,
	IExecuteData,
	IWorkflowExecuteAdditionalData,
	Workflow,
	INodeType,
	INodeTypes,
	IExecuteFunctions,
	IRunData,
	ITaskData,
	EngineRequest,
	WorkflowExecuteMode,
	CloseFunction,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { z } from 'zod';

import { ExecuteContext } from '../../execute-context';
import { SupplyDataContext } from '../../supply-data-context';
import { StructuredToolkit } from '../ai-tool-types';
import {
	createHitlToolkit,
	createHitlToolSupplyData,
	extendResponseMetadata,
	makeHandleToolInvocation,
} from '../get-input-connection-data';

// Mock getSchema
jest.mock('../create-node-as-tool', () => ({
	...jest.requireActual('../create-node-as-tool'),
	getSchema: jest.fn(),
}));

describe('getInputConnectionData', () => {
	const agentNode = mock<INode>({
		name: 'Test Agent',
		type: 'test.agent',
		parameters: {},
	});
	const agentNodeType = mock<INodeType>({
		description: {
			inputs: [],
		},
	});
	const nodeTypes = mock<INodeTypes>();
	const workflow = mock<Workflow>({
		id: 'test-workflow',
		active: false,
		nodeTypes,
	});
	const runExecutionData = mock<IRunExecutionData>({
		resultData: { runData: {} },
	});
	const connectionInputData = [] as INodeExecutionData[];
	const inputData = {} as ITaskDataConnections;
	const executeData = {} as IExecuteData;

	const hooks = mock<Required<IWorkflowExecuteAdditionalData['hooks']>>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ hooks });

	let executeContext: ExecuteContext;

	beforeEach(() => {
		jest.clearAllMocks();

		executeContext = new ExecuteContext(
			workflow,
			agentNode,
			additionalData,
			'internal',
			runExecutionData,
			0,
			connectionInputData,
			inputData,
			executeData,
			[],
		);

		jest.spyOn(executeContext, 'getNode').mockReturnValue(agentNode);
		nodeTypes.getByNameAndVersion
			.calledWith(agentNode.type, expect.anything())
			.mockReturnValue(agentNodeType);

		// Mock getConnections method used by validateInputConfiguration
		// This will be overridden in individual tests as needed
		jest.spyOn(executeContext, 'getConnections').mockReturnValue([]);
	});

	describe.each([
		NodeConnectionTypes.AiAgent,
		NodeConnectionTypes.AiChain,
		NodeConnectionTypes.AiDocument,
		NodeConnectionTypes.AiEmbedding,
		NodeConnectionTypes.AiLanguageModel,
		NodeConnectionTypes.AiMemory,
		NodeConnectionTypes.AiOutputParser,
		NodeConnectionTypes.AiRetriever,
		NodeConnectionTypes.AiTextSplitter,
		NodeConnectionTypes.AiVectorStore,
	] as const)('%s', (connectionType) => {
		const response = mock();
		const node = mock<INode>({
			name: 'First Node',
			type: 'test.type',
			disabled: false,
		});
		const secondNode = mock<INode>({ name: 'Second Node', type: 'test.type', disabled: false });
		const supplyData = jest.fn().mockResolvedValue({ response });
		const nodeType = mock<INodeType>({ supplyData });

		beforeEach(() => {
			nodeTypes.getByNameAndVersion
				.calledWith(node.type, expect.anything())
				.mockReturnValue(nodeType);
			workflow.getParentNodes
				.calledWith(agentNode.name, connectionType)
				.mockReturnValue([node.name]);
			workflow.getNode.calledWith(node.name).mockReturnValue(node);
			workflow.getNode.calledWith(secondNode.name).mockReturnValue(secondNode);
		});

		it('should throw when no inputs are defined', async () => {
			agentNodeType.description.inputs = [];

			await expect(executeContext.getInputConnectionData(connectionType, 0)).rejects.toThrow(
				'Node does not have input of type',
			);
			expect(supplyData).not.toHaveBeenCalled();
		});

		it('should return undefined when no nodes are connected and input is not required', async () => {
			agentNodeType.description.inputs = [
				{
					type: connectionType,
					maxConnections: 1,
					required: false,
				},
			];
			workflow.getParentNodes.mockReturnValueOnce([]);
			(executeContext.getConnections as jest.Mock).mockReturnValueOnce([]);

			const result = await executeContext.getInputConnectionData(connectionType, 0);
			expect(result).toBeUndefined();
			expect(supplyData).not.toHaveBeenCalled();
		});

		it('should throw when too many nodes are connected', async () => {
			agentNodeType.description.inputs = [
				{
					type: connectionType,
					maxConnections: 1,
					required: true,
				},
			];
			workflow.getParentNodes.mockReturnValueOnce([node.name, secondNode.name]);
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([
					[{ node: node.name, type: connectionType, index: 0 }],
					[{ node: secondNode.name, type: connectionType, index: 0 }],
				]);

			await expect(executeContext.getInputConnectionData(connectionType, 0)).rejects.toThrow(
				`Only 1 ${connectionType} sub-nodes are/is allowed to be connected`,
			);
			expect(supplyData).not.toHaveBeenCalled();
		});

		it('should throw when required node is not connected', async () => {
			agentNodeType.description.inputs = [
				{
					type: connectionType,
					required: true,
				},
			];
			workflow.getParentNodes.mockReturnValueOnce([]);
			jest.spyOn(executeContext, 'getConnections').mockReturnValueOnce([]);

			await expect(executeContext.getInputConnectionData(connectionType, 0)).rejects.toThrow(
				'must be connected and enabled',
			);
			expect(supplyData).not.toHaveBeenCalled();
		});

		it('should handle disabled nodes', async () => {
			agentNodeType.description.inputs = [
				{
					type: connectionType,
					required: true,
				},
			];

			const disabledNode = mock<INode>({
				name: 'Disabled Node',
				type: 'test.type',
				disabled: true,
			});
			workflow.getParentNodes.mockReturnValueOnce([disabledNode.name]);
			workflow.getNode.calledWith(disabledNode.name).mockReturnValue(disabledNode);
			// Mock connections that include the disabled node, but getConnectedNodes will filter it out
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([[{ node: disabledNode.name, type: connectionType, index: 0 }]]);

			await expect(executeContext.getInputConnectionData(connectionType, 0)).rejects.toThrow(
				'must be connected and enabled',
			);
			expect(supplyData).not.toHaveBeenCalled();
		});

		it('should handle node execution errors', async () => {
			agentNodeType.description.inputs = [
				{
					type: connectionType,
					required: true,
				},
			];
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([[{ node: node.name, type: connectionType, index: 0 }]]);

			supplyData.mockRejectedValueOnce(new Error('supplyData error'));

			await expect(executeContext.getInputConnectionData(connectionType, 0)).rejects.toThrow(
				`Error in sub-node ${node.name}`,
			);
			expect(supplyData).toHaveBeenCalled();
		});

		it('should propagate configuration errors', async () => {
			agentNodeType.description.inputs = [
				{
					type: connectionType,
					required: true,
				},
			];
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([[{ node: node.name, type: connectionType, index: 0 }]]);

			const configError = new NodeOperationError(node, 'Config Error in node', {
				functionality: 'configuration-node',
			});
			supplyData.mockRejectedValueOnce(configError);

			await expect(executeContext.getInputConnectionData(connectionType, 0)).rejects.toThrow(
				configError.message,
			);
			expect(nodeType.supplyData).toHaveBeenCalled();
		});

		it('should handle close functions', async () => {
			agentNodeType.description.inputs = [
				{
					type: connectionType,
					maxConnections: 1,
					required: true,
				},
			];
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([[{ node: node.name, type: connectionType, index: 0 }]]);

			const closeFunction = jest.fn();
			supplyData.mockResolvedValueOnce({ response, closeFunction });

			const result = await executeContext.getInputConnectionData(connectionType, 0);
			expect(result).toBe(response);
			expect(supplyData).toHaveBeenCalled();
			// @ts-expect-error private property
			expect(executeContext.closeFunctions).toContain(closeFunction);
		});

		it('should handle multiple input configurations of the same type with different max connections', async () => {
			agentNodeType.description.inputs = [
				{
					type: connectionType,
					maxConnections: 2,
					required: true,
				},
				{
					type: connectionType,
					maxConnections: 1,
					required: false,
				},
			];

			const thirdNode = mock<INode>({ name: 'Third Node', type: 'test.type', disabled: false });

			// Mock node types for all connected nodes
			nodeTypes.getByNameAndVersion
				.calledWith(secondNode.type, expect.anything())
				.mockReturnValue(nodeType);
			nodeTypes.getByNameAndVersion
				.calledWith(thirdNode.type, expect.anything())
				.mockReturnValue(nodeType);

			workflow.getParentNodes.mockReturnValueOnce([node.name, secondNode.name, thirdNode.name]);
			workflow.getNode.calledWith(thirdNode.name).mockReturnValue(thirdNode);
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([
					[{ node: node.name, type: connectionType, index: 0 }],
					[{ node: secondNode.name, type: connectionType, index: 0 }],
					[{ node: thirdNode.name, type: connectionType, index: 0 }],
				]);

			const result = await executeContext.getInputConnectionData(connectionType, 0);
			expect(result).toEqual([response, response, response]);
			expect(supplyData).toHaveBeenCalledTimes(3);
		});

		it('should throw when exceeding total max connections across multiple input configurations', async () => {
			agentNodeType.description.inputs = [
				{
					type: connectionType,
					maxConnections: 1,
					required: true,
				},
				{
					type: connectionType,
					maxConnections: 1,
					required: false,
				},
			];

			const thirdNode = mock<INode>({ name: 'Third Node', type: 'test.type', disabled: false });

			// Mock node types for all connected nodes
			nodeTypes.getByNameAndVersion
				.calledWith(secondNode.type, expect.anything())
				.mockReturnValue(nodeType);
			nodeTypes.getByNameAndVersion
				.calledWith(thirdNode.type, expect.anything())
				.mockReturnValue(nodeType);

			workflow.getParentNodes.mockReturnValueOnce([node.name, secondNode.name, thirdNode.name]);
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([
					[{ node: node.name, type: connectionType, index: 0 }],
					[{ node: secondNode.name, type: connectionType, index: 0 }],
					[{ node: thirdNode.name, type: connectionType, index: 0 }],
				]);

			await expect(executeContext.getInputConnectionData(connectionType, 0)).rejects.toThrow(
				`Only 2 ${connectionType} sub-nodes are/is allowed to be connected`,
			);
			expect(supplyData).not.toHaveBeenCalled();
		});

		it('should return array when multiple input configurations exist even with single connection', async () => {
			agentNodeType.description.inputs = [
				{
					type: connectionType,
					maxConnections: 1,
					required: true,
				},
				{
					type: connectionType,
					maxConnections: 2,
					required: false,
				},
			];
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([[{ node: node.name, type: connectionType, index: 0 }]]);

			const result = await executeContext.getInputConnectionData(connectionType, 0);
			expect(result).toEqual([response]);
			expect(supplyData).toHaveBeenCalledTimes(1);
		});

		it('should return empty array when no connections and multiple optional inputs', async () => {
			agentNodeType.description.inputs = [
				{
					type: connectionType,
					maxConnections: 1,
					required: false,
				},
				{
					type: connectionType,
					maxConnections: 1,
					required: false,
				},
			];
			workflow.getParentNodes.mockReturnValueOnce([]);
			jest.spyOn(executeContext, 'getConnections').mockReturnValueOnce([]);

			const result = await executeContext.getInputConnectionData(connectionType, 0);
			expect(result).toEqual([]);
			expect(supplyData).not.toHaveBeenCalled();
		});
	});

	describe(NodeConnectionTypes.AiTool, () => {
		const mockTool = mock<Tool>();
		const toolNode = mock<INode>({
			name: 'Test Tool',
			type: 'test.tool',
			disabled: false,
		});
		const supplyData = jest.fn().mockResolvedValue({ response: mockTool });
		const toolNodeType = mock<INodeType>({ supplyData });

		const secondToolNode = mock<INode>({
			name: 'Second Tool',
			type: 'test.secondTool',
			disabled: false,
		});
		const secondMockTool = mock<Tool>();
		const secondToolNodeType = mock<INodeType>({
			supplyData: jest.fn().mockResolvedValue({ response: secondMockTool }),
		});

		beforeEach(() => {
			nodeTypes.getByNameAndVersion
				.calledWith(toolNode.type, expect.anything())
				.mockReturnValue(toolNodeType);
			workflow.getParentNodes
				.calledWith(agentNode.name, NodeConnectionTypes.AiTool)
				.mockReturnValue([toolNode.name]);
			workflow.getNode.calledWith(toolNode.name).mockReturnValue(toolNode);
			workflow.getNode.calledWith(secondToolNode.name).mockReturnValue(secondToolNode);
		});

		it('should return empty array when no tools are connected and input is not required', async () => {
			agentNodeType.description.inputs = [
				{
					type: NodeConnectionTypes.AiTool,
					required: false,
				},
			];
			workflow.getParentNodes.mockReturnValueOnce([]);
			jest.spyOn(executeContext, 'getConnections').mockReturnValueOnce([]);

			const result = await executeContext.getInputConnectionData(NodeConnectionTypes.AiTool, 0);
			expect(result).toEqual([]);
			expect(supplyData).not.toHaveBeenCalled();
		});

		it('should throw when required tool node is not connected', async () => {
			agentNodeType.description.inputs = [
				{
					type: NodeConnectionTypes.AiTool,
					required: true,
				},
			];
			workflow.getParentNodes.mockReturnValueOnce([]);
			jest.spyOn(executeContext, 'getConnections').mockReturnValueOnce([]);

			await expect(
				executeContext.getInputConnectionData(NodeConnectionTypes.AiTool, 0),
			).rejects.toThrow('must be connected and enabled');
			expect(supplyData).not.toHaveBeenCalled();
		});

		it('should handle disabled tool nodes', async () => {
			const disabledToolNode = mock<INode>({
				name: 'Disabled Tool',
				type: 'test.tool',
				disabled: true,
			});

			agentNodeType.description.inputs = [
				{
					type: NodeConnectionTypes.AiTool,
					required: true,
				},
			];

			workflow.getParentNodes
				.calledWith(agentNode.name, NodeConnectionTypes.AiTool)
				.mockReturnValue([disabledToolNode.name]);
			workflow.getNode.calledWith(disabledToolNode.name).mockReturnValue(disabledToolNode);
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([
					[{ node: disabledToolNode.name, type: NodeConnectionTypes.AiTool, index: 0 }],
				]);

			await expect(
				executeContext.getInputConnectionData(NodeConnectionTypes.AiTool, 0),
			).rejects.toThrow('must be connected and enabled');
			expect(supplyData).not.toHaveBeenCalled();
		});

		it('should handle multiple connected tools', async () => {
			agentNodeType.description.inputs = [
				{
					type: NodeConnectionTypes.AiTool,
					required: true,
				},
			];

			nodeTypes.getByNameAndVersion
				.calledWith(secondToolNode.type, expect.anything())
				.mockReturnValue(secondToolNodeType);

			workflow.getParentNodes
				.calledWith(agentNode.name, NodeConnectionTypes.AiTool)
				.mockReturnValue([toolNode.name, secondToolNode.name]);
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([
					[{ node: toolNode.name, type: NodeConnectionTypes.AiTool, index: 0 }],
					[{ node: secondToolNode.name, type: NodeConnectionTypes.AiTool, index: 0 }],
				]);

			const result = await executeContext.getInputConnectionData(NodeConnectionTypes.AiTool, 0);
			expect(result).toEqual([mockTool, secondMockTool]);
			expect(supplyData).toHaveBeenCalled();
			expect(secondToolNodeType.supplyData).toHaveBeenCalled();
		});

		it('should handle tool execution errors', async () => {
			supplyData.mockRejectedValueOnce(new Error('Tool execution error'));

			agentNodeType.description.inputs = [
				{
					type: NodeConnectionTypes.AiTool,
					required: true,
				},
			];
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([
					[{ node: toolNode.name, type: NodeConnectionTypes.AiTool, index: 0 }],
				]);

			await expect(
				executeContext.getInputConnectionData(NodeConnectionTypes.AiTool, 0),
			).rejects.toThrow(`Error in sub-node ${toolNode.name}`);
			expect(supplyData).toHaveBeenCalled();
		});

		it('should return the tool when there are no issues', async () => {
			agentNodeType.description.inputs = [
				{
					type: NodeConnectionTypes.AiTool,
					required: true,
				},
			];
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([
					[{ node: toolNode.name, type: NodeConnectionTypes.AiTool, index: 0 }],
				]);

			const result = await executeContext.getInputConnectionData(NodeConnectionTypes.AiTool, 0);
			expect(result).toEqual([mockTool]);
			expect(supplyData).toHaveBeenCalled();
		});
	});
});

describe('makeHandleToolInvocation', () => {
	const connectedNode = mock<INode>({
		name: 'Test Tool Node',
		type: 'test.tool',
	});
	const execute = jest.fn();
	const connectedNodeType = mock<INodeType>({
		execute,
	});
	const contextFactory = jest.fn();
	const taskData = mock<ITaskData>();

	let runExecutionData = mock<IRunExecutionData>({
		resultData: {
			runData: mock<IRunData>(),
		},
	});
	const toolArgs = { key: 'value' };

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return stringified results when execution is successful', async () => {
		const mockContext = mock<IExecuteFunctions>();
		contextFactory.mockReturnValue(mockContext);

		const mockResult = [[{ json: { result: 'success' } }]];
		execute.mockResolvedValueOnce(mockResult);

		const handleToolInvocation = makeHandleToolInvocation(
			contextFactory,
			connectedNode,
			connectedNodeType,
			runExecutionData,
		);
		const result = await handleToolInvocation(toolArgs);

		expect(result).toBe(JSON.stringify([{ result: 'success' }]));
		expect(mockContext.addOutputData).toHaveBeenCalledWith(NodeConnectionTypes.AiTool, 0, [
			[{ json: { response: [{ result: 'success' }] } }],
		]);
	});

	it('should handle binary data and return a warning message', async () => {
		const mockContext = mock<IExecuteFunctions>();
		contextFactory.mockReturnValue(mockContext);
		const mockResult = [[{ json: {}, binary: { file: 'data' } }]];
		execute.mockResolvedValueOnce(mockResult);

		const handleToolInvocation = makeHandleToolInvocation(
			contextFactory,
			connectedNode,
			connectedNodeType,
			runExecutionData,
		);
		const result = await handleToolInvocation(toolArgs);

		expect(result).toBe(
			'"Error: The Tool attempted to return binary data, which is not supported in Agents"',
		);
		expect(mockContext.addOutputData).toHaveBeenCalledWith(NodeConnectionTypes.AiTool, 0, [
			[
				{
					json: {
						response:
							'Error: The Tool attempted to return binary data, which is not supported in Agents',
					},
				},
			],
		]);
	});

	it('should handle engine requests and return a warning message', async () => {
		const mockContext = mock<IExecuteFunctions>();
		contextFactory.mockReturnValue(mockContext);
		const mockResult: EngineRequest = { actions: [], metadata: {} };
		execute.mockResolvedValueOnce(mockResult);

		const handleToolInvocation = makeHandleToolInvocation(
			contextFactory,
			connectedNode,
			connectedNodeType,
			runExecutionData,
		);
		const result = await handleToolInvocation(toolArgs);

		expect(result).toBe(
			'"Error: The Tool attempted to return an engine request, which is not supported in Agents"',
		);
		expect(mockContext.addOutputData).toHaveBeenCalledWith(NodeConnectionTypes.AiTool, 0, [
			[
				{
					json: {
						response:
							'Error: The Tool attempted to return an engine request, which is not supported in Agents',
					},
				},
			],
		]);
	});

	it('should continue if json and binary data exist', async () => {
		const warnFn = jest.fn();
		const mockContext = mock<IExecuteFunctions>({
			logger: {
				warn: warnFn,
			},
		});
		contextFactory.mockReturnValue(mockContext);
		const mockResult = [[{ json: { a: 3 }, binary: { file: 'data' } }]];
		execute.mockResolvedValueOnce(mockResult);

		const handleToolInvocation = makeHandleToolInvocation(
			contextFactory,
			connectedNode,
			connectedNodeType,
			runExecutionData,
		);
		const result = await handleToolInvocation(toolArgs);

		expect(result).toBe('[{"a":3}]');
		expect(mockContext.addOutputData).toHaveBeenCalledWith(NodeConnectionTypes.AiTool, 0, [
			[
				{
					json: {
						response: [{ a: 3 }],
					},
				},
			],
		]);
		expect(warnFn).toHaveBeenCalled();
	});

	it('should handle execution errors and return an error message', async () => {
		const mockContext = mock<IExecuteFunctions>();
		contextFactory.mockReturnValue(mockContext);
		const error = new Error('Execution failed');
		execute.mockRejectedValueOnce(error);

		const handleToolInvocation = makeHandleToolInvocation(
			contextFactory,
			connectedNode,
			connectedNodeType,
			runExecutionData,
		);
		const result = handleToolInvocation(toolArgs);

		await expect(result).rejects.toThrow('Execution failed');
		expect(mockContext.addOutputData).toHaveBeenCalledWith(
			NodeConnectionTypes.AiTool,
			0,
			expect.any(NodeOperationError),
		);
	});

	it('should increment the toolRunIndex for each invocation', async () => {
		const mockContext = mock<IExecuteFunctions>();
		contextFactory.mockReturnValue(mockContext);

		let handleToolInvocation = makeHandleToolInvocation(
			contextFactory,
			connectedNode,
			connectedNodeType,
			runExecutionData,
		);
		await handleToolInvocation(toolArgs);

		runExecutionData = mock<IRunExecutionData>({
			resultData: {
				runData: {
					[connectedNode.name]: [taskData],
				},
			},
		});
		handleToolInvocation = makeHandleToolInvocation(
			contextFactory,
			connectedNode,
			connectedNodeType,
			runExecutionData,
		);
		await handleToolInvocation(toolArgs);

		runExecutionData = mock<IRunExecutionData>({
			resultData: {
				runData: {
					[connectedNode.name]: [taskData, taskData],
				},
			},
		});
		handleToolInvocation = makeHandleToolInvocation(
			contextFactory,
			connectedNode,
			connectedNodeType,
			runExecutionData,
		);
		await handleToolInvocation(toolArgs);

		expect(contextFactory).toHaveBeenCalledWith(0);
		expect(contextFactory).toHaveBeenCalledWith(1);
		expect(contextFactory).toHaveBeenCalledWith(2);
	});

	describe('retry functionality', () => {
		const contextFactory = jest.fn();
		const toolArgs = { input: 'test' };
		let handleToolInvocation: ReturnType<typeof makeHandleToolInvocation>;
		let mockContext: unknown;

		beforeEach(() => {
			jest.clearAllMocks();
			mockContext = {
				addInputData: jest.fn(),
				addOutputData: jest.fn(),
				logger: { warn: jest.fn() },
			};
			contextFactory.mockReturnValue(mockContext);
		});

		it('should not retry when retryOnFail is false', async () => {
			const connectedNode = mock<INode>({
				name: 'Test Tool',
				retryOnFail: false,
			});
			const connectedNodeType = mock<INodeType>({
				execute: jest.fn().mockRejectedValue(new Error('Test error')),
			});

			handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				connectedNode,
				connectedNodeType,
				runExecutionData,
			);

			const result = handleToolInvocation(toolArgs);

			await expect(result).rejects.toThrow('Test error');

			expect(contextFactory).toHaveBeenCalledTimes(1);
			expect(connectedNodeType.execute).toHaveBeenCalledTimes(1);
		});

		it('should retry up to maxTries when retryOnFail is true', async () => {
			const connectedNode = mock<INode>({
				name: 'Test Tool',
				retryOnFail: true,
				maxTries: 3,
				waitBetweenTries: 0,
			});
			const connectedNodeType = mock<INodeType>({
				execute: jest.fn().mockRejectedValue(new Error('Test error')),
			});

			handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				connectedNode,
				connectedNodeType,
				runExecutionData,
			);

			const result = handleToolInvocation(toolArgs);

			await expect(result).rejects.toThrow('Test error');
			expect(contextFactory).toHaveBeenCalledTimes(3);
			expect(connectedNodeType.execute).toHaveBeenCalledTimes(3);
		});

		it('should succeed on retry after initial failure', async () => {
			const connectedNode = mock<INode>({
				name: 'Test Tool',
				retryOnFail: true,
				maxTries: 3,
				waitBetweenTries: 0,
			});
			const connectedNodeType = mock<INodeType>({
				execute: jest
					.fn()
					.mockRejectedValueOnce(new Error('First attempt fails'))
					.mockResolvedValueOnce([[{ json: { result: 'success' } }]]),
			});

			handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				connectedNode,
				connectedNodeType,
				runExecutionData,
			);

			const result = await handleToolInvocation(toolArgs);

			expect(contextFactory).toHaveBeenCalledTimes(2);
			expect(connectedNodeType.execute).toHaveBeenCalledTimes(2);
			expect(result).toBe(JSON.stringify([{ result: 'success' }]));
		});

		it('should respect maxTries limits (2-5)', async () => {
			const testCases = [
				{ maxTries: 1, expected: 2 }, // Should be clamped to minimum 2
				{ maxTries: 3, expected: 3 },
				{ maxTries: 6, expected: 5 }, // Should be clamped to maximum 5
			];

			for (const { maxTries, expected } of testCases) {
				jest.clearAllMocks();

				const connectedNode = mock<INode>({
					name: 'Test Tool',
					retryOnFail: true,
					maxTries,
					waitBetweenTries: 0,
				});
				const connectedNodeType = mock<INodeType>({
					execute: jest.fn().mockRejectedValue(new Error('Test error')),
				});

				handleToolInvocation = makeHandleToolInvocation(
					contextFactory,
					connectedNode,
					connectedNodeType,
					runExecutionData,
				);

				const result = handleToolInvocation(toolArgs);
				await expect(result).rejects.toThrow('Test error');

				expect(connectedNodeType.execute).toHaveBeenCalledTimes(expected);
			}
		});

		it('should respect waitBetweenTries limits (0-5000ms)', async () => {
			const sleepWithAbortSpy = jest
				.spyOn(require('n8n-workflow'), 'sleepWithAbort')
				.mockResolvedValue(undefined);

			const connectedNode = mock<INode>({
				name: 'Test Tool',
				retryOnFail: true,
				maxTries: 2,
				waitBetweenTries: 1500,
			});
			const connectedNodeType = mock<INodeType>({
				execute: jest.fn().mockRejectedValue(new Error('Test error')),
			});

			handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				connectedNode,
				connectedNodeType,
				runExecutionData,
			);

			const result = handleToolInvocation(toolArgs);

			await expect(result).rejects.toThrow('Test error');

			expect(sleepWithAbortSpy).toHaveBeenCalledWith(1500, undefined);
			sleepWithAbortSpy.mockRestore();
		});
	});

	describe('abort signal functionality', () => {
		const contextFactory = jest.fn();
		const toolArgs = { input: 'test' };
		let handleToolInvocation: ReturnType<typeof makeHandleToolInvocation>;
		let mockContext: unknown;
		let abortController: AbortController;

		beforeEach(() => {
			jest.clearAllMocks();
			abortController = new AbortController();
			mockContext = {
				addInputData: jest.fn(),
				addOutputData: jest.fn(),
				logger: { warn: jest.fn() },
				getExecutionCancelSignal: jest.fn(() => abortController.signal),
			};
			contextFactory.mockReturnValue(mockContext);
		});

		it('should return cancellation message if signal is already aborted', async () => {
			const connectedNode = mock<INode>({
				name: 'Test Tool',
				retryOnFail: true,
				maxTries: 3,
				waitBetweenTries: 100,
			});
			const connectedNodeType = mock<INodeType>({
				execute: jest.fn().mockResolvedValue([[{ json: { result: 'success' } }]]),
			});

			// Abort before starting
			abortController.abort();

			handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				connectedNode,
				connectedNodeType,
				runExecutionData,
			);

			const result = await handleToolInvocation(toolArgs);

			expect(result).toBe('Error during node execution: Execution was cancelled');
			expect(connectedNodeType.execute).not.toHaveBeenCalled();
		});

		it('should handle abort signal during retry wait', async () => {
			const sleepWithAbortSpy = jest
				.spyOn(require('n8n-workflow'), 'sleepWithAbort')
				.mockRejectedValue(new Error('Execution was cancelled'));

			const connectedNode = mock<INode>({
				name: 'Test Tool',
				retryOnFail: true,
				maxTries: 3,
				waitBetweenTries: 1000,
			});
			const connectedNodeType = mock<INodeType>({
				execute: jest
					.fn()
					.mockRejectedValueOnce(new Error('First attempt fails'))
					.mockResolvedValueOnce([[{ json: { result: 'success' } }]]),
			});

			handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				connectedNode,
				connectedNodeType,
				runExecutionData,
			);

			const result = await handleToolInvocation(toolArgs);

			expect(result).toBe('Error during node execution: Execution was cancelled');
			expect(sleepWithAbortSpy).toHaveBeenCalledWith(1000, abortController.signal);
			expect(connectedNodeType.execute).toHaveBeenCalledTimes(1); // Only first attempt

			sleepWithAbortSpy.mockRestore();
		});

		it('should handle abort signal during execution', async () => {
			const connectedNode = mock<INode>({
				name: 'Test Tool',
				retryOnFail: true,
				maxTries: 3,
				waitBetweenTries: 0,
			});
			const connectedNodeType = mock<INodeType>({
				execute: jest.fn().mockImplementation(() => {
					// Simulate abort during execution
					abortController.abort();
					throw new Error('Execution failed');
				}),
			});

			handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				connectedNode,
				connectedNodeType,
				runExecutionData,
			);

			const result = handleToolInvocation(toolArgs);

			await expect(result).rejects.toThrow('Execution was cancelled');
			expect(connectedNodeType.execute).toHaveBeenCalledTimes(1);
		});

		it('should complete successfully if not aborted', async () => {
			const connectedNode = mock<INode>({
				name: 'Test Tool',
				retryOnFail: true,
				maxTries: 3,
				waitBetweenTries: 10,
			});
			const connectedNodeType = mock<INodeType>({
				execute: jest
					.fn()
					.mockRejectedValueOnce(new Error('First attempt fails'))
					.mockResolvedValueOnce([[{ json: { result: 'success' } }]]),
			});

			const sleepWithAbortSpy = jest
				.spyOn(require('n8n-workflow'), 'sleepWithAbort')
				.mockResolvedValue(undefined);

			handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				connectedNode,
				connectedNodeType,
				runExecutionData,
			);

			const result = await handleToolInvocation(toolArgs);

			expect(result).toBe(JSON.stringify([{ result: 'success' }]));
			expect(connectedNodeType.execute).toHaveBeenCalledTimes(2);
			expect(sleepWithAbortSpy).toHaveBeenCalledWith(10, abortController.signal);

			sleepWithAbortSpy.mockRestore();
		});

		it('should work when getExecutionCancelSignal is not available', async () => {
			const contextWithoutSignal = {
				addInputData: jest.fn(),
				addOutputData: jest.fn(),
				logger: { warn: jest.fn() },
				// No getExecutionCancelSignal method
			};
			contextFactory.mockReturnValue(contextWithoutSignal);

			const connectedNode = mock<INode>({
				name: 'Test Tool',
				retryOnFail: true,
				maxTries: 2,
				waitBetweenTries: 10,
			});
			const connectedNodeType = mock<INodeType>({
				execute: jest
					.fn()
					.mockRejectedValueOnce(new Error('First attempt fails'))
					.mockResolvedValueOnce([[{ json: { result: 'success' } }]]),
			});

			const sleepWithAbortSpy = jest
				.spyOn(require('n8n-workflow'), 'sleepWithAbort')
				.mockResolvedValue(undefined);

			handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				connectedNode,
				connectedNodeType,
				runExecutionData,
			);

			const result = await handleToolInvocation(toolArgs);

			expect(result).toBe(JSON.stringify([{ result: 'success' }]));
			expect(sleepWithAbortSpy).toHaveBeenCalledWith(10, undefined);

			sleepWithAbortSpy.mockRestore();
		});
	});
});

describe('HITL Tool handling', () => {
	const agentNode = mock<INode>({
		name: 'Test Agent',
		type: 'test.agent',
		parameters: {},
	});
	const agentNodeType = mock<INodeType>({
		description: {
			inputs: [],
		},
	});
	const nodeTypes = mock<INodeTypes>();
	const workflow = mock<Workflow>({
		id: 'test-workflow',
		active: false,
		nodeTypes,
	});
	const runExecutionData = mock<IRunExecutionData>({
		resultData: { runData: {} },
	});
	const connectionInputData = [] as INodeExecutionData[];
	const inputData = {} as ITaskDataConnections;
	const executeData = {} as IExecuteData;

	const hooks = mock<Required<IWorkflowExecuteAdditionalData['hooks']>>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ hooks });

	let executeContext: ExecuteContext;

	beforeEach(() => {
		jest.clearAllMocks();

		executeContext = new ExecuteContext(
			workflow,
			agentNode,
			additionalData,
			'internal',
			runExecutionData,
			0,
			connectionInputData,
			inputData,
			executeData,
			[],
		);

		jest.spyOn(executeContext, 'getNode').mockReturnValue(agentNode);
		nodeTypes.getByNameAndVersion
			.calledWith(agentNode.type, expect.anything())
			.mockReturnValue(agentNodeType);
		jest.spyOn(executeContext, 'getConnections').mockReturnValue([]);
	});

	describe('isHitlTool detection', () => {
		it('should not treat regular tools as HITL tools', async () => {
			const regularToolNode = mock<INode>({
				name: 'Regular Tool',
				type: 'n8n-nodes-base.httpRequest',
				disabled: false,
			});

			const mockTool = mock<Tool>();

			const regularNodeType = mock<INodeType>({
				supplyData: jest.fn().mockResolvedValue({ response: mockTool }),
			});

			agentNodeType.description.inputs = [
				{
					type: NodeConnectionTypes.AiTool,
					required: true,
				},
			];

			nodeTypes.getByNameAndVersion
				.calledWith(regularToolNode.type, expect.anything())
				.mockReturnValue(regularNodeType);
			workflow.getParentNodes
				.calledWith(agentNode.name, NodeConnectionTypes.AiTool)
				.mockReturnValue([regularToolNode.name]);
			workflow.getNode.calledWith(regularToolNode.name).mockReturnValue(regularToolNode);
			jest
				.spyOn(executeContext, 'getConnections')
				.mockReturnValueOnce([
					[{ node: regularToolNode.name, type: NodeConnectionTypes.AiTool, index: 0 }],
				]);

			const result = await executeContext.getInputConnectionData(NodeConnectionTypes.AiTool, 0);

			expect(result).toEqual([mockTool]);
			expect(regularNodeType.supplyData).toHaveBeenCalled();
		});

		it('should identify HITL tools by type suffix ending in HitlTool', () => {
			const hitlTypes = [
				'@n8n/n8n-nodes-langchain.toolWorkflowHitlTool',
				'test.HitlTool',
				'myPackage.customHitlTool',
			];

			const nonHitlTypes = [
				'n8n-nodes-base.httpRequest',
				'@n8n/n8n-nodes-langchain.toolWorkflow',
				'test.regularTool',
			];

			for (const type of hitlTypes) {
				expect(type.endsWith('HitlTool')).toBe(true);
			}

			for (const type of nonHitlTypes) {
				expect(type.endsWith('HitlTool')).toBe(false);
			}
		});
	});

	describe('HITL tool metadata wrapping', () => {
		it('should create wrapped tools with correct metadata structure', () => {
			const originalSourceNodeName = 'Original Tool Node';
			const hitlNodeName = 'HITL Node';

			const wrappedTool = new DynamicStructuredTool({
				name: 'my_tool',
				description: 'Tool description',
				schema: z.object({ query: z.string() }),
				func: async () => '',
				metadata: {
					sourceNodeName: hitlNodeName,
					gatedToolNodeName: originalSourceNodeName,
				},
			});

			expect(wrappedTool.metadata?.sourceNodeName).toBe(hitlNodeName);
			expect(wrappedTool.metadata?.gatedToolNodeName).toBe(originalSourceNodeName);
		});
	});
});

describe('createHitlToolkit', () => {
	const { getSchema } = require('../create-node-as-tool');
	const hitlNode = mock<INode>({
		name: 'HITL Node',
		type: 'test.HitlTool',
	});

	const mockHitlSchema = z.object({
		approvalRequired: z.boolean(),
		message: z.string(),
	});

	beforeEach(() => {
		jest.clearAllMocks();
		getSchema.mockReturnValue(mockHitlSchema);
	});

	it('should return empty toolkit when input is undefined', () => {
		const result = createHitlToolkit(undefined, hitlNode);

		expect(result).toBeInstanceOf(StructuredToolkit);
		expect(result.tools).toHaveLength(0);
		expect(getSchema).toHaveBeenCalledWith(hitlNode);
	});

	it('should wrap a single tool with HITL metadata', () => {
		const originalTool = new DynamicStructuredTool({
			name: 'test_tool',
			description: 'Test tool description',
			schema: z.object({ input: z.string() }),
			func: async () => 'result',
			metadata: { sourceNodeName: 'Original Node' },
		});

		const result = createHitlToolkit(originalTool, hitlNode);

		expect(result).toBeInstanceOf(StructuredToolkit);
		expect(result.tools).toHaveLength(1);

		const wrappedTool = result.tools[0];
		expect(wrappedTool.name).toBe('test_tool');
		expect(wrappedTool.description).toBe('Test tool description');
		expect(wrappedTool.metadata?.sourceNodeName).toBe('HITL Node');
		expect(wrappedTool.metadata?.gatedToolNodeName).toBe('Original Node');
	});

	it('should wrap tool schema with toolParameters and hitlParameters', () => {
		const originalSchema = z.object({ input: z.string(), count: z.number() });
		const originalTool = new DynamicStructuredTool({
			name: 'test_tool',
			description: 'Test tool',
			schema: originalSchema,
			func: async () => 'result',
		});

		const result = createHitlToolkit(originalTool, hitlNode);
		const wrappedTool = result.tools[0];

		// The schema should be wrapped in an object with toolParameters and hitlParameters
		expect(wrappedTool.schema).toBeDefined();
		// Verify it's a Zod object schema
		const schemaShape = (wrappedTool.schema as z.ZodObject<z.ZodRawShape>).shape;
		expect(schemaShape).toHaveProperty('toolParameters');
		expect(schemaShape).toHaveProperty('hitlParameters');
	});

	it('should handle array of tools', () => {
		const tool1 = new DynamicStructuredTool({
			name: 'tool_1',
			description: 'First tool',
			schema: z.object({ a: z.string() }),
			func: async () => 'result1',
			metadata: { sourceNodeName: 'Node 1' },
		});

		const tool2 = new DynamicStructuredTool({
			name: 'tool_2',
			description: 'Second tool',
			schema: z.object({ b: z.number() }),
			func: async () => 'result2',
			metadata: { sourceNodeName: 'Node 2' },
		});

		const result = createHitlToolkit([tool1, tool2], hitlNode);

		expect(result.tools).toHaveLength(2);
		expect(result.tools[0].name).toBe('tool_1');
		expect(result.tools[1].name).toBe('tool_2');
		expect(result.tools[0].metadata?.sourceNodeName).toBe('HITL Node');
		expect(result.tools[1].metadata?.sourceNodeName).toBe('HITL Node');
		expect(result.tools[0].metadata?.gatedToolNodeName).toBe('Node 1');
		expect(result.tools[1].metadata?.gatedToolNodeName).toBe('Node 2');
	});

	it('should extract tools from StructuredToolkit', () => {
		const tool1 = new DynamicStructuredTool({
			name: 'tool_1',
			description: 'First tool',
			schema: z.object({ a: z.string() }),
			func: async () => 'result1',
			metadata: { sourceNodeName: 'Node 1' },
		});

		const tool2 = new DynamicStructuredTool({
			name: 'tool_2',
			description: 'Second tool',
			schema: z.object({ b: z.number() }),
			func: async () => 'result2',
			metadata: { sourceNodeName: 'Node 2' },
		});

		const toolkit = new StructuredToolkit([tool1, tool2]);
		const result = createHitlToolkit(toolkit, hitlNode);

		expect(result.tools).toHaveLength(2);
		expect(result.tools[0].name).toBe('tool_1');
		expect(result.tools[1].name).toBe('tool_2');
		expect(result.tools[0].metadata?.sourceNodeName).toBe('HITL Node');
		expect(result.tools[1].metadata?.sourceNodeName).toBe('HITL Node');
	});

	it('should handle mixed array of tools and toolkits', () => {
		const standaloneTool = new DynamicStructuredTool({
			name: 'standalone_tool',
			description: 'Standalone tool',
			schema: z.object({ x: z.string() }),
			func: async () => 'result',
			metadata: { sourceNodeName: 'Standalone Node' },
		});

		const toolkitTool1 = new DynamicStructuredTool({
			name: 'toolkit_tool_1',
			description: 'Toolkit tool 1',
			schema: z.object({ y: z.string() }),
			func: async () => 'result',
			metadata: { sourceNodeName: 'Toolkit Node 1' },
		});

		const toolkitTool2 = new DynamicStructuredTool({
			name: 'toolkit_tool_2',
			description: 'Toolkit tool 2',
			schema: z.object({ z: z.string() }),
			func: async () => 'result',
			metadata: { sourceNodeName: 'Toolkit Node 2' },
		});

		const toolkit = new StructuredToolkit([toolkitTool1, toolkitTool2]);

		const result = createHitlToolkit([standaloneTool, toolkit], hitlNode);

		expect(result.tools).toHaveLength(3);
		expect(result.tools[0].name).toBe('standalone_tool');
		expect(result.tools[1].name).toBe('toolkit_tool_1');
		expect(result.tools[2].name).toBe('toolkit_tool_2');

		// All should have HITL node as sourceNodeName
		expect(result.tools[0].metadata?.sourceNodeName).toBe('HITL Node');
		expect(result.tools[1].metadata?.sourceNodeName).toBe('HITL Node');
		expect(result.tools[2].metadata?.sourceNodeName).toBe('HITL Node');

		// Each should preserve original node name as gatedToolNodeName
		expect(result.tools[0].metadata?.gatedToolNodeName).toBe('Standalone Node');
		expect(result.tools[1].metadata?.gatedToolNodeName).toBe('Toolkit Node 1');
		expect(result.tools[2].metadata?.gatedToolNodeName).toBe('Toolkit Node 2');
	});

	it('should handle tool with non-Zod schema', () => {
		// Non-Zod schema (e.g., JSON Schema)
		const nonZodSchema = { type: 'object', properties: { input: { type: 'string' } } };
		const originalTool = new DynamicStructuredTool({
			name: 'test_tool',
			description: 'Test tool',
			schema: nonZodSchema as unknown as z.ZodObject<z.ZodRawShape>,
			func: async () => 'result',
			metadata: { sourceNodeName: 'Original Node' },
		});

		const result = createHitlToolkit(originalTool, hitlNode);

		expect(result.tools).toHaveLength(1);
		const wrappedTool = result.tools[0];
		// Non-Zod schemas should be passed through unchanged
		expect(wrappedTool.schema).toEqual({
			type: 'object',
			properties: { input: { type: 'string' } },
		});
		expect(wrappedTool.metadata?.sourceNodeName).toBe('HITL Node');
		expect(wrappedTool.metadata?.gatedToolNodeName).toBe('Original Node');
	});

	it('should handle tool without metadata', () => {
		const originalTool = new DynamicStructuredTool({
			name: 'test_tool',
			description: 'Test tool',
			schema: z.object({ input: z.string() }),
			func: async () => 'result',
		});

		const result = createHitlToolkit(originalTool, hitlNode);

		expect(result.tools).toHaveLength(1);
		const wrappedTool = result.tools[0];
		expect(wrappedTool.metadata?.sourceNodeName).toBe('HITL Node');
		expect(wrappedTool.metadata?.gatedToolNodeName).toBeUndefined();
	});

	it('should create wrapped tools with empty func that returns empty string', async () => {
		const originalTool = new DynamicStructuredTool({
			name: 'test_tool',
			description: 'Test tool',
			schema: z.object({ input: z.string() }),
			func: async (input) => `Processed: ${input.input}`,
		});

		const result = createHitlToolkit(originalTool, hitlNode);
		const wrappedTool = result.tools[0];

		// The wrapped tool should have a no-op func that returns empty string
		const funcResult = await wrappedTool.func({ input: 'test' });
		expect(funcResult).toBe('');
	});
});

describe('createHitlToolSupplyData', () => {
	const { getSchema } = require('../create-node-as-tool');
	const hitlNode = mock<INode>({
		name: 'HITL Node',
		type: 'test.HitlTool',
	});
	const parentNode = mock<INode>({
		name: 'Parent Agent',
		type: 'test.agent',
	});
	const workflow = mock<Workflow>({
		id: 'test-workflow',
		active: false,
		nodeTypes: mock<INodeTypes>(),
	});
	const runExecutionData = mock<IRunExecutionData>({
		resultData: { runData: {} },
	});
	const connectionInputData = [] as INodeExecutionData[];
	const parentInputData = {} as ITaskDataConnections;
	const executeData = {} as IExecuteData;
	const hooks = mock<Required<IWorkflowExecuteAdditionalData['hooks']>>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ hooks });
	const mode: WorkflowExecuteMode = 'internal';
	const closeFunctions: CloseFunction[] = [];
	const itemIndex = 0;
	const parentRunIndex = 0;
	const abortSignal = mock<AbortSignal>();

	const mockHitlSchema = z.object({
		approvalRequired: z.boolean(),
		message: z.string(),
	});

	beforeEach(() => {
		jest.clearAllMocks();
		getSchema.mockReturnValue(mockHitlSchema);
		jest.spyOn(SupplyDataContext.prototype, 'getInputConnectionData');
	});

	it('should create supply data with single tool wrapped in toolkit', async () => {
		const originalTool = new DynamicStructuredTool({
			name: 'test_tool',
			description: 'Test tool description',
			schema: z.object({ input: z.string() }),
			func: async () => 'result',
			metadata: { sourceNodeName: 'Original Tool Node' },
		});

		(SupplyDataContext.prototype.getInputConnectionData as jest.Mock).mockResolvedValue(
			originalTool,
		);
		const result = await createHitlToolSupplyData(
			hitlNode,
			workflow,
			runExecutionData,
			parentRunIndex,
			connectionInputData,
			parentInputData,
			additionalData,
			executeData,
			mode,
			closeFunctions,
			itemIndex,
			abortSignal,
			parentNode,
		);

		expect(result).toHaveProperty('response');
		const toolkit = result.response as StructuredToolkit;
		expect(toolkit).toBeInstanceOf(StructuredToolkit);
		expect(toolkit.tools).toHaveLength(1);
		expect(toolkit.tools[0].name).toBe('test_tool');
		expect(toolkit.tools[0].metadata?.sourceNodeName).toBe('HITL Node');
		expect(toolkit.tools[0].metadata?.gatedToolNodeName).toBe('Original Tool Node');
	});
});

describe('extendResponseMetadata', () => {
	it('should extend metadata for toolkits', () => {
		const tool = new DynamicStructuredTool({
			name: 'test_tool',
			description: 'Test tool',
			schema: z.object({ input: z.string() }),
			func: async () => 'result',
		});
		const toolkit = new StructuredToolkit([tool]);
		extendResponseMetadata(toolkit, { name: 'HITL Node' } as INode);
		expect(toolkit.tools[0].metadata?.sourceNodeName).toBe('HITL Node');
	});
	it('should extend metadata for tools', () => {
		const tool = new DynamicStructuredTool({
			name: 'test_tool',
			description: 'Test tool',
			schema: z.object({ input: z.string() }),
			func: async () => 'result',
		});
		extendResponseMetadata(tool, { name: 'HITL Node' } as INode);
		expect(tool.metadata?.sourceNodeName).toBe('HITL Node');
	});
});
