/* eslint-disable @typescript-eslint/require-await */
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

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

const mockCodeWorkflowBuilderChat = jest.fn();
jest.mock('@/code-builder', () => ({
	CodeWorkflowBuilder: jest.fn().mockImplementation(() => ({
		chat: mockCodeWorkflowBuilderChat,
	})),
}));

const mockTriageAgentRun = jest.fn();
jest.mock('@/code-builder/triage.agent', () => ({
	TriageAgent: jest.fn().mockImplementation(() => ({
		run: mockTriageAgentRun,
	})),
}));

const mockLoadCodeBuilderSession = jest.fn();
const mockSaveCodeBuilderSession = jest.fn();
const mockGenerateCodeBuilderThreadId = jest.fn();
jest.mock('@/code-builder/utils/code-builder-session', () => ({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	loadCodeBuilderSession: (...args: unknown[]) => mockLoadCodeBuilderSession(...args),
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	saveCodeBuilderSession: (...args: unknown[]) => mockSaveCodeBuilderSession(...args),
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	generateCodeBuilderThreadId: (...args: unknown[]) => mockGenerateCodeBuilderThreadId(...args),
}));

const mockRandomUUID = jest.fn();
Object.defineProperty(global, 'crypto', {
	value: {
		randomUUID: mockRandomUUID,
	},
	writable: true,
});

import type { AssistantHandler } from '@/assistant/assistant-handler';
import { CodeWorkflowBuilder } from '@/code-builder';
import { MAX_AI_BUILDER_PROMPT_LENGTH } from '@/constants';
import { ValidationError } from '@/errors';
import type { PlanInterruptValue, PlanOutput } from '@/types/planning';
import type { StreamOutput } from '@/types/streaming';
import {
	WorkflowBuilderAgent,
	type WorkflowBuilderAgentConfig,
	type ChatPayload,
} from '@/workflow-builder-agent';

