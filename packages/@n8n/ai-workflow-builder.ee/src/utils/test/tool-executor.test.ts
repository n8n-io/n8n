import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { ToolInputParsingException } from '@langchain/core/tools';
import type { Command as CommandType } from '@langchain/langgraph';

import { createWorkflow, createNode } from '../../../test/test-utils';
import type { ToolExecutorOptions } from '../../types/config';
import type { WorkflowOperation } from '../../types/workflow';
import type { WorkflowState } from '../../workflow-state';
import { executeToolsInParallel } from '../tool-executor';

// Type for our mocked Command
type MockedCommand = CommandType & { _isCommand: boolean };

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => {
	// Mock Command class
	class MockCommand {
		_isCommand = true;
		update: unknown;

		constructor(params: { update: unknown }) {
			this.update = params.update;
		}
	}

	return {
		isCommand: jest.fn((obj: unknown) => {
			return (
				obj instanceof MockCommand || (obj && (obj as { _isCommand?: boolean })._isCommand === true)
			);
		}),
		Command: MockCommand,
	};
});

// Get properly typed Command from mock
const MockCommand = jest.requireMock<{
	Command: new (params: { update: unknown }) => MockedCommand;
}>('@langchain/langgraph').Command;

describe('tool-executor', () => {
	describe('executeToolsInParallel', () => {
		// Helper to create mock state
		const createState = (messages: BaseMessage[]): typeof WorkflowState.State => ({
			workflowJSON: createWorkflow([]),
			workflowOperations: null,
			messages,
			workflowContext: {},
			previousSummary: 'EMPTY',
		});

		// Helper to create mock tool
		const createMockTool = (result: unknown) =>
			({
				invoke: jest.fn().mockResolvedValue(result),
				name: 'mock-tool',
				description: 'Mock tool',
				schema: {},
				func: jest.fn(),
			}) as unknown as DynamicStructuredTool;

		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should execute single tool successfully', async () => {
			const toolMessage = new ToolMessage({
				content: 'Tool executed successfully',
				tool_call_id: 'call-1',
			});
			const mockTool = createMockTool(toolMessage);

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'test_tool',
					args: { param: 'value' },
					type: 'tool_call',
				},
			];

			const state = createState([new HumanMessage('Test'), aiMessage]);
			const toolMap = new Map<string, DynamicStructuredTool>([['test_tool', mockTool]]);

			const options: ToolExecutorOptions = { state, toolMap };
			const result = await executeToolsInParallel(options);

			expect(mockTool.invoke).toHaveBeenCalledWith(
				{ param: 'value' },
				{
					toolCall: {
						id: 'call-1',
						name: 'test_tool',
						args: { param: 'value' },
					},
				},
			);
			expect(result.messages).toHaveLength(1);
			expect(result.messages?.[0]).toBe(toolMessage);
			expect(result.workflowOperations).toBeUndefined();
		});

		it('should execute multiple tools in parallel', async () => {
			const toolMessage1 = new ToolMessage({
				content: 'Tool 1 result',
				tool_call_id: 'call-1',
			});
			const toolMessage2 = new ToolMessage({
				content: 'Tool 2 result',
				tool_call_id: 'call-2',
			});

			const mockTool1 = createMockTool(toolMessage1);
			const mockTool2 = createMockTool(toolMessage2);

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'tool1',
					args: { param: 'value1' },
					type: 'tool_call',
				},
				{
					id: 'call-2',
					name: 'tool2',
					args: { param: 'value2' },
					type: 'tool_call',
				},
			];

			const state = createState([aiMessage]);
			const toolMap = new Map<string, DynamicStructuredTool>([
				['tool1', mockTool1],
				['tool2', mockTool2],
			]);

			const options: ToolExecutorOptions = { state, toolMap };
			const result = await executeToolsInParallel(options);

			expect(mockTool1.invoke).toHaveBeenCalled();
			expect(mockTool2.invoke).toHaveBeenCalled();
			expect(result.messages).toHaveLength(2);
			expect(result.messages).toContain(toolMessage1);
			expect(result.messages).toContain(toolMessage2);
		});

		it('should handle tool returning Command with state updates', async () => {
			const operations: WorkflowOperation[] = [
				{ type: 'addNodes', nodes: [createNode({ id: 'node1' })] },
			];
			const stateUpdate: Partial<typeof WorkflowState.State> = {
				workflowOperations: operations,
				messages: [new ToolMessage({ content: 'Added node', tool_call_id: 'call-1' })],
			};

			const command = new MockCommand({ update: stateUpdate });
			const mockTool = createMockTool(command);

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'add_nodes',
					args: { nodeType: 'n8n-nodes-base.code' },
					type: 'tool_call',
				},
			];

			const state = createState([aiMessage]);
			const toolMap = new Map<string, DynamicStructuredTool>([['add_nodes', mockTool]]);

			const options: ToolExecutorOptions = { state, toolMap };
			const result = await executeToolsInParallel(options);

			expect(result.messages).toHaveLength(1);
			expect(result.workflowOperations).toEqual(operations);
		});

		it('should handle tool returning regular messages', async () => {
			const toolMessage = new ToolMessage({
				content: 'Regular message',
				tool_call_id: 'call-1',
			});
			const mockTool = createMockTool(toolMessage);

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'test_tool',
					args: {},
					type: 'tool_call',
				},
			];

			const state = createState([aiMessage]);
			const toolMap = new Map<string, DynamicStructuredTool>([['test_tool', mockTool]]);

			const options: ToolExecutorOptions = { state, toolMap };
			const result = await executeToolsInParallel(options);

			expect(result.messages).toEqual([toolMessage]);
			expect(result.workflowOperations).toBeUndefined();
		});

		it('should collect all workflow operations from multiple tools', async () => {
			const operations1: WorkflowOperation[] = [
				{ type: 'addNodes', nodes: [createNode({ id: 'node1' })] },
			];
			const operations2: WorkflowOperation[] = [{ type: 'setConnections', connections: {} }];

			const command1 = new MockCommand({
				update: {
					workflowOperations: operations1,
					messages: [],
				},
			});
			const command2 = new MockCommand({
				update: {
					workflowOperations: operations2,
					messages: [],
				},
			});

			const mockTool1 = createMockTool(command1);
			const mockTool2 = createMockTool(command2);

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'tool1',
					args: {},
					type: 'tool_call',
				},
				{
					id: 'call-2',
					name: 'tool2',
					args: {},
					type: 'tool_call',
				},
			];

			const state = createState([aiMessage]);
			const toolMap = new Map<string, DynamicStructuredTool>([
				['tool1', mockTool1],
				['tool2', mockTool2],
			]);

			const options: ToolExecutorOptions = { state, toolMap };
			const result = await executeToolsInParallel(options);

			expect(result.workflowOperations).toHaveLength(2);
			expect(result.workflowOperations).toEqual([...operations1, ...operations2]);
		});

		it('should merge messages from both direct returns and state updates', async () => {
			const directMessage = new ToolMessage({
				content: 'Direct message',
				tool_call_id: 'call-1',
			});
			const stateMessage = new ToolMessage({
				content: 'State message',
				tool_call_id: 'call-2',
			});

			const command = new MockCommand({
				update: {
					messages: [stateMessage],
					workflowOperations: [],
				},
			});

			const mockTool1 = createMockTool(directMessage);
			const mockTool2 = createMockTool(command);

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'tool1',
					args: {},
					type: 'tool_call',
				},
				{
					id: 'call-2',
					name: 'tool2',
					args: {},
					type: 'tool_call',
				},
			];

			const state = createState([aiMessage]);
			const toolMap = new Map<string, DynamicStructuredTool>([
				['tool1', mockTool1],
				['tool2', mockTool2],
			]);

			const options: ToolExecutorOptions = { state, toolMap };
			const result = await executeToolsInParallel(options);

			expect(result.messages).toHaveLength(2);
			expect(result.messages).toContain(directMessage);
			expect(result.messages).toContain(stateMessage);
		});

		describe('error handling', () => {
			it('should throw when last message is not AIMessage', async () => {
				const state = createState([new HumanMessage('Test')]);
				const toolMap = new Map<string, DynamicStructuredTool>();

				const options: ToolExecutorOptions = { state, toolMap };

				await expect(executeToolsInParallel(options)).rejects.toThrow(
					'Most recent message must be an AIMessage with tool calls',
				);
			});

			it('should throw when AIMessage has no tool_calls', async () => {
				const aiMessage = new AIMessage('No tool calls');
				const state = createState([aiMessage]);
				const toolMap = new Map<string, DynamicStructuredTool>();

				const options: ToolExecutorOptions = { state, toolMap };

				await expect(executeToolsInParallel(options)).rejects.toThrow(
					'AIMessage must have tool calls',
				);
			});

			it('should return error message when tool is not found in toolMap', async () => {
				const aiMessage = new AIMessage('');
				aiMessage.tool_calls = [
					{
						id: 'call-1',
						name: 'non_existent_tool',
						args: {},
						type: 'tool_call',
					},
				];

				const state = createState([aiMessage]);
				const toolMap = new Map<string, DynamicStructuredTool>(); // Empty map

				const options: ToolExecutorOptions = { state, toolMap };

				const result = await executeToolsInParallel(options);

				expect(result.messages).toHaveLength(1);
				const message = result.messages![0] as ToolMessage;
				expect(message).toBeInstanceOf(ToolMessage);
				expect(message.content).toBe(
					'Tool non_existent_tool failed: Tool non_existent_tool not found',
				);
				expect(message.tool_call_id).toBe('call-1');
				expect(message.additional_kwargs.error).toBe(true);
			});

			it('should wrap schema validation errors as ValidationError', async () => {
				const mockTool = createMockTool(null);
				// Mock tool throwing a ToolInputParsingException
				mockTool.invoke = jest
					.fn()
					.mockRejectedValue(
						new ToolInputParsingException('Received tool input did not match expected schema'),
					);

				const aiMessage = new AIMessage('');
				aiMessage.tool_calls = [
					{
						id: 'call-1',
						name: 'test_tool',
						args: { invalidParam: 'value' },
						type: 'tool_call',
					},
				];

				const state = createState([aiMessage]);
				const toolMap = new Map<string, DynamicStructuredTool>([['test_tool', mockTool]]);

				const options: ToolExecutorOptions = { state, toolMap };

				const result = await executeToolsInParallel(options);

				expect(result.messages).toHaveLength(1);
				const message = result.messages![0] as ToolMessage;
				expect(message).toBeInstanceOf(ToolMessage);
				expect(message.content).toBe(
					'Invalid input for tool test_tool: Received tool input did not match expected schema',
				);
				expect(message.tool_call_id).toBe('call-1');
				expect(message.additional_kwargs.error).toBe(true);
			});

			it('should wrap schema validation errors with "expected schema" message as ValidationError', async () => {
				const mockTool = createMockTool(null);
				// Mock tool throwing a regular Error with schema validation message
				mockTool.invoke = jest
					.fn()
					.mockRejectedValue(new Error('Tool input validation failed: expected schema'));

				const aiMessage = new AIMessage('');
				aiMessage.tool_calls = [
					{
						id: 'call-1',
						name: 'update_params',
						args: { wrongField: 123 },
						type: 'tool_call',
					},
				];

				const state = createState([aiMessage]);
				const toolMap = new Map<string, DynamicStructuredTool>([['update_params', mockTool]]);

				const options: ToolExecutorOptions = { state, toolMap };

				const result = await executeToolsInParallel(options);

				expect(result.messages).toHaveLength(1);
				const message = result.messages![0] as ToolMessage;
				expect(message).toBeInstanceOf(ToolMessage);
				expect(message.content).toBe(
					'Invalid input for tool update_params: Tool input validation failed: expected schema',
				);
				expect(message.tool_call_id).toBe('call-1');
				expect(message.additional_kwargs.error).toBe(true);
			});

			it('should wrap other tool errors as ToolExecutionError', async () => {
				const mockTool = createMockTool(null);
				// Mock tool throwing a generic error
				mockTool.invoke = jest.fn().mockRejectedValue(new Error('Connection timeout'));

				const aiMessage = new AIMessage('');
				aiMessage.tool_calls = [
					{
						id: 'call-1',
						name: 'http_request',
						args: { url: 'https://example.com' },
						type: 'tool_call',
					},
				];

				const state = createState([aiMessage]);
				const toolMap = new Map<string, DynamicStructuredTool>([['http_request', mockTool]]);

				const options: ToolExecutorOptions = { state, toolMap };

				const result = await executeToolsInParallel(options);

				expect(result.messages).toHaveLength(1);
				const message = result.messages![0] as ToolMessage;
				expect(message).toBeInstanceOf(ToolMessage);
				expect(message.content).toBe('Tool http_request failed: Connection timeout');
				expect(message.tool_call_id).toBe('call-1');
				expect(message.additional_kwargs.error).toBe(true);
			});

			it('should handle non-Error objects thrown by tools', async () => {
				const mockTool = createMockTool(null);
				// Mock tool throwing a non-Error object
				mockTool.invoke = jest.fn().mockRejectedValue('String error');

				const aiMessage = new AIMessage('');
				aiMessage.tool_calls = [
					{
						id: 'call-1',
						name: 'test_tool',
						args: {},
						type: 'tool_call',
					},
				];

				const state = createState([aiMessage]);
				const toolMap = new Map<string, DynamicStructuredTool>([['test_tool', mockTool]]);

				const options: ToolExecutorOptions = { state, toolMap };

				const result = await executeToolsInParallel(options);

				expect(result.messages).toHaveLength(1);
				const message = result.messages![0] as ToolMessage;
				expect(message).toBeInstanceOf(ToolMessage);
				expect(message.content).toBe('Tool test_tool failed: Unknown error occurred');
				expect(message.tool_call_id).toBe('call-1');
				expect(message.additional_kwargs.error).toBe(true);
			});

			it('should handle multiple tools with mixed success and failure', async () => {
				const successMessage = new ToolMessage({
					content: 'Success',
					tool_call_id: 'call-1',
				});
				const mockSuccessTool = createMockTool(successMessage);

				const mockFailureTool = createMockTool(null);
				mockFailureTool.invoke = jest
					.fn()
					.mockRejectedValue(
						new ToolInputParsingException('Received tool input did not match expected schema'),
					);

				const aiMessage = new AIMessage('');
				aiMessage.tool_calls = [
					{
						id: 'call-1',
						name: 'success_tool',
						args: { valid: true },
						type: 'tool_call',
					},
					{
						id: 'call-2',
						name: 'failure_tool',
						args: { invalid: true },
						type: 'tool_call',
					},
				];

				const state = createState([aiMessage]);
				const toolMap = new Map<string, DynamicStructuredTool>([
					['success_tool', mockSuccessTool],
					['failure_tool', mockFailureTool],
				]);

				const options: ToolExecutorOptions = { state, toolMap };

				// Both tools run in parallel, one succeeds and one returns error message
				const result = await executeToolsInParallel(options);

				expect(result.messages).toHaveLength(2);

				// First message should be the success
				const successMsg = result.messages![0] as ToolMessage;
				expect(successMsg).toBeInstanceOf(ToolMessage);
				expect(successMsg.content).toBe('Success');
				expect(successMsg.tool_call_id).toBe('call-1');

				// Second message should be the error
				const errorMsg = result.messages![1] as ToolMessage;
				expect(errorMsg).toBeInstanceOf(ToolMessage);
				expect(errorMsg.content).toBe(
					'Invalid input for tool failure_tool: Received tool input did not match expected schema',
				);
				expect(errorMsg.tool_call_id).toBe('call-2');
				expect(errorMsg.additional_kwargs.error).toBe(true);
			});
		});

		it('should handle tools with no operations (only messages)', async () => {
			const message = new ToolMessage({
				content: 'Message only',
				tool_call_id: 'call-1',
			});

			const command = new MockCommand({
				update: {
					messages: [message],
					// No workflowOperations
				},
			});

			const mockTool = createMockTool(command);

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'test_tool',
					args: {},
					type: 'tool_call',
				},
			];

			const state = createState([aiMessage]);
			const toolMap = new Map<string, DynamicStructuredTool>([['test_tool', mockTool]]);

			const options: ToolExecutorOptions = { state, toolMap };
			const result = await executeToolsInParallel(options);

			expect(result.messages).toEqual([message]);
			expect(result.workflowOperations).toBeUndefined();
		});

		it('should handle tools with no messages (only operations)', async () => {
			const operations: WorkflowOperation[] = [{ type: 'clear' }];

			const command = new MockCommand({
				update: {
					workflowOperations: operations,
					// No messages
				},
			});

			const mockTool = createMockTool(command);

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'clear_tool',
					args: {},
					type: 'tool_call',
				},
			];

			const state = createState([aiMessage]);
			const toolMap = new Map<string, DynamicStructuredTool>([['clear_tool', mockTool]]);

			const options: ToolExecutorOptions = { state, toolMap };
			const result = await executeToolsInParallel(options);

			expect(result.messages).toEqual([]);
			expect(result.workflowOperations).toEqual(operations);
		});

		it('should handle empty tool_calls array', async () => {
			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = []; // Empty array

			const state = createState([aiMessage]);
			const toolMap = new Map<string, DynamicStructuredTool>();

			const options: ToolExecutorOptions = { state, toolMap };

			await expect(executeToolsInParallel(options)).rejects.toThrow(
				'AIMessage must have tool calls',
			);
		});

		it('should handle tool calls without args', async () => {
			const toolMessage = new ToolMessage({
				content: 'Success',
				tool_call_id: 'call-1',
			});
			const mockTool = createMockTool(toolMessage);

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'test_tool',
					args: {}, // No args
					type: 'tool_call',
				},
			];

			const state = createState([aiMessage]);
			const toolMap = new Map<string, DynamicStructuredTool>([['test_tool', mockTool]]);

			const options: ToolExecutorOptions = { state, toolMap };
			const result = await executeToolsInParallel(options);

			expect(mockTool.invoke).toHaveBeenCalledWith(
				{}, // Empty object when args is undefined
				{
					toolCall: {
						id: 'call-1',
						name: 'test_tool',
						args: {},
					},
				},
			);
			expect(result.messages).toEqual([toolMessage]);
		});

		it('should handle multiple state updates with various message types', async () => {
			const aiResultMessage = new AIMessage('Result from tool');
			const toolResultMessage = new ToolMessage({
				content: 'Tool result',
				tool_call_id: 'call-1',
			});

			const command = new MockCommand({
				update: {
					messages: [aiResultMessage, toolResultMessage],
					workflowOperations: [{ type: 'clear' }],
				},
			});

			const mockTool = createMockTool(command);

			const aiMessage = new AIMessage('');
			aiMessage.tool_calls = [
				{
					id: 'call-1',
					name: 'test_tool',
					args: {},
					type: 'tool_call',
				},
			];

			const state = createState([aiMessage]);
			const toolMap = new Map<string, DynamicStructuredTool>([['test_tool', mockTool]]);

			const options: ToolExecutorOptions = { state, toolMap };
			const result = await executeToolsInParallel(options);

			expect(result.messages).toHaveLength(2);
			expect(result.messages).toContain(aiResultMessage);
			expect(result.messages).toContain(toolResultMessage);
			expect(result.workflowOperations).toHaveLength(1);
		});
	});
});
