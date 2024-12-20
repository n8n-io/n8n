/* eslint-disable @typescript-eslint/dot-notation */ // Disabled to allow access to private methods
import { DynamicTool } from '@langchain/core/tools';
import { NodeOperationError } from 'n8n-workflow';
import type {
	ISupplyDataFunctions,
	INodeExecutionData,
	IWorkflowDataProxyData,
	ExecuteWorkflowData,
	INode,
} from 'n8n-workflow';

import { WorkflowToolService } from './utils/WorkflowToolService';

// Mock ISupplyDataFunctions interface
function createMockContext(overrides?: Partial<ISupplyDataFunctions>): ISupplyDataFunctions {
	return {
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

			const tool = await service.createTool(toolParams);
			const result = await tool.func('test query');

			expect(result).toBe(JSON.stringify(TEST_RESPONSE, null, 2));
			expect(context.addOutputData).toHaveBeenCalled();
		});

		it('should handle errors during tool execution', async () => {
			const toolParams = {
				name: 'TestTool',
				description: 'Test Description',
				itemIndex: 0,
			};

			jest
				.spyOn(context, 'executeWorkflow')
				.mockRejectedValueOnce(new Error('Workflow execution failed'));
			jest.spyOn(context, 'addInputData').mockReturnValue({ index: 0 });
			jest.spyOn(context, 'getNodeParameter').mockReturnValue('database');

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

			const result = await service['executeSubWorkflow'](workflowInfo, items, workflowProxyMock);

			expect(result.response).toBe(TEST_RESPONSE);
			expect(result.subExecutionId).toBe('test-execution');
		});

		it('should throw error when workflow execution fails', async () => {
			jest.spyOn(context, 'executeWorkflow').mockRejectedValueOnce(new Error('Execution failed'));

			await expect(service['executeSubWorkflow']({}, [], {} as never)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error when workflow returns no response', async () => {
			const mockResponse: ExecuteWorkflowData = {
				data: [],
				executionId: 'test-execution',
			};

			jest.spyOn(context, 'executeWorkflow').mockResolvedValueOnce(mockResponse);

			await expect(service['executeSubWorkflow']({}, [], {} as never)).rejects.toThrow();
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

			const result = await service['getSubWorkflowInfo'](source, itemIndex, workflowProxyMock);

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

			const result = await service['getSubWorkflowInfo'](source, itemIndex, workflowProxyMock);

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
				service['getSubWorkflowInfo'](source, itemIndex, workflowProxyMock),
			).rejects.toThrow(NodeOperationError);
		});
	});
});
