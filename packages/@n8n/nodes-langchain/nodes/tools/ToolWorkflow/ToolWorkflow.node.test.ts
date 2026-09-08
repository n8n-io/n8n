import { DynamicTool } from '@langchain/classic/tools';
import {
	type ExecuteWorkflowData,
	type INode,
	type ISupplyDataFunctions,
	type IExecuteFunctions,
	type INodeExecutionData,
	type IWorkflowDataProxyData,
	type WorkflowExecuteMode,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as manual from 'n8n-nodes-base/dist/nodes/Set/v2/manual.mode';

import { SUB_WORKFLOW_WAITING_PLACEHOLDER } from './constants';

import { ToolWorkflow } from './ToolWorkflow.node';
import type { ToolWorkflowV1 } from './v1/ToolWorkflowV1.node';
import type { ToolWorkflowV2 } from './v2/ToolWorkflowV2.node';
import { WorkflowToolService } from './v2/utils/WorkflowToolService';

vi.mock('n8n-nodes-base/dist/nodes/Set/v2/manual.mode', () => ({
	execute: vi.fn().mockResolvedValue({ json: { query: 'hello' } }),
}));

describe('ToolWorkflowV2', () => {
	describe('supplyData', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('should read name from node name on version >=2.2', async () => {
			const toolWorkflowNode = new ToolWorkflow();
			const node = toolWorkflowNode.nodeVersions[2.2] as ToolWorkflowV2;

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: vi.fn(() => mock<INode>({ typeVersion: 2.2, name: 'test tool' })),
					getNodeParameter: vi.fn().mockImplementation((paramName, _itemIndex) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							case 'name':
								return 'wrong_field';
							default:
								return;
						}
					}),
				}),
				0,
			);

			expect(supplyDataResult.response).toBeInstanceOf(DynamicTool);

			const tool = supplyDataResult.response as DynamicTool;
			expect(tool.name).toBe('test_tool');
			expect(tool.description).toBe('description text');
			expect(tool.func).toBeInstanceOf(Function);
		});

		it('should read name from name parameter on version <2.2', async () => {
			const toolWorkflowNode = new ToolWorkflow();
			const node = toolWorkflowNode.nodeVersions[2.1] as ToolWorkflowV2;

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: vi.fn(() => mock<INode>({ typeVersion: 2.1, name: 'wrong name' })),
					getNodeParameter: vi.fn().mockImplementation((paramName, _itemIndex) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							case 'name':
								return 'test_tool';
							default:
								return;
						}
					}),
				}),
				0,
			);

			expect(supplyDataResult.response).toBeInstanceOf(DynamicTool);

			const tool = supplyDataResult.response as DynamicTool;
			expect(tool.name).toBe('test_tool');
			expect(tool.description).toBe('description text');
			expect(tool.func).toBeInstanceOf(Function);
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('should properly spread INodeExecutionData array from tool.invoke', async () => {
			const toolWorkflowNode = new ToolWorkflow();
			const node = toolWorkflowNode.nodeVersions[2.2] as ToolWorkflowV2;

			// Mock the tool that returns INodeExecutionData[]
			const mockToolResponse: INodeExecutionData[] = [{ json: { response: 'pikachu' } }];

			const mockTool = {
				invoke: vi.fn().mockResolvedValue(mockToolResponse),
			} as any;

			// Mock WorkflowToolService.createTool to return our mock tool
			vi.spyOn(WorkflowToolService.prototype, 'createTool').mockResolvedValue(mockTool);

			const inputData: INodeExecutionData[] = [{ json: { query: 'what is a pokemon?' } }];

			const executeResult = await node.execute.call(
				mock<IExecuteFunctions>({
					getInputData: vi.fn(() => inputData),
					getNode: vi.fn(() =>
						mock<INode>({
							typeVersion: 2.2,
							name: 'test tool',
							parameters: { workflowInputs: { schema: [] } },
						}),
					),
					getNodeParameter: vi.fn().mockImplementation((paramName) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							default:
								return;
						}
					}),
				}),
			);

			// Verify the result is properly formatted
			expect(executeResult).toHaveLength(1);
			expect(executeResult[0]).toHaveLength(1);
			expect(executeResult[0][0]).toEqual({ json: { response: 'pikachu' } });
			expect(mockTool.invoke).toHaveBeenCalledWith({ query: 'what is a pokemon?' });
		});

		it('should handle multiple items in the response', async () => {
			const toolWorkflowNode = new ToolWorkflow();
			const node = toolWorkflowNode.nodeVersions[2.2] as ToolWorkflowV2;

			// Mock the tool that returns multiple INodeExecutionData items
			const mockToolResponse: INodeExecutionData[] = [
				{ json: { id: 1, name: 'pikachu' } },
				{ json: { id: 2, name: 'charizard' } },
			];

			const mockTool = {
				invoke: vi.fn().mockResolvedValue(mockToolResponse),
			} as any;

			vi.spyOn(WorkflowToolService.prototype, 'createTool').mockResolvedValue(mockTool);

			const inputData: INodeExecutionData[] = [{ json: { query: 'list pokemon' } }];

			const executeResult = await node.execute.call(
				mock<IExecuteFunctions>({
					getInputData: vi.fn(() => inputData),
					getNode: vi.fn(() =>
						mock<INode>({
							typeVersion: 2.2,
							name: 'test tool',
							parameters: { workflowInputs: { schema: [] } },
						}),
					),
					getNodeParameter: vi.fn().mockImplementation((paramName) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							default:
								return;
						}
					}),
				}),
			);

			// Verify all items are properly spread into the response
			expect(executeResult).toHaveLength(1);
			expect(executeResult[0]).toHaveLength(2);
			expect(executeResult[0][0]).toEqual({ json: { id: 1, name: 'pikachu' } });
			expect(executeResult[0][1]).toEqual({ json: { id: 2, name: 'charizard' } });
		});

		it('should handle fallback for non-array responses', async () => {
			const toolWorkflowNode = new ToolWorkflow();
			const node = toolWorkflowNode.nodeVersions[2.2] as ToolWorkflowV2;

			// Mock the tool that returns a string (edge case)
			const mockTool = {
				invoke: vi.fn().mockResolvedValue('plain string response'),
			} as any;

			vi.spyOn(WorkflowToolService.prototype, 'createTool').mockResolvedValue(mockTool);

			const inputData: INodeExecutionData[] = [{ json: { query: 'test query' } }];

			const executeResult = await node.execute.call(
				mock<IExecuteFunctions>({
					getInputData: vi.fn(() => inputData),
					getNode: vi.fn(() =>
						mock<INode>({
							typeVersion: 2.2,
							name: 'test tool',
							parameters: { workflowInputs: { schema: [] } },
						}),
					),
					getNodeParameter: vi.fn().mockImplementation((paramName) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							default:
								return;
						}
					}),
				}),
			);

			// Verify the fallback wraps it properly
			expect(executeResult).toHaveLength(1);
			expect(executeResult[0]).toHaveLength(1);
			expect(executeResult[0][0]).toEqual({
				json: { response: 'plain string response' },
				pairedItem: { item: 0 },
			});
		});
	});
});

