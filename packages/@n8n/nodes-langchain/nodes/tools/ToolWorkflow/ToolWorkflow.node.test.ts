import { DynamicTool } from '@langchain/classic/tools';
import {
	type ExecuteWorkflowData,
	type IDataObject,
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

	describe('execute', () => {
		const createExecuteContext = (items: INodeExecutionData[]) =>
			mock<IExecuteFunctions>({
				getInputData: vi.fn(() => items),
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
				setMetadata: vi.fn(),
			});

		const node = new ToolWorkflow().nodeVersions[1.3] as ToolWorkflowV1;

		const useInputSchema = (
			ctx: IExecuteFunctions,
			inputSchemaFor: (itemIndex: number) => string,
		) => {
			const parameter = vi.mocked(ctx.getNodeParameter).getMockImplementation()!;
			vi.mocked(ctx.getNodeParameter).mockImplementation(
				(paramName: string, itemIndex: number, fallback?: unknown) => {
					switch (paramName) {
						case 'specifyInputSchema':
							return true;
						case 'schemaType':
							return 'manual';
						case 'inputSchema':
							return inputSchemaFor(itemIndex);
						default:
							return parameter(paramName, itemIndex, fallback);
					}
				},
			);
		};

		const citySchema = JSON.stringify({
			type: 'object',
			properties: { city: { type: 'string' } },
			required: ['city'],
		});

		it('should run the sub-workflow once per input item and pair each result', async () => {
			const ctx = createExecuteContext([
				{ json: { input: 'first' } },
				{ json: { input: 'second' } },
			]);
			ctx.executeWorkflow
				.mockResolvedValueOnce({ data: [[{ json: { result: 'one' } }]], executionId: 'sub-1' })
				.mockResolvedValueOnce({ data: [[{ json: { result: 'two' } }]], executionId: 'sub-2' });

			const result = await node.execute.call(ctx);

			expect(result).toEqual([
				[
					{ json: { result: 'one' }, pairedItem: { item: 0 } },
					{ json: { result: 'two' }, pairedItem: { item: 1 } },
				],
			]);
			expect(manual.execute).toHaveBeenNthCalledWith(
				1,
				{ json: { query: 'first' } },
				0,
				expect.anything(),
				expect.anything(),
				expect.anything(),
			);
			expect(ctx.setMetadata).toHaveBeenLastCalledWith({
				subExecution: { executionId: 'sub-2', workflowId: 'wf-id' },
			});
			expect(ctx.addInputData).not.toHaveBeenCalled();
			expect(ctx.addOutputData).not.toHaveBeenCalled();
			expect(ctx.logAiEvent).not.toHaveBeenCalled();
		});

		const city = { type: 'string' };
		const units = { type: 'string' };
		const closedQuery = { city: 'Berlin' };
		const unitsQuery = { city: 'Berlin', units: 'metric' };
		const openQuery = { chatInput: 'hi', city: 'Berlin', units: 'metric', turn: 2 };

		it.each([
			['additionalProperties unset', { properties: { city } }, closedQuery],
			[
				'additionalProperties false',
				{ properties: { city }, additionalProperties: false },
				closedQuery,
			],
			[
				'additionalProperties false and allOf',
				{
					properties: { city },
					additionalProperties: false,
					allOf: [{ properties: { city: { minLength: 1 } } }],
				},
				closedQuery,
			],
			[
				'additionalProperties false and a root default',
				{ properties: { city }, additionalProperties: false, default: { city: 'Paris' } },
				closedQuery,
			],
			[
				'additionalProperties true',
				{ properties: { city }, additionalProperties: true },
				openQuery,
			],
			['no properties', {}, openQuery],
			[
				'patternProperties',
				{ properties: { city }, patternProperties: { '^u': { type: 'string' } } },
				{ chatInput: 'hi', city: 'Berlin', units: 'metric' },
			],
			[
				'only patternProperties',
				{ patternProperties: { '^(u|t)': { type: 'string' } } },
				{ chatInput: 'hi', city: 'Berlin', units: 'metric' },
			],
			[
				'every matching patternProperties pattern',
				{
					properties: { city },
					patternProperties: { '^u': { type: 'string' }, n: { type: 'number' } },
				},
				{ city: 'Berlin', turn: 2 },
			],
			[
				'typed additionalProperties and a strict allOf member',
				{
					properties: { city },
					additionalProperties: { type: 'string' },
					allOf: [{ properties: { city }, additionalProperties: false }],
				},
				closedQuery,
			],
			[
				'no root properties and a strict allOf member',
				{ allOf: [{ properties: { city, units }, additionalProperties: false }] },
				unitsQuery,
			],
			[
				'an allOf member key',
				{ properties: { city }, allOf: [{ properties: { units } }] },
				unitsQuery,
			],
			[
				'an anyOf member key',
				{ properties: { city }, anyOf: [{ properties: { units } }] },
				unitsQuery,
			],
			[
				'a oneOf member key',
				{ properties: { city }, oneOf: [{ properties: { units } }] },
				unitsQuery,
			],
			[
				'a nested allOf member key',
				{ properties: { city }, allOf: [{ allOf: [{ properties: { units } }] }] },
				unitsQuery,
			],
			[
				'typed additionalProperties',
				{ properties: { city }, additionalProperties: { type: 'string' } },
				{ chatInput: 'hi', city: 'Berlin', units: 'metric' },
			],
			[
				'only typed additionalProperties',
				{ additionalProperties: { type: 'string' } },
				{ chatInput: 'hi', city: 'Berlin', units: 'metric' },
			],
			[
				'additionalProperties not',
				{ properties: { city }, additionalProperties: { not: {} } },
				closedQuery,
			],
		])(
			'should pass the engine item to the sub-workflow by the input schema with %s',
			async (_, schema, query) => {
				const ctx = createExecuteContext([
					{
						json: {
							chatInput: 'hi',
							city: 'Berlin',
							units: 'metric',
							turn: 2,
							toolCallId: 'call_1',
						},
					},
				]);
				useInputSchema(ctx, () => JSON.stringify({ type: 'object', ...schema }));
				ctx.executeWorkflow.mockResolvedValueOnce({
					data: [[{ json: { forecast: 'sunny' } }]],
					executionId: 'sub-1',
				});

				const result = await node.execute.call(ctx);

				expect(manual.execute).toHaveBeenCalledWith(
					{ json: { query } },
					0,
					expect.anything(),
					expect.anything(),
					expect.anything(),
				);
				expect(result).toEqual([[{ json: { forecast: 'sunny' }, pairedItem: { item: 0 } }]]);
			},
		);

		it('should return the waiting placeholder when the sub-workflow is waiting', async () => {
			const ctx = createExecuteContext([{ json: { input: 'hello' } }]);
			ctx.executeWorkflow.mockResolvedValueOnce({
				data: [[{ json: { query: 'hello' } }]],
				executionId: 'sub-1',
				waitTill: new Date('3000-01-01'),
			});

			const result = await node.execute.call(ctx);

			expect(result).toEqual([
				[{ json: SUB_WORKFLOW_WAITING_PLACEHOLDER, pairedItem: { item: 0 } }],
			]);
			expect(ctx.setMetadata).toHaveBeenCalledWith({
				subExecution: { executionId: 'sub-1', workflowId: 'wf-id' },
			});
		});

		it('should wrap responses that are not objects', async () => {
			const ctx = createExecuteContext([{ json: { input: 'hello' } }]);
			ctx.executeWorkflow.mockResolvedValueOnce({
				data: [[{ json: 42 as unknown as IDataObject }]],
				executionId: 'sub-1',
			});

			const result = await node.execute.call(ctx);

			expect(result).toEqual([[{ json: { response: '42' }, pairedItem: { item: 0 } }]]);
		});

		it('should throw when the sub-workflow fails so the engine records the error', async () => {
			const ctx = createExecuteContext([{ json: { input: 'hello' } }]);
			ctx.executeWorkflow.mockRejectedValueOnce(new Error('Workflow execution failed'));

			await expect(node.execute.call(ctx)).rejects.toThrow('Workflow execution failed');
		});

		it('should report the index of the item whose sub-workflow failed', async () => {
			const ctx = createExecuteContext([
				{ json: { input: 'first' } },
				{ json: { input: 'second' } },
			]);
			ctx.executeWorkflow
				.mockResolvedValueOnce({ data: [[{ json: { result: 'one' } }]], executionId: 'sub-1' })
				.mockRejectedValueOnce(new Error('Workflow execution failed'));

			await expect(node.execute.call(ctx)).rejects.toMatchObject({
				message: 'Workflow execution failed',
				context: { itemIndex: 1 },
			});
		});

		it('should report the index of the item whose tool could not be built', async () => {
			const ctx = createExecuteContext([{ json: { city: 'Berlin' } }, { json: { city: 'Paris' } }]);
			useInputSchema(ctx, (itemIndex) => (itemIndex === 1 ? 'not json' : citySchema));
			ctx.executeWorkflow.mockResolvedValue({
				data: [[{ json: { forecast: 'sunny' } }]],
				executionId: 'sub-1',
			});

			await expect(node.execute.call(ctx)).rejects.toMatchObject({
				message: expect.stringContaining('Error during parsing of JSON Schema'),
				context: { itemIndex: 1 },
			});
			expect(ctx.executeWorkflow).toHaveBeenCalledTimes(1);
		});
	});
});
