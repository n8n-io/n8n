import type { Tool } from '@langchain/core/tools';
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
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { ExecuteContext } from '../../execute-context';
import { makeHandleToolInvocation } from '../get-input-connection-data';

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

		const secondToolNode = mock<INode>({ name: 'test.secondTool', disabled: false });
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
		const result = await handleToolInvocation(toolArgs);

		expect(result).toBe('Error during node execution: Execution failed');
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

			const result = await handleToolInvocation(toolArgs);

			expect(contextFactory).toHaveBeenCalledTimes(1);
			expect(connectedNodeType.execute).toHaveBeenCalledTimes(1);
			expect(result).toContain('Error during node execution');
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

			const result = await handleToolInvocation(toolArgs);

			expect(contextFactory).toHaveBeenCalledTimes(3);
			expect(connectedNodeType.execute).toHaveBeenCalledTimes(3);
			expect(result).toContain('Error during node execution');
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

				await handleToolInvocation(toolArgs);

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

			await handleToolInvocation(toolArgs);

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

			const result = await handleToolInvocation(toolArgs);

			expect(result).toBe('Error during node execution: Execution was cancelled');
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
