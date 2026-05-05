import { AgentExecutor } from '@langchain/classic/agents';
import type { Tool } from '@langchain/classic/tools';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import * as helpers from '../../../../../utils/helpers';
import * as tracing from '../../../../../utils/tracing';
import { toolsAgentExecute } from '../../agents/ToolsAgent/V1/execute';

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
		expect(result[0][0].json).toEqual({ output: { text: 'success 1' } });
		expect(result[0][1].json).toEqual({ output: { text: 'success 2' } });
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
		expect(result[0][0].json).toEqual({ output: { text: 'success' } });
		expect(result[0][1].json).toEqual({ error: 'Test error' });
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
});
