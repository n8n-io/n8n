/* eslint-disable @typescript-eslint/require-await */
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { MemorySaver } from '@langchain/langgraph';
import { GraphRecursionError } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';
import { ApplicationError, OperationalError } from 'n8n-workflow';

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
import { createStreamProcessor } from '@/utils/stream-processor';
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

	const mockCreateStreamProcessor = createStreamProcessor as jest.MockedFunction<
		typeof createStreamProcessor
	>;

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
			(mockLlm.invoke as jest.Mock).mockResolvedValue({
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

		it('should handle 401 expired token error from LangChain MODEL_AUTHENTICATION', async () => {
			// This matches the actual error structure from LangChain when the AI assistant proxy token expires
			const expiredTokenError = Object.assign(new Error('Expired token'), {
				status: 401,
				lc_error_code: 'MODEL_AUTHENTICATION',
			});

			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw expiredTokenError;
				})();
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(ApplicationError);
		});

		it('should not treat generic 401 errors as expired token errors', async () => {
			// A generic 401 without lc_error_code should be rethrown as-is, not converted to ApplicationError
			const generic401Error = Object.assign(new Error('Unauthorized'), { status: 401 });

			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw generic401Error;
				})();
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(generic401Error);
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

			// Mock the stream processor to throw the invalid request error
			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw invalidRequestError;
				})();
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(ValidationError);
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

		it('should wrap 429 quota errors in OperationalError', async () => {
			const quotaError = Object.assign(
				new Error('You exceeded your current quota, please check your plan and billing details.'),
				{ status: 429 },
			);

			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw quotaError;
				})();
			});

			await expect(async () => {
				const generator = agent.chat(mockPayload);
				await generator.next();
			}).rejects.toThrow(OperationalError);
		});

		it('should set level to warning on OperationalError from 429 quota error', async () => {
			const quotaError = Object.assign(new Error('You exceeded your current quota'), {
				status: 429,
			});

			mockCreateStreamProcessor.mockImplementation(() => {
				// eslint-disable-next-line require-yield
				return (async function* () {
					throw quotaError;
				})();
			});

			let thrownError: unknown;
			try {
				const generator = agent.chat(mockPayload);
				await generator.next();
				fail('Expected an error to be thrown');
			} catch (error) {
				thrownError = error;
			}
			expect(thrownError).toBeInstanceOf(OperationalError);
			expect((thrownError as OperationalError).level).toBe('warning');
		});
	});

	describe('hybrid plan+codeBuilder routing', () => {
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

		it('should route to multi-agent for initial plan request when codeBuilder+planMode enabled', async () => {
			const payload: ChatPayload = {
				id: '123',
				message: 'Create a weather alert workflow',
				featureFlags: { codeBuilder: true, planMode: true },
				mode: 'plan',
			};

			const mockStreamOutput: StreamOutput = {
				messages: [{ role: 'assistant', type: 'message', text: 'Planning...' }],
			};
			mockCreateStreamProcessor.mockReturnValue(
				(async function* () {
					yield mockStreamOutput;
				})(),
			);

			const generator = agent.chat(payload);
			const result = await generator.next();

			expect(result.value).toEqual(mockStreamOutput);
			// Multi-agent path uses createStreamProcessor; code builder does not
			expect(mockCreateStreamProcessor).toHaveBeenCalled();
			expect(MockedCodeWorkflowBuilder).not.toHaveBeenCalled();
		});

		it('should route to CodeWorkflowBuilder with plan on plan approval', async () => {
			const payload: ChatPayload = {
				id: '123',
				message: 'Create a weather alert workflow',
				featureFlags: { codeBuilder: true, planMode: true },
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
			// Should NOT have used multi-agent stream processor
			expect(mockCreateStreamProcessor).not.toHaveBeenCalled();
		});

		it('should route to multi-agent on plan modification', async () => {
			const payload: ChatPayload = {
				id: '123',
				message: 'Create a weather alert workflow',
				featureFlags: { codeBuilder: true, planMode: true },
				resumeData: { action: 'modify', feedback: 'Add error handling' },
				resumeInterrupt: mockPlanInterrupt,
			};

			const mockStreamOutput: StreamOutput = {
				messages: [{ role: 'assistant', type: 'message', text: 'Re-planning...' }],
			};
			mockCreateStreamProcessor.mockReturnValue(
				(async function* () {
					yield mockStreamOutput;
				})(),
			);

			const generator = agent.chat(payload);
			const result = await generator.next();

			expect(result.value).toEqual(mockStreamOutput);
			expect(mockCreateStreamProcessor).toHaveBeenCalled();
			expect(MockedCodeWorkflowBuilder).not.toHaveBeenCalled();
		});

		it('should route to multi-agent on plan rejection', async () => {
			const payload: ChatPayload = {
				id: '123',
				message: 'Create a weather alert workflow',
				featureFlags: { codeBuilder: true, planMode: true },
				resumeData: { action: 'reject' },
				resumeInterrupt: mockPlanInterrupt,
			};

			const mockStreamOutput: StreamOutput = {
				messages: [{ role: 'assistant', type: 'message', text: 'OK, cancelled.' }],
			};
			mockCreateStreamProcessor.mockReturnValue(
				(async function* () {
					yield mockStreamOutput;
				})(),
			);

			const generator = agent.chat(payload);
			const result = await generator.next();

			expect(result.value).toEqual(mockStreamOutput);
			expect(mockCreateStreamProcessor).toHaveBeenCalled();
			expect(MockedCodeWorkflowBuilder).not.toHaveBeenCalled();
		});

		it('should fall back to CodeWorkflowBuilder when no assistantHandler provided', async () => {
			const payload: ChatPayload = {
				id: '123',
				message: 'Create a simple workflow',
				featureFlags: { codeBuilder: true },
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
		const originalMergeAskBuild = process.env.N8N_ENV_FEAT_MERGE_ASK_BUILD;

		beforeEach(() => {
			jest.clearAllMocks();
			process.env.N8N_ENV_FEAT_MERGE_ASK_BUILD = 'true';

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

		afterEach(() => {
			if (originalMergeAskBuild !== undefined) {
				process.env.N8N_ENV_FEAT_MERGE_ASK_BUILD = originalMergeAskBuild;
			} else {
				delete process.env.N8N_ENV_FEAT_MERGE_ASK_BUILD;
			}
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
				featureFlags: { codeBuilder: true },
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
				featureFlags: { codeBuilder: true },
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
				featureFlags: { codeBuilder: true },
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
				featureFlags: { codeBuilder: true },
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
				featureFlags: { codeBuilder: true },
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
				featureFlags: { codeBuilder: true },
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
				featureFlags: { codeBuilder: true },
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
				featureFlags: { codeBuilder: true },
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
				featureFlags: { codeBuilder: true },
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
				featureFlags: { codeBuilder: true },
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
				featureFlags: { codeBuilder: true },
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
