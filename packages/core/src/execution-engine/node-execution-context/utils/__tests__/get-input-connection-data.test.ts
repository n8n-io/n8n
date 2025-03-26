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
		const secondNode = mock<INode>({ name: 'Second Node', disabled: false });
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

			const closeFunction = jest.fn();
			supplyData.mockResolvedValueOnce({ response, closeFunction });

			const result = await executeContext.getInputConnectionData(connectionType, 0);
			expect(result).toBe(response);
			expect(supplyData).toHaveBeenCalled();
			// @ts-expect-error private property
			expect(executeContext.closeFunctions).toContain(closeFunction);
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

		const handleToolInvocation = makeHandleToolInvocation(
			contextFactory,
			connectedNode,
			connectedNodeType,
		);

		await handleToolInvocation(toolArgs);
		await handleToolInvocation(toolArgs);
		await handleToolInvocation(toolArgs);

		expect(contextFactory).toHaveBeenCalledWith(0);
		expect(contextFactory).toHaveBeenCalledWith(1);
		expect(contextFactory).toHaveBeenCalledWith(2);
	});
});