describe('WorkflowBuilderAgent', () => {
	let agent: WorkflowBuilderAgent;
	let mockLlm: BaseChatModel;
	let mockLogger: Logger;
	let mockCheckpointer: MemorySaver;
	let parsedNodeTypes: INodeTypeDescription[];
	let config: WorkflowBuilderAgentConfig;

	beforeEach(() => {
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
			stageLLMs: {
				builder: mockLlm,
				parameterUpdater: mockLlm,
				planner: mockLlm,
				discovery: mockLlm,
			},
			logger: mockLogger,
			checkpointer: mockCheckpointer,
		};

		agent = new WorkflowBuilderAgent(config);
	});

	describe('chat method', () => {
		let mockPayload: ChatPayload;

		beforeEach(() => {
			mockPayload = {
				id: '12345',
				message: 'Create a workflow',
				workflowContext: {
					currentWorkflow: { id: 'workflow-123' },
				},
			};
		});

		it('should throw ValidationError when message exceeds maximum length', async () => {
			const longMessage = 'x'.repeat(MAX_AI_BUILDER_PROMPT_LENGTH + 1);
			const payload: ChatPayload = {
				id: '12345',
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
				id: '12345',
				message: validMessage,
			};

			const mockStreamOutput: StreamOutput = {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: 'Processing...',
					},
				],
			};

			mockCodeWorkflowBuilderChat.mockImplementation(async function* () {
				yield mockStreamOutput;
			});

			const generator = agent.chat(payload);
			const result = await generator.next();

			expect(result.value).toEqual(mockStreamOutput);
		});

		it('should propagate errors from CodeWorkflowBuilder', async () => {
			const testError = new Error('CodeWorkflowBuilder error');

			mockCodeWorkflowBuilderChat.mockImplementation(async function* () {
				yield* []; // eslint requires yield in generator
				throw testError;
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(testError);
		});
	});

	describe('plan approval routing', () => {
		const MockedCodeWorkflowBuilder = CodeWorkflowBuilder as jest.MockedClass<
			typeof CodeWorkflowBuilder
		>;

		const mockPlan: PlanOutput = {
			summary: 'Fetch weather and send Slack alert',
			trigger: 'Runs every morning at 7 AM',
			steps: [
				{ description: 'Fetch weather forecast', suggestedNodes: ['n8n-nodes-base.httpRequest'] },
				{ description: 'Check if rain is predicted' },
				{ description: 'Send Slack notification', suggestedNodes: ['n8n-nodes-base.slack'] },
			],
		};

		const mockPlanInterrupt: PlanInterruptValue = {
			type: 'plan',
			plan: mockPlan,
		};

		beforeEach(() => {
			jest.clearAllMocks();
			MockedCodeWorkflowBuilder.mockClear();
			mockCodeWorkflowBuilderChat.mockReturnValue(
				(async function* () {
					yield {
						messages: [{ role: 'assistant', type: 'message', text: 'Built workflow' }],
					} as StreamOutput;
				})(),
			);
		});

		it('should route to CodeWorkflowBuilder with plan on plan approval', async () => {
			const payload: ChatPayload = {
				id: '123',
				message: 'Create a weather alert workflow',
				featureFlags: { planMode: true },
				resumeData: { action: 'approve' },
				resumeInterrupt: mockPlanInterrupt,
			};

			const generator = agent.chat(payload);
			for await (const _ of generator) {
				// consume
			}

			// Should have constructed CodeWorkflowBuilder
			expect(MockedCodeWorkflowBuilder).toHaveBeenCalled();
			// Should have passed the plan via the payload
			expect(mockCodeWorkflowBuilderChat).toHaveBeenCalledWith(
				expect.objectContaining({ planOutput: mockPlan }),
				expect.any(String),
				undefined,
			);
		});

		it('should fall back to CodeWorkflowBuilder when no assistantHandler provided', async () => {
			const payload: ChatPayload = {
				id: '123',
				message: 'Create a simple workflow',
				featureFlags: { mergeAskBuild: true },
			};

			const generator = agent.chat(payload);
			for await (const _ of generator) {
				// consume
			}

			expect(MockedCodeWorkflowBuilder).toHaveBeenCalled();
			expect(mockCodeWorkflowBuilderChat).toHaveBeenCalledWith(
				expect.not.objectContaining({ planOutput: expect.anything() }),
				expect.any(String),
				undefined,
			);
		});
	});

	describe('triage agent routing', () => {
		let triageConfig: WorkflowBuilderAgentConfig;

		beforeEach(() => {
			jest.clearAllMocks();

			mockGenerateCodeBuilderThreadId.mockReturnValue('test-thread-id');
			mockLoadCodeBuilderSession.mockResolvedValue({
				conversationEntries: [],
				previousSummary: undefined,
			});
			mockSaveCodeBuilderSession.mockResolvedValue(undefined);

			triageConfig = {
				...config,
				assistantHandler: mock<AssistantHandler>(),
			};
		});

		it('should yield assistant chunks and not call CodeWorkflowBuilder for assistant outcome', async () => {
			const chunk1: StreamOutput = {
				messages: [{ role: 'assistant', type: 'message', text: 'Let me help' }],
			};
			const chunk2: StreamOutput = {
				messages: [{ role: 'assistant', type: 'message', text: 'Here is the answer' }],
			};

			mockTriageAgentRun.mockImplementation(async function* () {
				yield chunk1;
				yield chunk2;
				return { assistantSummary: 'Here is the answer', sdkSessionId: 'sdk-1' };
			});

			const triageAgent = new WorkflowBuilderAgent(triageConfig);
			const payload: ChatPayload = {
				id: '123',
				message: 'How do credentials work?',
				featureFlags: { mergeAskBuild: true },
			};

			const results: StreamOutput[] = [];
			for await (const output of triageAgent.chat(payload, 'user-456')) {
				results.push(output);
			}

			expect(results).toEqual([chunk1, chunk2]);
		});

		it('should yield builder chunks from TriageAgent for build outcome', async () => {
			const builderChunk: StreamOutput = {
				messages: [{ role: 'assistant', type: 'message', text: 'Built workflow' }],
			};

			mockTriageAgentRun.mockImplementation(async function* () {
				yield builderChunk;
				return { buildExecuted: true };
			});

			const triageAgent = new WorkflowBuilderAgent(triageConfig);
			const payload: ChatPayload = {
				id: '123',
				message: 'Build me a Slack notification workflow',
				featureFlags: { mergeAskBuild: true },
			};

			const results: StreamOutput[] = [];
			for await (const output of triageAgent.chat(payload, 'user-456')) {
				results.push(output);
			}

			expect(results).toEqual([builderChunk]);
		});

		it('should yield direct reply chunk for empty outcome', async () => {
			const chunk: StreamOutput = {
				messages: [{ role: 'assistant', type: 'message', text: 'Here is a plan...' }],
			};

			mockTriageAgentRun.mockImplementation(async function* () {
				yield chunk;
				return {};
			});

			const triageAgent = new WorkflowBuilderAgent(triageConfig);
			const payload: ChatPayload = {
				id: '123',
				message: 'What approach should I take?',
				featureFlags: { mergeAskBuild: true },
			};

			const results: StreamOutput[] = [];
			for await (const output of triageAgent.chat(payload, 'user-456')) {
				results.push(output);
			}

			expect(results).toEqual([chunk]);
		});

		it('should pass userId to triage agent run', async () => {
			// eslint-disable-next-line require-yield
			mockTriageAgentRun.mockImplementation(async function* () {
				return {};
			});

			const triageAgent = new WorkflowBuilderAgent(triageConfig);
			const payload: ChatPayload = {
				id: '123',
				message: 'Help me',
				featureFlags: { mergeAskBuild: true },
			};

			for await (const _ of triageAgent.chat(payload, 'user-456')) {
				// consume
			}

			expect(mockTriageAgentRun).toHaveBeenCalledWith(
				expect.objectContaining({ userId: 'user-456' }),
			);
		});

		it('should pass abortSignal to triage agent run', async () => {
			// eslint-disable-next-line require-yield
			mockTriageAgentRun.mockImplementation(async function* () {
				return {};
			});

			const triageAgent = new WorkflowBuilderAgent(triageConfig);
			const payload: ChatPayload = {
				id: '123',
				message: 'Help me',
				featureFlags: { mergeAskBuild: true },
			};

			const controller = new AbortController();

			for await (const _ of triageAgent.chat(payload, 'user-456', controller.signal)) {
				// consume
			}

			expect(mockTriageAgentRun).toHaveBeenCalledWith(
				expect.objectContaining({ abortSignal: controller.signal }),
			);
		});

		it('should load session and pass sdkSessionId + conversationHistory to triage agent', async () => {
			mockLoadCodeBuilderSession.mockResolvedValue({
				conversationEntries: [
					{ type: 'build-request', message: 'previous build' },
					{
						type: 'assistant-exchange',
						userQuery: 'How does this work?',
						assistantSummary: 'It works like this',
					},
				],
				previousSummary: undefined,
				sdkSessionId: 'sdk-prev',
			});

			// eslint-disable-next-line require-yield
			mockTriageAgentRun.mockImplementation(async function* () {
				return { buildExecuted: true };
			});

			const triageAgent = new WorkflowBuilderAgent(triageConfig);
			const payload: ChatPayload = {
				id: '123',
				message: 'Build this',
				featureFlags: { mergeAskBuild: true },
				workflowContext: { currentWorkflow: { id: 'wf-1' } },
			};

			for await (const _ of triageAgent.chat(payload, 'user-456')) {
				// consume
			}

			expect(mockTriageAgentRun).toHaveBeenCalledWith(
				expect.objectContaining({
					sdkSessionId: 'sdk-prev',
					conversationHistory: expect.arrayContaining([
						{ type: 'build-request', message: 'previous build' },
					]),
				}),
			);
		});

		it('should save assistant-exchange entry for assistant outcome', async () => {
			mockTriageAgentRun.mockImplementation(async function* () {
				yield {
					messages: [{ role: 'assistant', type: 'message', text: 'Here is help' }],
				} as StreamOutput;
				return {
					sdkSessionId: 'sdk-new',
					assistantSummary: 'Helped with creds',
				};
			});

			const triageAgent = new WorkflowBuilderAgent(triageConfig);
			const payload: ChatPayload = {
				id: '123',
				message: 'How do credentials work?',
				featureFlags: { mergeAskBuild: true },
				workflowContext: { currentWorkflow: { id: 'wf-1' } },
			};

			for await (const _ of triageAgent.chat(payload, 'user-456')) {
				// consume
			}

			expect(mockSaveCodeBuilderSession).toHaveBeenCalledTimes(1);
			const [, threadId, savedSession] = mockSaveCodeBuilderSession.mock.calls[0] as unknown[];
			expect(threadId).toBe('test-thread-id');
			expect(savedSession).toEqual(
				expect.objectContaining({
					conversationEntries: [
						{
							type: 'assistant-exchange',
							userQuery: 'How do credentials work?',
							assistantSummary: 'Helped with creds',
						},
					],
					sdkSessionId: 'sdk-new',
				}),
			);
		});

		it('should save plan entry for empty outcome (direct reply)', async () => {
			mockTriageAgentRun.mockImplementation(async function* () {
				yield {
					messages: [{ role: 'assistant', type: 'message', text: 'Here is a plan' }],
				} as StreamOutput;
				return {};
			});

			const triageAgent = new WorkflowBuilderAgent(triageConfig);
			const payload: ChatPayload = {
				id: '123',
				message: 'What approach should I take?',
				featureFlags: { mergeAskBuild: true },
				workflowContext: { currentWorkflow: { id: 'wf-1' } },
			};

			for await (const _ of triageAgent.chat(payload, 'user-456')) {
				// consume
			}

			expect(mockSaveCodeBuilderSession).toHaveBeenCalledTimes(1);
			const [, threadId, savedSession] = mockSaveCodeBuilderSession.mock.calls[0] as unknown[];
			expect(threadId).toBe('test-thread-id');
			expect(savedSession).toEqual(
				expect.objectContaining({
					conversationEntries: [
						{
							type: 'plan',
							userQuery: 'What approach should I take?',
							plan: 'Here is a plan',
						},
					],
				}),
			);
		});

		it('should NOT save session for build-only outcome', async () => {
			// eslint-disable-next-line require-yield
			mockTriageAgentRun.mockImplementation(async function* () {
				return { buildExecuted: true };
			});

			const triageAgent = new WorkflowBuilderAgent(triageConfig);
			const payload: ChatPayload = {
				id: '123',
				message: 'Build a workflow',
				featureFlags: { mergeAskBuild: true },
				workflowContext: { currentWorkflow: { id: 'wf-1' } },
			};

			for await (const _ of triageAgent.chat(payload, 'user-456')) {
				// consume
			}

			expect(mockSaveCodeBuilderSession).not.toHaveBeenCalled();
		});

		it('should save assistant-exchange for two-step diagnosis+build outcome', async () => {
			mockTriageAgentRun.mockImplementation(async function* () {
				yield {
					messages: [{ role: 'assistant', type: 'message', text: 'Diagnosing...' }],
				} as StreamOutput;
				return {
					sdkSessionId: 'sdk-diag',
					assistantSummary: 'Missing credentials',
					buildExecuted: true,
				};
			});

			const triageAgent = new WorkflowBuilderAgent(triageConfig);
			const payload: ChatPayload = {
				id: '123',
				message: 'Fix the Google Sheets error',
				featureFlags: { mergeAskBuild: true },
				workflowContext: { currentWorkflow: { id: 'wf-1' } },
			};

			for await (const _ of triageAgent.chat(payload, 'user-456')) {
				// consume
			}

			expect(mockSaveCodeBuilderSession).toHaveBeenCalledTimes(1);
			const [, threadId, savedSession] = mockSaveCodeBuilderSession.mock.calls[0] as unknown[];
			expect(threadId).toBe('test-thread-id');
			expect(savedSession).toEqual(
				expect.objectContaining({
					conversationEntries: [
						{
							type: 'assistant-exchange',
							userQuery: 'Fix the Google Sheets error',
							assistantSummary: 'Missing credentials',
						},
					],
					sdkSessionId: 'sdk-diag',
				}),
			);
		});

		it('should construct TriageAgent with buildWorkflow function', async () => {
			// eslint-disable-next-line require-yield
			mockTriageAgentRun.mockImplementation(async function* () {
				return {};
			});

			const triageAgent = new WorkflowBuilderAgent(triageConfig);
			const payload: ChatPayload = {
				id: '123',
				message: 'Test',
				featureFlags: { mergeAskBuild: true },
			};

			for await (const _ of triageAgent.chat(payload, 'user-456')) {
				// consume
			}

			const mockedCtor = jest.requireMock<{ TriageAgent: jest.Mock }>(
				'@/code-builder/triage.agent',
			).TriageAgent;
			expect(mockedCtor).toHaveBeenCalledWith(
				expect.objectContaining({
					buildWorkflow: expect.any(Function),
				}),
			);
		});
	});
});
