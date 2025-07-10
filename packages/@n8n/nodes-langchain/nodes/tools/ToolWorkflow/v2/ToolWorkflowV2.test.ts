import { DynamicTool } from '@langchain/core/tools';
import { ApplicationError, NodeOperationError } from 'n8n-workflow';
import type {
	ISupplyDataFunctions,
	INodeExecutionData,
	IWorkflowDataProxyData,
	ExecuteWorkflowData,
	INode,
} from 'n8n-workflow';

import { WorkflowToolService } from './utils/WorkflowToolService';

// Mock the sleep functions
jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	sleep: jest.fn().mockResolvedValue(undefined),
	sleepWithAbort: jest.fn().mockResolvedValue(undefined),
}));

function createMockClonedContext(
	baseContext: ISupplyDataFunctions,
	executeWorkflowMock?: jest.MockedFunction<any>,
): ISupplyDataFunctions {
	return {
		...baseContext,
		addOutputData: jest.fn(),
		getNodeParameter: baseContext.getNodeParameter,
		getWorkflowDataProxy: baseContext.getWorkflowDataProxy,
		executeWorkflow: executeWorkflowMock || baseContext.executeWorkflow,
		getNode: baseContext.getNode,
	} as ISupplyDataFunctions;
}

function createMockContext(overrides?: Partial<ISupplyDataFunctions>): ISupplyDataFunctions {
	let runIndex = 0;
	const getNextRunIndex = jest.fn(() => {
		return runIndex++;
	});
	const context = {
		runIndex: 0,
		getNodeParameter: jest.fn(),
		getWorkflowDataProxy: jest.fn(),
		getNode: jest.fn(),
		executeWorkflow: jest.fn(),
		addInputData: jest.fn(),
		addOutputData: jest.fn(),
		getCredentials: jest.fn(),
		getCredentialsProperties: jest.fn(),
		getInputData: jest.fn(),
		getMode: jest.fn(),
		getRestApiUrl: jest.fn(),
		getNextRunIndex,
		getTimezone: jest.fn(),
		getWorkflow: jest.fn(),
		getWorkflowStaticData: jest.fn(),
		logger: {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
		},
		...overrides,
	} as ISupplyDataFunctions;
	context.cloneWith = jest.fn().mockImplementation((_) => createMockClonedContext(context));
	return context;
}

