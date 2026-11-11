import { AgentExecutor } from '@langchain/classic/agents';
import type { Tool } from '@langchain/classic/tools';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import * as helpers from '../../../../../utils/helpers';
import * as tracing from '../../../../../utils/tracing';
import * as commonModule from '../../agents/ToolsAgent/common';
import { toolsAgentExecute } from '../../agents/ToolsAgent/V1/execute';

// getInputConnectionData is stubbed to return the same mock for every connection type
// below, so isolate memory here too. Otherwise the model mock leaks in as "memory" and
// loadMemory/saveToMemory run against an object that isn't a real BaseChatMemory.
vi.mock('../../agents/ToolsAgent/common', async () => ({
	...(await vi.importActual('../../agents/ToolsAgent/common')),
	getOptionalMemory: vi.fn(),
}));

const mockHelpers = mock<IExecuteFunctions['helpers']>();
const mockContext = mock<IExecuteFunctions>({ helpers: mockHelpers });
const ensureWithConfig = <T extends object>(executor: T) => {
	(executor as { withConfig: Mock }).withConfig = vi.fn().mockReturnValue(executor);
	return executor;
};

beforeEach(() => vi.resetAllMocks());

describe('toolsAgentExecute', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockContext.logger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};
		mockContext.getWorkflow.mockReturnValue({ name: 'Test Workflow' } as any);
		mockContext.getExecutionId.mockReturnValue('exec-123');
	});

	it('should process items', async () => {
		const mockNode = mock<INode>();
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = vi.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		// Mock getNodeParameter to return default values
		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: vi
				.fn()
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 1' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 2' }) }),
		};

		vi.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(
			ensureWithConfig(mockExecutor) as any,
		);

		const result = await toolsAgentExecute.call(mockContext);

		expect(mockExecutor.invoke).toHaveBeenCalledTimes(2);
		expect(result[0]).toHaveLength(2);
		// No memory node is connected in this test, so the output stays the raw
		// string the executor returned instead of going through the JSON parse gate.
		expect(result[0][0].json).toEqual({ output: '{"text":"success 1"}' });
		expect(result[0][1].json).toEqual({ output: '{"text":"success 2"}' });
	});

	it('should handle errors when continueOnFail is true', async () => {
		const mockNode = mock<INode>();
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = vi.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.continueOnFail.mockReturnValue(true);

		const mockExecutor = {
			invoke: vi
				.fn()
				.mockResolvedValueOnce({ output: '{ "text": "success" }' })
				.mockRejectedValueOnce(new Error('Test error')),
		};

		vi.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(
			ensureWithConfig(mockExecutor) as any,
		);

		const result = await toolsAgentExecute.call(mockContext);

		expect(result[0]).toHaveLength(2);
		// No memory node is connected in this test, so the output stays the raw
		// string the executor returned instead of going through the JSON parse gate.
		expect(result[0][0].json).toEqual({ output: '{ "text": "success" }' });
		expect(result[0][1].json).toEqual({ error: 'Test error' });
	});

	it('should not expose raw model output in parser error messages', async () => {
		const mockNode = mock<INode>();
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = vi.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.continueOnFail.mockReturnValue(true);
		const rawModelOutput = 'customer payload in agent output';
		const mockExecutor = {
			invoke: vi
				.fn()
				.mockRejectedValue(new Error(`Unable to parse JSON response: Thought: ${rawModelOutput}`)),
		};

		vi.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(
			ensureWithConfig(mockExecutor) as any,
		);

		const result = await toolsAgentExecute.call(mockContext);

		expect(result[0]).toEqual([
			{ json: { error: "Model output doesn't fit required format" }, pairedItem: { item: 0 } },
		]);
		expect(result[0][0].json.error).not.toContain(rawModelOutput);
	});

	it('should throw error in when continueOnFail is false', async () => {
		const mockNode = mock<INode>();
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = vi.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.continueOnFail.mockReturnValue(false);

		const mockExecutor = {
			invoke: vi
				.fn()
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success' }) })
				.mockRejectedValueOnce(new Error('Test error')),
		};

		vi.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(
			ensureWithConfig(mockExecutor) as any,
		);

		await expect(toolsAgentExecute.call(mockContext)).rejects.toThrow('Test error');
	});

	it('should surface a useful message when a tool throws a plain Error("Error") with continueOnFail', async () => {
		const mockNode = mock<INode>();
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = vi.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.continueOnFail.mockReturnValue(true);

		const mockExecutor = {
			invoke: vi.fn().mockRejectedValue(new Error('Error')),
		};

		vi.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(
			ensureWithConfig(mockExecutor) as any,
		);

		const result = await toolsAgentExecute.call(mockContext);

		expect(result[0][0].json.error).not.toBe('Error');
		expect(result[0][0].json.error).toBe('Agent execution failed');
	});

	it('should throw a NodeOperationError with a useful message when a tool throws Error("Error") without continueOnFail', async () => {
		const mockNode = mock<INode>();
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = vi.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.continueOnFail.mockReturnValue(false);

		const mockExecutor = {
			invoke: vi.fn().mockRejectedValue(new Error('Error')),
		};

		vi.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(
			ensureWithConfig(mockExecutor) as any,
		);

		await expect(toolsAgentExecute.call(mockContext)).rejects.toThrow('Agent execution failed');
	});

	it('should pass tracing metadata to tracing config', async () => {
		const mockNode = mock<INode>();
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input 1' } }]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = vi.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
					tracingMetadata: {
						values: [{ key: 'team', value: 'ai' }],
					},
				};
			return defaultValue;
		});

		const mockTracingConfig = {
			runName: '[Test Workflow] Test Node',
			metadata: { execution_id: 'test-123', workflow: {}, node: 'Test Node' },
		};
		const tracingSpy = vi.spyOn(tracing, 'getTracingConfig').mockReturnValue(mockTracingConfig);

		const mockExecutor = {
			invoke: vi.fn().mockResolvedValueOnce({ output: JSON.stringify({ text: 'success' }) }),
		};

		vi.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(
			ensureWithConfig(mockExecutor) as any,
		);

		await toolsAgentExecute.call(mockContext);

		expect(tracingSpy).toHaveBeenCalledWith(mockContext, {
			additionalMetadata: { team: 'ai' },
		});
	});

	it('should load chat history and save tool call messages when a memory node is connected', async () => {
		const mockNode = mock<INode>();
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([{ json: { text: 'test input' } }]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = vi.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const addMessages = vi.fn();
		const loadMemoryVariables = vi.fn().mockResolvedValue({ chat_history: [] });
		vi.spyOn(commonModule, 'getOptionalMemory').mockResolvedValue({
			loadMemoryVariables,
			chatHistory: { addMessages },
		} as any);

		vi.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'hasOutputParser') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const toolCallMessage = new AIMessage({
			content: 'Checking the weather',
			tool_calls: [{ id: 'call-1', name: 'weather', args: { city: 'Berlin' }, type: 'tool_call' }],
		});
		const mockExecutor = {
			invoke: vi.fn().mockResolvedValue({
				output: 'It is sunny.',
				intermediateSteps: [
					{
						action: {
							tool: 'weather',
							toolInput: { city: 'Berlin' },
							log: 'Checking the weather',
							messageLog: [toolCallMessage],
							toolCallId: 'call-1',
							type: 'tool_call',
						},
						observation: 'sunny',
					},
				],
			}),
		};
		vi.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(
			ensureWithConfig(mockExecutor) as any,
		);

		const result = await toolsAgentExecute.call(mockContext);

		// The stored history goes into the model call
		expect(loadMemoryVariables).toHaveBeenCalledTimes(1);
		expect(mockExecutor.invoke).toHaveBeenCalledWith(
			expect.objectContaining({ chat_history: [] }),
			expect.anything(),
		);

		// The whole turn lands in memory, tool call and result included
		expect(addMessages).toHaveBeenCalledTimes(1);
		const saved = addMessages.mock.calls[0][0];
		expect(saved).toHaveLength(4);
		expect(saved[0]).toBeInstanceOf(HumanMessage);
		expect(saved[0].content).toBe('test input');
		expect(saved[1]).toBe(toolCallMessage);
		expect(saved[2]).toBeInstanceOf(ToolMessage);
		expect(saved[2].tool_call_id).toBe('call-1');
		expect(saved[2].content).toBe('sunny');
		expect(saved[3]).toBeInstanceOf(AIMessage);
		expect(saved[3].content).toBe('It is sunny.');

		// Steps feed the memory save but stay out of the node output
		expect(result[0][0].json).toEqual({ output: 'It is sunny.' });
	});
});
