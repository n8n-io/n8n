/* eslint-disable @typescript-eslint/require-await */
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { MemorySaver } from '@langchain/langgraph';
import { GraphRecursionError } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

jest.mock('@/tools/add-node.tool', () => ({
	createAddNodeTool: jest.fn().mockReturnValue({ tool: { name: 'add_node' } }),
}));
jest.mock('@/tools/connect-nodes.tool', () => ({
	createConnectNodesTool: jest.fn().mockReturnValue({ tool: { name: 'connect_nodes' } }),
}));
jest.mock('@/tools/node-details.tool', () => ({
	createNodeDetailsTool: jest.fn().mockReturnValue({ tool: { name: 'node_details' } }),
}));
jest.mock('@/tools/node-search.tool', () => ({
	createNodeSearchTool: jest.fn().mockReturnValue({ tool: { name: 'node_search' } }),
}));
jest.mock('@/tools/remove-node.tool', () => ({
	createRemoveNodeTool: jest.fn().mockReturnValue({ tool: { name: 'remove_node' } }),
}));
jest.mock('@/tools/update-node-parameters.tool', () => ({
	createUpdateNodeParametersTool: jest
		.fn()
		.mockReturnValue({ tool: { name: 'update_node_parameters' } }),
}));
jest.mock('@/tools/get-node-parameter.tool', () => ({
	createGetNodeParameterTool: jest.fn().mockReturnValue({ tool: { name: 'get_node_parameter' } }),
}));
jest.mock('@/tools/prompts/main-agent.prompt', () => ({
	mainAgentPrompt: {
		invoke: jest.fn().mockResolvedValue('mocked prompt'),
	},
}));
jest.mock('@/utils/operations-processor', () => ({
	processOperations: jest.fn(),
}));

jest.mock('@/utils/stream-processor', () => ({
	createStreamProcessor: jest.fn(),
	formatMessages: jest.fn(),
}));
jest.mock('@/utils/tool-executor', () => ({
	executeToolsInParallel: jest.fn(),
}));
jest.mock('@/chains/conversation-compact', () => ({
	conversationCompactChain: jest.fn(),
}));
jest.mock('@/chains/workflow-name', () => ({
	workflowNameChain: jest.fn(),
}));

const mockRandomUUID = jest.fn();
Object.defineProperty(global, 'crypto', {
	value: {
		randomUUID: mockRandomUUID,
	},
	writable: true,
});

import { MAX_AI_BUILDER_PROMPT_LENGTH } from '@/constants';
import { ValidationError } from '@/errors';
import type { StreamOutput } from '@/types/streaming';
import { createStreamProcessor } from '@/utils/stream-processor';
import {
	WorkflowBuilderAgent,
	type WorkflowBuilderAgentConfig,
	type ChatPayload,
	shouldModifyState,
} from '@/workflow-builder-agent';
import type { WorkflowState } from '@/workflow-state';

