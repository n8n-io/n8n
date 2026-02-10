/**
 * Integration tests for CodeWorkflowBuilder.
 * Tests the integration between WorkflowBuilderAgent and CodeWorkflowBuilder.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

// Mock the CodeWorkflowBuilder module
const mockChat = jest.fn();
jest.mock('@/code-builder/code-workflow-builder', () => {
	return {
		CodeWorkflowBuilder: jest.fn().mockImplementation(() => ({
			chat: mockChat,
		})),
	};
});

// Mock tools to avoid complex dependencies
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

jest.mock('@/utils/stream-processor', () => ({
	createStreamProcessor: jest.fn(),
	formatMessages: jest.fn(),
}));

// Mock the multi-agent workflow to avoid needing real LLM instances for the planner agent
jest.mock('@/multi-agent-workflow-subgraphs', () => ({
	createMultiAgentWorkflowWithSubgraphs: jest.fn().mockReturnValue({
		stream: jest.fn(),
		getState: jest.fn(),
		updateState: jest.fn(),
	}),
}));

import { CodeWorkflowBuilder } from '@/code-builder/code-workflow-builder';
import type { StreamOutput } from '@/types/streaming';
import {
	WorkflowBuilderAgent,
	type WorkflowBuilderAgentConfig,
	type ChatPayload,
} from '@/workflow-builder-agent';

describe('CodeWorkflowBuilder Integration', () => {
	let agent: WorkflowBuilderAgent;
	let mockLlm: BaseChatModel;
	let mockLogger: Logger;
	let mockCheckpointer: MemorySaver;
	let parsedNodeTypes: INodeTypeDescription[];
	let config: WorkflowBuilderAgentConfig;

	const mockChatFn = mockChat;

	beforeEach(() => {
		jest.clearAllMocks();

		mockLlm = mock<BaseChatModel>({
			_llmType: jest.fn().mockReturnValue('test-llm'),
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
				name: 'n8n-nodes-base.manualTrigger',
				displayName: 'Manual Trigger',
				description: 'Start workflow manually',
				version: 1.1,
				defaults: { name: 'When clicking Test workflow' },
				inputs: [],
				outputs: ['main'],
				properties: [],
				group: ['trigger'],
			} as INodeTypeDescription,
		];

		config = {
			parsedNodeTypes,
			stageLLMs: {
				supervisor: mockLlm,
				responder: mockLlm,
				discovery: mockLlm,
				builder: mockLlm,
				parameterUpdater: mockLlm,
				planner: mockLlm,
			},
			logger: mockLogger,
			checkpointer: mockCheckpointer,
		};

		agent = new WorkflowBuilderAgent(config);
	});

	describe('routing to CodeWorkflowBuilder', () => {
		it('should route to CodeWorkflowBuilder when codeBuilder feature flag is true', async () => {
			const mockStreamOutput: StreamOutput = {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: 'Generated workflow',
					},
				],
			};

			// Mock the chat method to return an async generator
			mockChatFn.mockImplementation(async function* () {
				yield mockStreamOutput;
			});

			const payload: ChatPayload = {
				id: 'test-123',
				message: 'Create a workflow that sends emails',
				featureFlags: {
					codeBuilder: true,
				},
			};

			const generator = agent.chat(payload, 'user-123');
			const result = await generator.next();

			// Verify CodeWorkflowBuilder was instantiated
			expect(CodeWorkflowBuilder).toHaveBeenCalledWith(
				expect.objectContaining({
					llm: mockLlm,
					nodeTypes: parsedNodeTypes,
					logger: mockLogger,
				}),
			);

			// Verify chat was called with correct arguments
			expect(mockChatFn).toHaveBeenCalledWith(payload, 'user-123', undefined);

			// Verify output was yielded
			expect(result.value).toEqual(mockStreamOutput);
		});

		it('should route to CodeWorkflowBuilder when codeBuilder is explicitly true', async () => {
			const mockStreamOutput: StreamOutput = {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: 'Generated workflow',
					},
				],
			};

			mockChatFn.mockImplementation(async function* () {
				yield mockStreamOutput;
			});

			const payload: ChatPayload = {
				id: 'test-456',
				message: 'Create a chatbot workflow',
				featureFlags: {
					codeBuilder: true,
				},
			};

			const generator = agent.chat(payload, 'user-456');
			await generator.next();

			expect(CodeWorkflowBuilder).toHaveBeenCalled();
			expect(mockChatFn).toHaveBeenCalledWith(payload, 'user-456', undefined);
		});

		it('should pass abort signal to CodeWorkflowBuilder', async () => {
			const controller = new AbortController();

			mockChatFn.mockImplementation(async function* () {
				yield {
					messages: [{ role: 'assistant', type: 'message', text: 'Processing...' }],
				};
			});

			const payload: ChatPayload = {
				id: 'test-789',
				message: 'Build a workflow',
				featureFlags: {
					codeBuilder: true,
				},
			};

			const generator = agent.chat(payload, 'user-789', controller.signal);
			await generator.next();

			expect(mockChatFn).toHaveBeenCalledWith(payload, 'user-789', controller.signal);
		});

		it('should pass nodeDefinitionDirs to CodeWorkflowBuilder', async () => {
			const configWithDirs: WorkflowBuilderAgentConfig = {
				...config,
				nodeDefinitionDirs: ['/path/to/builtin', '/path/to/community'],
			};
			const agentWithDirs = new WorkflowBuilderAgent(configWithDirs);

			mockChatFn.mockImplementation(async function* () {
				yield {
					messages: [{ role: 'assistant', type: 'message', text: 'Done' }],
				};
			});

			const payload: ChatPayload = {
				id: 'test-types',
				message: 'Create workflow',
				featureFlags: {
					codeBuilder: true,
				},
			};

			const generator = agentWithDirs.chat(payload, 'user-types');
			await generator.next();

			expect(CodeWorkflowBuilder).toHaveBeenCalledWith(
				expect.objectContaining({
					nodeDefinitionDirs: ['/path/to/builtin', '/path/to/community'],
				}),
			);
		});

		it('should yield all stream chunks from CodeWorkflowBuilder', async () => {
			const chunks: StreamOutput[] = [
				{
					messages: [{ role: 'assistant', type: 'message', text: '<final_workflow_plan>\n' }],
				},
				{
					messages: [{ role: 'assistant', type: 'message', text: 'Planning...' }],
				},
				{
					messages: [{ role: 'assistant', type: 'message', text: '</final_workflow_plan>\n' }],
				},
				{
					messages: [{ role: 'assistant', type: 'message', text: 'Generating code...' }],
				},
				{
					messages: [
						{
							role: 'assistant',
							type: 'workflow-updated',
							codeSnippet: JSON.stringify({
								id: 'workflow-1',
								name: 'Test Workflow',
								nodes: [],
								connections: {},
							}),
						},
					],
				},
			];

			mockChatFn.mockImplementation(async function* () {
				for (const chunk of chunks) {
					yield chunk;
				}
			});

			const payload: ChatPayload = {
				id: 'test-stream',
				message: 'Create a workflow',
				featureFlags: {
					codeBuilder: true,
				},
			};

			const generator = agent.chat(payload, 'user-stream');
			const results: StreamOutput[] = [];
			for await (const chunk of generator) {
				results.push(chunk);
			}

			expect(results).toHaveLength(chunks.length);
			expect(results).toEqual(chunks);
		});
	});

	describe('multi-agent system fallback', () => {
		it('should NOT route to CodeWorkflowBuilder when codeBuilder is false', async () => {
			const payload: ChatPayload = {
				id: 'test-multi-agent',
				message: 'Create a workflow',
				featureFlags: {
					codeBuilder: false,
				},
			};

			// For multi-agent system, we need to mock the stream processor
			// since it won't use CodeWorkflowBuilder
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const { createStreamProcessor } = jest.requireMock('@/utils/stream-processor') as {
				createStreamProcessor: jest.Mock;
			};
			createStreamProcessor.mockReturnValue(
				(async function* () {
					yield {
						messages: [{ role: 'assistant', type: 'message', text: 'Multi-agent response' }],
					};
				})(),
			);

			const generator = agent.chat(payload, 'user-multi');
			await generator.next();

			// CodeWorkflowBuilder should NOT be called
			expect(CodeWorkflowBuilder).not.toHaveBeenCalled();
			expect(mockChatFn).not.toHaveBeenCalled();
		});
	});

	describe('context handling', () => {
		it('should pass workflow context to CodeWorkflowBuilder', async () => {
			const currentWorkflow = {
				id: 'existing-workflow',
				name: 'Existing Workflow',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1.1,
						position: [240, 300] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			};

			mockChatFn.mockImplementation(async function* () {
				yield {
					messages: [
						{ role: 'assistant', type: 'message', text: 'Processing existing workflow...' },
					],
				};
			});

			const payload: ChatPayload = {
				id: 'test-context',
				message: 'Add a Slack notification node',
				workflowContext: {
					currentWorkflow,
				},
				featureFlags: {
					codeBuilder: true,
				},
			};

			const generator = agent.chat(payload, 'user-context');
			await generator.next();

			// Verify the payload with workflow context was passed
			expect(mockChatFn).toHaveBeenCalledWith(
				expect.objectContaining({
					workflowContext: expect.objectContaining({
						currentWorkflow: expect.objectContaining({
							id: 'existing-workflow',
						}),
					}),
				}),
				'user-context',
				undefined,
			);
		});
	});

	describe('error handling', () => {
		it('should propagate errors from CodeWorkflowBuilder', async () => {
			// eslint-disable-next-line require-yield
			mockChatFn.mockImplementation(async function* (): AsyncGenerator<StreamOutput> {
				throw new Error('CodeWorkflowBuilder error');
			});

			const payload: ChatPayload = {
				id: 'test-error',
				message: 'Create a workflow',
				featureFlags: {
					codeBuilder: true,
				},
			};

			const generator = agent.chat(payload, 'user-error');

			await expect(async () => {
				for await (const _ of generator) {
					// Consume generator
				}
			}).rejects.toThrow('CodeWorkflowBuilder error');
		});
	});
});