describe('WorkflowTool::WorkflowToolService', () => {
	let context: ISupplyDataFunctions;
	let service: WorkflowToolService;

	beforeEach(() => {
		// Prepare essential mocks
		context = createMockContext();
		jest.spyOn(context, 'getNode').mockReturnValue({
			parameters: { workflowInputs: { schema: [] } },
		} as unknown as INode);
		service = new WorkflowToolService(context);
	});

	describe('createTool', () => {
		it('should create a basic dynamic tool when schema is not used', async () => {
			const toolParams = {
				ctx: context,
				name: 'TestTool',
				description: 'Test Description',
				itemIndex: 0,
			};

			const result = await service.createTool(toolParams);

			expect(result).toBeInstanceOf(DynamicTool);
			expect(result).toHaveProperty('name', 'TestTool');
			expect(result).toHaveProperty('description', 'Test Description');
		});

		it('should create a tool that can handle successful execution', async () => {
			const toolParams = {
				ctx: context,
				name: 'TestTool',
				description: 'Test Description',
				itemIndex: 0,
			};

			const TEST_RESPONSE = { msg: 'test response' };

			const mockExecuteWorkflowResponse: ExecuteWorkflowData = {
				data: [[{ json: TEST_RESPONSE }]],
				executionId: 'test-execution',
			};

			jest.spyOn(context, 'executeWorkflow').mockResolvedValueOnce(mockExecuteWorkflowResponse);
			jest.spyOn(context, 'addInputData').mockReturnValue({ index: 0 });
			jest.spyOn(context, 'getNodeParameter').mockReturnValue('database');
			jest.spyOn(context, 'getWorkflowDataProxy').mockReturnValue({
				$execution: { id: 'exec-id' },
				$workflow: { id: 'workflow-id' },
			} as unknown as IWorkflowDataProxyData);
			jest.spyOn(context, 'cloneWith').mockReturnValue(context);

			const tool = await service.createTool(toolParams);
			const result = await tool.func('test query');

			expect(result).toBe(JSON.stringify(TEST_RESPONSE, null, 2));
			expect(context.addOutputData).toHaveBeenCalled();

			// Here we validate that the runIndex is correctly updated
			expect(context.cloneWith).toHaveBeenCalledWith({
				runIndex: 0,
				inputData: [[{ json: { query: 'test query' } }]],
			});

			await tool.func('another query');
			expect(context.cloneWith).toHaveBeenCalledWith({
				runIndex: 1,
				inputData: [[{ json: { query: 'another query' } }]],
			});
		});

		it('should handle errors during tool execution', async () => {
			const toolParams = {
				ctx: context,
				name: 'TestTool',
				description: 'Test Description',
				itemIndex: 0,
			};

			jest
				.spyOn(context, 'executeWorkflow')
				.mockRejectedValueOnce(new Error('Workflow execution failed'));
			jest.spyOn(context, 'addInputData').mockReturnValue({ index: 0 });
			jest.spyOn(context, 'getNodeParameter').mockReturnValue('database');
			jest.spyOn(context, 'cloneWith').mockReturnValue(context);

			const tool = await service.createTool(toolParams);
			const result = await tool.func('test query');

			expect(result).toContain('There was an error');
			expect(context.addOutputData).toHaveBeenCalled();
		});
	});

	describe('handleToolResponse', () => {
		it('should handle number response', () => {
			const result = service['handleToolResponse'](42);

			expect(result).toBe('42');
		});

		it('should handle object response', () => {
			const obj = { test: 'value' };

			const result = service['handleToolResponse'](obj);

			expect(result).toBe(JSON.stringify(obj, null, 2));
		});

		it('should handle string response', () => {
			const result = service['handleToolResponse']('test response');

			expect(result).toBe('test response');
		});

		it('should throw error for invalid response type', () => {
			expect(() => service['handleToolResponse'](undefined)).toThrow(NodeOperationError);
		});
	});

	describe('executeSubWorkflow', () => {
		it('should successfully execute workflow and return response', async () => {
			const workflowInfo = { id: 'test-workflow' };
			const items: INodeExecutionData[] = [];
			const workflowProxyMock = {
				$execution: { id: 'exec-id' },
				$workflow: { id: 'workflow-id' },
			} as unknown as IWorkflowDataProxyData;

			const TEST_RESPONSE = { msg: 'test response' };

			const mockResponse: ExecuteWorkflowData = {
				data: [[{ json: TEST_RESPONSE }]],
				executionId: 'test-execution',
			};

			jest.spyOn(context, 'executeWorkflow').mockResolvedValueOnce(mockResponse);

			const result = await service['executeSubWorkflow'](
				context,
				workflowInfo,
				items,
				workflowProxyMock,
			);

			expect(result.response).toBe(TEST_RESPONSE);
			expect(result.subExecutionId).toBe('test-execution');
		});

		it('should successfully execute workflow and return first item of many', async () => {
			const workflowInfo = { id: 'test-workflow' };
			const items: INodeExecutionData[] = [];
			const workflowProxyMock = {
				$execution: { id: 'exec-id' },
				$workflow: { id: 'workflow-id' },
			} as unknown as IWorkflowDataProxyData;

			const TEST_RESPONSE_1 = { msg: 'test response 1' };
			const TEST_RESPONSE_2 = { msg: 'test response 2' };

			const mockResponse: ExecuteWorkflowData = {
				data: [[{ json: TEST_RESPONSE_1 }, { json: TEST_RESPONSE_2 }]],
				executionId: 'test-execution',
			};

			jest.spyOn(context, 'executeWorkflow').mockResolvedValueOnce(mockResponse);

			const result = await service['executeSubWorkflow'](
				context,
				workflowInfo,
				items,
				workflowProxyMock,
			);

			expect(result.response).toBe(TEST_RESPONSE_1);
			expect(result.subExecutionId).toBe('test-execution');
		});

		it('should successfully execute workflow and return all items', async () => {
			const serviceWithReturnAllItems = new WorkflowToolService(context, { returnAllItems: true });
			const workflowInfo = { id: 'test-workflow' };
			const items: INodeExecutionData[] = [];
			const workflowProxyMock = {
				$execution: { id: 'exec-id' },
				$workflow: { id: 'workflow-id' },
			} as unknown as IWorkflowDataProxyData;

			const TEST_RESPONSE_1 = { msg: 'test response 1' };
			const TEST_RESPONSE_2 = { msg: 'test response 2' };

			const mockResponse: ExecuteWorkflowData = {
				data: [[{ json: TEST_RESPONSE_1 }, { json: TEST_RESPONSE_2 }]],
				executionId: 'test-execution',
			};

			jest.spyOn(context, 'executeWorkflow').mockResolvedValueOnce(mockResponse);

			const result = await serviceWithReturnAllItems['executeSubWorkflow'](
				context,
				workflowInfo,
				items,
				workflowProxyMock,
				undefined,
			);

			expect(result.response).toEqual([{ json: TEST_RESPONSE_1 }, { json: TEST_RESPONSE_2 }]);
			expect(result.subExecutionId).toBe('test-execution');
		});

		it('should throw error when workflow execution fails', async () => {
			jest.spyOn(context, 'executeWorkflow').mockRejectedValueOnce(new Error('Execution failed'));

			await expect(service['executeSubWorkflow'](context, {}, [], {} as never)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error when workflow returns no response', async () => {
			const mockResponse: ExecuteWorkflowData = {
				data: [],
				executionId: 'test-execution',
			};

			jest.spyOn(context, 'executeWorkflow').mockResolvedValueOnce(mockResponse);

			await expect(service['executeSubWorkflow'](context, {}, [], {} as never)).rejects.toThrow();
		});
	});

	describe('getSubWorkflowInfo', () => {
		it('should handle database source correctly', async () => {
			const source = 'database';
			const itemIndex = 0;
			const workflowProxyMock = {
				$workflow: { id: 'proxy-id' },
			} as unknown as IWorkflowDataProxyData;

			jest.spyOn(context, 'getNodeParameter').mockReturnValueOnce({ value: 'workflow-id' });

			const result = await service['getSubWorkflowInfo'](
				context,
				source,
				itemIndex,
				workflowProxyMock,
			);

			expect(result.workflowInfo).toHaveProperty('id', 'workflow-id');
			expect(result.subWorkflowId).toBe('workflow-id');
		});

		it('should handle parameter source correctly', async () => {
			const source = 'parameter';
			const itemIndex = 0;
			const workflowProxyMock = {
				$workflow: { id: 'proxy-id' },
			} as unknown as IWorkflowDataProxyData;
			const mockWorkflow = { id: 'test-workflow' };

			jest.spyOn(context, 'getNodeParameter').mockReturnValueOnce(JSON.stringify(mockWorkflow));

			const result = await service['getSubWorkflowInfo'](
				context,
				source,
				itemIndex,
				workflowProxyMock,
			);

			expect(result.workflowInfo.code).toEqual(mockWorkflow);
			expect(result.subWorkflowId).toBe('proxy-id');
		});

		it('should throw error for invalid JSON in parameter source', async () => {
			const source = 'parameter';
			const itemIndex = 0;
			const workflowProxyMock = {
				$workflow: { id: 'proxy-id' },
			} as unknown as IWorkflowDataProxyData;

			jest.spyOn(context, 'getNodeParameter').mockReturnValueOnce('invalid json');

			await expect(
				service['getSubWorkflowInfo'](context, source, itemIndex, workflowProxyMock),
			).rejects.toThrow(NodeOperationError);
		});
	});

	describe('retry functionality', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should not retry when retryOnFail is false', async () => {
			const executeWorkflowMock = jest.fn().mockRejectedValue(new Error('Test error'));
			const contextWithNonRetryNode = createMockContext({
				getNode: jest.fn().mockReturnValue({
					name: 'Test Tool',
					parameters: { workflowInputs: { schema: [] } },
					retryOnFail: false,
				}),
				getNodeParameter: jest.fn().mockImplementation((name) => {
					if (name === 'source') return 'database';
					if (name === 'workflowId') return { value: 'test-workflow-id' };
					if (name === 'fields.values') return [];
					return {};
				}),
				executeWorkflow: executeWorkflowMock,
				addOutputData: jest.fn(),
			});
			contextWithNonRetryNode.cloneWith = jest.fn().mockImplementation((cloneOverrides) => ({
				...createMockClonedContext(contextWithNonRetryNode, executeWorkflowMock),
				getWorkflowDataProxy: jest.fn().mockReturnValue({
					$execution: { id: 'exec-id' },
					$workflow: { id: 'workflow-id' },
				}),
				getNodeParameter: contextWithNonRetryNode.getNodeParameter,
				...cloneOverrides,
			}));

			service = new WorkflowToolService(contextWithNonRetryNode);
			const tool = await service.createTool({
				ctx: contextWithNonRetryNode,
				name: 'Test Tool',
				description: 'Test Description',
				itemIndex: 0,
			});

			const result = await tool.func('test query');

			expect(executeWorkflowMock).toHaveBeenCalledTimes(1);
			expect(result).toContain('There was an error');
		});

		it('should retry up to maxTries when retryOnFail is true', async () => {
			const executeWorkflowMock = jest.fn().mockRejectedValue(new Error('Test error'));
			const contextWithRetryNode = createMockContext({
				getNode: jest.fn().mockReturnValue({
					name: 'Test Tool',
					parameters: { workflowInputs: { schema: [] } },
					retryOnFail: true,
					maxTries: 3,
					waitBetweenTries: 0,
				}),
				getNodeParameter: jest.fn().mockImplementation((name) => {
					if (name === 'source') return 'database';
					if (name === 'workflowId') return { value: 'test-workflow-id' };
					if (name === 'fields.values') return [];
					return {};
				}),
				executeWorkflow: executeWorkflowMock,
				addOutputData: jest.fn(),
			});
			contextWithRetryNode.cloneWith = jest.fn().mockImplementation((cloneOverrides) => ({
				...createMockClonedContext(contextWithRetryNode, executeWorkflowMock),
				getWorkflowDataProxy: jest.fn().mockReturnValue({
					$execution: { id: 'exec-id' },
					$workflow: { id: 'workflow-id' },
				}),
				getNodeParameter: contextWithRetryNode.getNodeParameter,
				...cloneOverrides,
			}));

			service = new WorkflowToolService(contextWithRetryNode);
			const tool = await service.createTool({
				ctx: contextWithRetryNode,
				name: 'Test Tool',
				description: 'Test Description',
				itemIndex: 0,
			});

			const result = await tool.func('test query');

			expect(executeWorkflowMock).toHaveBeenCalledTimes(3);
			expect(result).toContain('There was an error');
		});

		it('should succeed on retry after initial failure', async () => {
			const mockSuccessResponse = {
				data: [[{ json: { result: 'success' } }]],
				executionId: 'success-exec-id',
			};

			const executeWorkflowMock = jest
				.fn()
				.mockRejectedValueOnce(new Error('First attempt fails'))
				.mockResolvedValueOnce(mockSuccessResponse);

			const contextWithRetryNode = createMockContext({
				getNode: jest.fn().mockReturnValue({
					name: 'Test Tool',
					parameters: { workflowInputs: { schema: [] } },
					retryOnFail: true,
					maxTries: 3,
					waitBetweenTries: 0,
				}),
				getNodeParameter: jest.fn().mockImplementation((name) => {
					if (name === 'source') return 'database';
					if (name === 'workflowId') return { value: 'test-workflow-id' };
					if (name === 'fields.values') return [];
					return {};
				}),
				executeWorkflow: executeWorkflowMock,
				addOutputData: jest.fn(),
			});
			contextWithRetryNode.cloneWith = jest.fn().mockImplementation((cloneOverrides) => ({
				...createMockClonedContext(contextWithRetryNode, executeWorkflowMock),
				getWorkflowDataProxy: jest.fn().mockReturnValue({
					$execution: { id: 'exec-id' },
					$workflow: { id: 'workflow-id' },
				}),
				getNodeParameter: contextWithRetryNode.getNodeParameter,
				...cloneOverrides,
			}));

			service = new WorkflowToolService(contextWithRetryNode);
			const tool = await service.createTool({
				ctx: contextWithRetryNode,
				name: 'Test Tool',
				description: 'Test Description',
				itemIndex: 0,
			});

			const result = await tool.func('test query');

			expect(executeWorkflowMock).toHaveBeenCalledTimes(2);
			expect(result).toBe(JSON.stringify({ result: 'success' }, null, 2));
		});

		it.each([
			{ maxTries: 1, expected: 2 }, // Should be clamped to minimum 2
			{ maxTries: 3, expected: 3 },
			{ maxTries: 6, expected: 5 }, // Should be clamped to maximum 5
		])('should respect maxTries limits (2-5)', async ({ maxTries, expected }) => {
			const executeWorkflowMock = jest.fn().mockRejectedValue(new Error('Test error'));

			const contextWithRetryNode = createMockContext({
				getNode: jest.fn().mockReturnValue({
					name: 'Test Tool',
					parameters: { workflowInputs: { schema: [] } },
					retryOnFail: true,
					maxTries,
					waitBetweenTries: 0,
				}),
				getNodeParameter: jest.fn().mockImplementation((name) => {
					if (name === 'source') return 'database';
					if (name === 'workflowId') return { value: 'test-workflow-id' };
					if (name === 'fields.values') return [];
					return {};
				}),
				executeWorkflow: executeWorkflowMock,
			});

			contextWithRetryNode.cloneWith = jest.fn().mockImplementation((cloneOverrides) => ({
				...createMockClonedContext(contextWithRetryNode, executeWorkflowMock),
				getWorkflowDataProxy: jest.fn().mockReturnValue({
					$execution: { id: 'exec-id' },
					$workflow: { id: 'workflow-id' },
				}),
				getNodeParameter: contextWithRetryNode.getNodeParameter,
				...cloneOverrides,
			}));

			service = new WorkflowToolService(contextWithRetryNode);
			const tool = await service.createTool({
				ctx: contextWithRetryNode,
				name: 'Test Tool',
				description: 'Test Description',
				itemIndex: 0,
			});

			await tool.func('test query');

			expect(executeWorkflowMock).toHaveBeenCalledTimes(expected);
		});

		it('should respect waitBetweenTries with sleepWithAbort', async () => {
			const { sleepWithAbort } = jest.requireMock('n8n-workflow');
			sleepWithAbort.mockClear();
			const executeWorkflowMock = jest.fn().mockRejectedValue(new Error('Test error'));

			const contextWithRetryNode = createMockContext({
				getNode: jest.fn().mockReturnValue({
					name: 'Test Tool',
					parameters: { workflowInputs: { schema: [] } },
					retryOnFail: true,
					maxTries: 2,
					waitBetweenTries: 1500,
				}),
				getNodeParameter: jest.fn().mockImplementation((name) => {
					if (name === 'source') return 'database';
					if (name === 'workflowId') return { value: 'test-workflow-id' };
					if (name === 'fields.values') return [];
					return {};
				}),
				executeWorkflow: executeWorkflowMock,
				addOutputData: jest.fn(),
			});
			contextWithRetryNode.cloneWith = jest.fn().mockImplementation((cloneOverrides) => ({
				...createMockClonedContext(contextWithRetryNode, executeWorkflowMock),
				getWorkflowDataProxy: jest.fn().mockReturnValue({
					$execution: { id: 'exec-id' },
					$workflow: { id: 'workflow-id' },
				}),
				getNodeParameter: contextWithRetryNode.getNodeParameter,
				...cloneOverrides,
			}));

			service = new WorkflowToolService(contextWithRetryNode);
			const tool = await service.createTool({
				ctx: contextWithRetryNode,
				name: 'Test Tool',
				description: 'Test Description',
				itemIndex: 0,
			});

			await tool.func('test query');

			expect(sleepWithAbort).toHaveBeenCalledWith(1500, undefined);
		});
	});

	describe('abort signal functionality', () => {
		let abortController: AbortController;

		beforeEach(() => {
			jest.clearAllMocks();
			abortController = new AbortController();
		});

		const createAbortSignalContext = (
			executeWorkflowMock: jest.MockedFunction<any>,
			abortSignal?: AbortSignal,
		) => {
			const contextWithRetryNode = createMockContext({
				getNode: jest.fn().mockReturnValue({
					name: 'Test Tool',
					parameters: { workflowInputs: { schema: [] } },
					retryOnFail: true,
					maxTries: 3,
					waitBetweenTries: 100,
				}),
				getNodeParameter: jest.fn().mockImplementation((name) => {
					if (name === 'source') return 'database';
					if (name === 'workflowId') return { value: 'test-workflow-id' };
					if (name === 'fields.values') return [];
					return {};
				}),
				executeWorkflow: executeWorkflowMock,
				addOutputData: jest.fn(),
			});
			contextWithRetryNode.cloneWith = jest.fn().mockImplementation((cloneOverrides) => ({
				...createMockClonedContext(contextWithRetryNode, executeWorkflowMock),
				getWorkflowDataProxy: jest.fn().mockReturnValue({
					$execution: { id: 'exec-id' },
					$workflow: { id: 'workflow-id' },
				}),
				getNodeParameter: contextWithRetryNode.getNodeParameter,
				getExecutionCancelSignal: jest.fn(() => abortSignal),
				...cloneOverrides,
			}));
			return contextWithRetryNode;
		};

		it('should return cancellation message if signal is already aborted', async () => {
			const executeWorkflowMock = jest.fn().mockResolvedValue({
				data: [[{ json: { result: 'success' } }]],
				executionId: 'success-exec-id',
			});

			// Abort before starting
			abortController.abort();

			const contextWithRetryNode = createAbortSignalContext(
				executeWorkflowMock,
				abortController.signal,
			);

			service = new WorkflowToolService(contextWithRetryNode);
			const tool = await service.createTool({
				ctx: contextWithRetryNode,
				name: 'Test Tool',
				description: 'Test Description',
				itemIndex: 0,
			});

			const result = await tool.func('test query');

			expect(result).toBe('There was an error: "Execution was cancelled"');
			expect(executeWorkflowMock).not.toHaveBeenCalled();
		});

		it('should handle abort signal during retry wait', async () => {
			const { sleepWithAbort } = jest.requireMock('n8n-workflow');
			sleepWithAbort.mockRejectedValue(new Error('Execution was cancelled'));

			const executeWorkflowMock = jest
				.fn()
				.mockRejectedValueOnce(new Error('First attempt fails'))
				.mockResolvedValueOnce({
					data: [[{ json: { result: 'success' } }]],
					executionId: 'success-exec-id',
				});

			const contextWithRetryNode = createAbortSignalContext(
				executeWorkflowMock,
				abortController.signal,
			);

			service = new WorkflowToolService(contextWithRetryNode);
			const tool = await service.createTool({
				ctx: contextWithRetryNode,
				name: 'Test Tool',
				description: 'Test Description',
				itemIndex: 0,
			});

			const result = await tool.func('test query');

			expect(result).toBe('There was an error: "Execution was cancelled"');
			expect(sleepWithAbort).toHaveBeenCalledWith(100, abortController.signal);
			expect(executeWorkflowMock).toHaveBeenCalledTimes(1); // Only first attempt
		});

		it('should handle abort signal during execution', async () => {
			const executeWorkflowMock = jest.fn().mockImplementation(() => {
				// Simulate abort during execution
				abortController.abort();
				throw new ApplicationError('Workflow execution failed');
			});

			const contextWithRetryNode = createAbortSignalContext(
				executeWorkflowMock,
				abortController.signal,
			);

			service = new WorkflowToolService(contextWithRetryNode);
			const tool = await service.createTool({
				ctx: contextWithRetryNode,
				name: 'Test Tool',
				description: 'Test Description',
				itemIndex: 0,
			});

			const result = await tool.func('test query');

			expect(result).toBe('There was an error: "Execution was cancelled"');
			expect(executeWorkflowMock).toHaveBeenCalledTimes(1);
		});

		it('should complete successfully if not aborted', async () => {
			const { sleepWithAbort } = jest.requireMock('n8n-workflow');
			sleepWithAbort.mockClear().mockResolvedValue(undefined);

			const executeWorkflowMock = jest
				.fn()
				.mockRejectedValueOnce(new Error('First attempt fails'))
				.mockResolvedValueOnce({
					data: [[{ json: { result: 'success' } }]],
					executionId: 'success-exec-id',
				});

			const contextWithRetryNode = createAbortSignalContext(
				executeWorkflowMock,
				abortController.signal,
			);

			service = new WorkflowToolService(contextWithRetryNode);
			const tool = await service.createTool({
				ctx: contextWithRetryNode,
				name: 'Test Tool',
				description: 'Test Description',
				itemIndex: 0,
			});

			const result = await tool.func('test query');

			expect(result).toBe(JSON.stringify({ result: 'success' }, null, 2));
			expect(executeWorkflowMock).toHaveBeenCalledTimes(2);
			expect(sleepWithAbort).toHaveBeenCalledWith(100, abortController.signal);
		});

		it('should work when getExecutionCancelSignal is not available', async () => {
			const { sleepWithAbort } = jest.requireMock('n8n-workflow');
			sleepWithAbort.mockClear().mockResolvedValue(undefined);

			const executeWorkflowMock = jest
				.fn()
				.mockRejectedValueOnce(new Error('First attempt fails'))
				.mockResolvedValueOnce({
					data: [[{ json: { result: 'success' } }]],
					executionId: 'success-exec-id',
				});

			// Create context without getExecutionCancelSignal
			const contextWithRetryNode = createAbortSignalContext(executeWorkflowMock, undefined);

			service = new WorkflowToolService(contextWithRetryNode);
			const tool = await service.createTool({
				ctx: contextWithRetryNode,
				name: 'Test Tool',
				description: 'Test Description',
				itemIndex: 0,
			});

			const result = await tool.func('test query');

			expect(result).toBe(JSON.stringify({ result: 'success' }, null, 2));
			expect(sleepWithAbort).toHaveBeenCalledWith(100, undefined);
		});
	});
});