describe('WorkflowBuilderAgent', () => {
	let agent: WorkflowBuilderAgent;
	let mockLlmSimple: BaseChatModel;
	let mockLlmComplex: BaseChatModel;
	let mockLogger: Logger;
	let mockCheckpointer: MemorySaver;
	let parsedNodeTypes: INodeTypeDescription[];
	let config: WorkflowBuilderAgentConfig;

	const mockCreateStreamProcessor = createStreamProcessor as jest.MockedFunction<
		typeof createStreamProcessor
	>;

	beforeEach(() => {
		mockLlmSimple = mock<BaseChatModel>({
			_llmType: jest.fn().mockReturnValue('test-llm'),
			bindTools: jest.fn().mockReturnThis(),
			invoke: jest.fn(),
		});

		mockLlmComplex = mock<BaseChatModel>({
			_llmType: jest.fn().mockReturnValue('test-llm-complex'),
			bindTools: jest.fn().mockReturnThis(),
			invoke: jest.fn(),
		});

		mockLogger = mock<Logger>({
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		});

		mockCheckpointer = mock<MemorySaver>();
		mockCheckpointer.getTuple = jest.fn();
		mockCheckpointer.put = jest.fn();
		mockCheckpointer.list = jest.fn();

		parsedNodeTypes = [
			{
				name: 'TestNode',
				displayName: 'Test Node',
				description: 'A test node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				properties: [],
				group: ['transform'],
			} as INodeTypeDescription,
		];

		config = {
			parsedNodeTypes,
			llmSimpleTask: mockLlmSimple,
			llmComplexTask: mockLlmComplex,
			logger: mockLogger,
			checkpointer: mockCheckpointer,
		};

		agent = new WorkflowBuilderAgent(config);
	});

	describe('chat method', () => {
		let mockPayload: ChatPayload;

		beforeEach(() => {
			mockPayload = {
				message: 'Create a workflow',
				workflowContext: {
					currentWorkflow: { id: 'workflow-123' },
				},
			};
		});

		it('should throw ValidationError when message exceeds maximum length', async () => {
			const longMessage = 'x'.repeat(MAX_AI_BUILDER_PROMPT_LENGTH + 1);
			const payload: ChatPayload = {
				message: longMessage,
			};

			await expect(async () => {
				const generator = agent.chat(payload);
				await generator.next();
			}).rejects.toThrow(ValidationError);

			expect(mockLogger.warn).toHaveBeenCalledWith('Message exceeds maximum length', {
				messageLength: longMessage.length,
				maxLength: MAX_AI_BUILDER_PROMPT_LENGTH,
			});
		});

		it('should handle valid message length', async () => {
			const validMessage = 'Create a simple workflow';
			const payload: ChatPayload = {
				message: validMessage,
			};

			// Mock the stream processing to return a proper StreamOutput
			const mockStreamOutput: StreamOutput = {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: 'Processing...',
					},
				],
			};
			const mockAsyncGenerator = (async function* () {
				yield mockStreamOutput;
			})();

			mockCreateStreamProcessor.mockReturnValue(mockAsyncGenerator);

			// Mock the LLM to return a simple response
			(mockLlmSimple.invoke as jest.Mock).mockResolvedValue({
				content: 'Mocked response',
				tool_calls: [],
			});

			const generator = agent.chat(payload);
			const result = await generator.next();

			expect(result.value).toEqual(mockStreamOutput);
		});

		it('should handle GraphRecursionError', async () => {
			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw new GraphRecursionError('Recursion limit exceeded');
				})();
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(ApplicationError);
		});

		it('should handle invalid request errors', async () => {
			const invalidRequestError = Object.assign(new Error('Request failed'), {
				error: {
					error: {
						type: 'invalid_request_error',
						message: 'Invalid API request',
					},
				},
			});

			(mockLlmSimple.invoke as jest.Mock).mockRejectedValue(invalidRequestError);

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(ApplicationError);
		});

		it('should rethrow unknown errors', async () => {
			const unknownError = new Error('Unknown error');

			// Mock createStreamProcessor to throw an unknown error (not GraphRecursionError or abort)
			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw unknownError;
				})();
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(unknownError);
		});
	});

	describe('shouldModifyState', () => {
		const autoCompactThresholdTokens = 10000;

		const createMockState = (
			messageContent: string,
			workflowName?: string,
			messageCount: number = 1,
			nodesCount: number = 0,
		): typeof WorkflowState.State => {
			const messages = [];
			for (let i = 0; i < messageCount; i++) {
				messages.push(
					new HumanMessage({ content: i === messageCount - 1 ? messageContent : `Message ${i}` }),
				);
			}

			const nodes = Array.from({ length: nodesCount }, (_, i) => ({
				id: `node-${i}`,
				name: `Node ${i}`,
				type: 'n8n-nodes-base.testNode',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			}));

			return {
				messages,
				workflowJSON: { nodes: [], connections: {}, name: '' },
				workflowOperations: [],
				workflowContext: {
					currentWorkflow: {
						name: workflowName,
						nodes,
					},
				},
				workflowValidation: null,
				previousSummary: 'EMPTY',
			};
		};

		describe('command handling', () => {
			it('should return "compact_messages" for /compact command', () => {
				const state = createMockState('/compact');
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('compact_messages');
			});

			it('should return "delete_messages" for /clear command', () => {
				const state = createMockState('/clear');
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('delete_messages');
			});
		});

		describe('workflow name generation', () => {
			it('should return "create_workflow_name" when workflow name is undefined and empty workflow', () => {
				const state = createMockState('Create a workflow', undefined, 1, 0);
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('create_workflow_name');
			});

			it('should return "create_workflow_name" when workflow name is "My workflow" and empty workflow', () => {
				const state = createMockState('Create a workflow', 'My workflow', 1, 0);
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('create_workflow_name');
			});

			it('should return "create_workflow_name" when workflow name is "My workflow 1" and empty workflow', () => {
				const state = createMockState('Create a workflow', 'My workflow 1', 1, 0);
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('create_workflow_name');
			});

			it('should return "create_workflow_name" when workflow name is "My workflow 123" and empty workflow', () => {
				const state = createMockState('Create a workflow', 'My workflow 123', 1, 0);
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('create_workflow_name');
			});

			it('should return "agent" when workflow name is a custom name', () => {
				const state = createMockState('Create a workflow', 'Custom Workflow Name', 1, 0);
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('agent');
			});

			it('should return "agent" when workflow name is "My workflow edited"', () => {
				const state = createMockState('Create a workflow', 'My workflow edited', 1, 0);
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('agent');
			});

			it('should return "agent" when workflow has default name but multiple messages exist', () => {
				const state = createMockState('Continue workflow', 'My workflow', 2, 0);
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('agent');
			});

			it('should return "agent" when workflow has default name but workflow has nodes', () => {
				const state = createMockState('Create a workflow', 'My workflow', 1, 3);
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('agent');
			});

			it('should return "agent" when workflow name is undefined but workflow has nodes', () => {
				const state = createMockState('Create a workflow', undefined, 1, 2);
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('agent');
			});
		});

		describe('auto-compact handling', () => {
			it('should return "agent" when below threshold', () => {
				const state = createMockState('Short message', 'Custom Name', 1);
				expect(shouldModifyState(state, autoCompactThresholdTokens)).toBe('agent');
			});
		});
	});
});