describe('ToolWorkflowV1', () => {
	beforeEach(() => {
		vi.mocked(manual.execute).mockResolvedValue({ json: { query: 'hello' } });
	});

	const createContext = () => {
		const logAiEvent = vi.fn();
		const ctx = mock<ISupplyDataFunctions>({
			getNode: vi.fn(() => mock<INode>({ typeVersion: 1.3, name: 'test tool' })),
			getNodeParameter: vi.fn().mockImplementation((paramName, _itemIndex, fallback) => {
				switch (paramName) {
					case 'name':
						return 'test_tool';
					case 'description':
						return 'description text';
					case 'specifyInputSchema':
						return false;
					case 'source':
						return 'database';
					case 'workflowId':
						return { value: 'wf-id' };
					default:
						return fallback;
				}
			}),
			getWorkflowDataProxy: vi.fn(
				() =>
					({
						$execution: { id: 'exec-id' },
						$workflow: { id: 'workflow-id' },
					}) as unknown as IWorkflowDataProxyData,
			),
			getMode: vi.fn((): WorkflowExecuteMode => 'manual'),
			addInputData: vi.fn(() => ({ index: 0 })),
			addOutputData: vi.fn(),
			executeWorkflow: vi.fn(),
			logAiEvent,
		});
		return { ctx, logAiEvent };
	};

	it('should emit ai-tool-called on successful invocation', async () => {
		const { ctx, logAiEvent } = createContext();
		const mockExecuteWorkflowResponse: ExecuteWorkflowData = {
			data: [[{ json: { result: 'ok' } }]],
			executionId: 'test-execution',
		};
		vi.spyOn(ctx, 'executeWorkflow').mockResolvedValueOnce(mockExecuteWorkflowResponse);

		const toolWorkflowNode = new ToolWorkflow();
		const node = toolWorkflowNode.nodeVersions[1.3] as ToolWorkflowV1;
		const supplyDataResult = await node.supplyData.call(ctx, 0);
		const tool = supplyDataResult.response as DynamicTool;

		const expectedResponse = JSON.stringify({ result: 'ok' }, null, 2);
		await expect(tool.func('hello')).resolves.toBe(expectedResponse);
		expect(logAiEvent).toHaveBeenCalledWith(
			'ai-tool-called',
			JSON.stringify({ query: 'hello', response: expectedResponse }),
		);
	});

	it('should emit ai-tool-called when the sub-workflow fails', async () => {
		const { ctx, logAiEvent } = createContext();
		vi.spyOn(ctx, 'executeWorkflow').mockRejectedValueOnce(new Error('Workflow execution failed'));

		const toolWorkflowNode = new ToolWorkflow();
		const node = toolWorkflowNode.nodeVersions[1.3] as ToolWorkflowV1;
		const supplyDataResult = await node.supplyData.call(ctx, 0);
		const tool = supplyDataResult.response as DynamicTool;

		const result = await tool.func('hello');

		expect(result).toContain('There was an error');
		expect(result).toContain('Workflow execution failed');
		expect(logAiEvent).toHaveBeenCalledWith(
			'ai-tool-called',
			JSON.stringify({ query: 'hello', response: result }),
		);
	});

	it('should return a placeholder when the sub-workflow is waiting with no items', async () => {
		const { ctx } = createContext();
		vi.spyOn(ctx, 'executeWorkflow').mockResolvedValueOnce({
			data: [],
			executionId: 'test-execution',
			waitTill: new Date('3000-01-01'),
		});

		const toolWorkflowNode = new ToolWorkflow();
		const node = toolWorkflowNode.nodeVersions[1.3] as ToolWorkflowV1;
		const supplyDataResult = await node.supplyData.call(ctx, 0);
		const tool = supplyDataResult.response as DynamicTool;
		const result = await tool.func('hello');

		expect(result).toBe(JSON.stringify(SUB_WORKFLOW_WAITING_PLACEHOLDER));
		expect(result).not.toContain('The workflow did not return a response');
	});

	it('should ignore the passthrough payload and return the placeholder when the sub-workflow is waiting', async () => {
		const { ctx } = createContext();
		// Wait / Send-and-Wait nodes park with their input passed through as run data.
		vi.spyOn(ctx, 'executeWorkflow').mockResolvedValueOnce({
			data: [[{ json: { query: 'hello' } }]],
			executionId: 'test-execution',
			waitTill: new Date('3000-01-01'),
		});

		const toolWorkflowNode = new ToolWorkflow();
		const node = toolWorkflowNode.nodeVersions[1.3] as ToolWorkflowV1;
		const supplyDataResult = await node.supplyData.call(ctx, 0);
		const tool = supplyDataResult.response as DynamicTool;
		const result = await tool.func('hello');

		expect(result).toBe(JSON.stringify(SUB_WORKFLOW_WAITING_PLACEHOLDER));
	});

	it('should return the missing-response error when the sub-workflow is not waiting', async () => {
		const { ctx } = createContext();
		vi.spyOn(ctx, 'executeWorkflow').mockResolvedValueOnce({
			data: [],
			executionId: 'test-execution',
		});

		const toolWorkflowNode = new ToolWorkflow();
		const node = toolWorkflowNode.nodeVersions[1.3] as ToolWorkflowV1;
		const supplyDataResult = await node.supplyData.call(ctx, 0);
		const tool = supplyDataResult.response as DynamicTool;
		const result = await tool.func('hello');

		expect(result).toContain('The workflow did not return a response');
	});
});
