import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { mock } from 'jest-mock-extended';
import { Client as TracingClient } from 'langsmith';
import type { IUser, INodeTypeDescription } from 'n8n-workflow';

import { AiWorkflowBuilderService } from '@/ai-workflow-builder-agent.service';
import { LLMServiceError } from '@/errors';
import { anthropicClaudeSonnet45 } from '@/llm-config';
import { SessionManagerService } from '@/session-manager.service';
import { formatMessages } from '@/utils/stream-processor';
import { WorkflowBuilderAgent, type ChatPayload } from '@/workflow-builder-agent';

// Types for mock
type Messages = BaseMessage[] | BaseMessage;
type StateDefinition = Record<string, unknown>;

// Mock dependencies
jest.mock('@langchain/anthropic');
jest.mock('@langchain/langgraph', () => {
	const mockAnnotation = Object.assign(
		jest.fn(<T>(config: T) => config),
		{
			Root: jest.fn(<S extends StateDefinition>(config: S) => config),
		},
	);
	return {
		MemorySaver: jest.fn(),
		Annotation: mockAnnotation,
		messagesStateReducer: jest.fn((messages: Messages, newMessages: Messages): BaseMessage[] =>
			Array.isArray(messages) && Array.isArray(newMessages) ? [...messages, ...newMessages] : [],
		),
	};
});
jest.mock('langsmith');
jest.mock('@/workflow-builder-agent');
jest.mock('@/session-manager.service');
jest.mock('@/llm-config', () => ({
	anthropicClaudeSonnet45: jest.fn(),
}));
jest.mock('@/utils/stream-processor', () => ({
	formatMessages: jest.fn(),
}));

const MockedChatAnthropic = ChatAnthropic as jest.MockedClass<typeof ChatAnthropic>;
const MockedMemorySaver = MemorySaver as jest.MockedClass<typeof MemorySaver>;
const MockedTracingClient = TracingClient as jest.MockedClass<typeof TracingClient>;
const MockedWorkflowBuilderAgent = WorkflowBuilderAgent as jest.MockedClass<
	typeof WorkflowBuilderAgent
>;
const MockedSessionManagerService = SessionManagerService as jest.MockedClass<
	typeof SessionManagerService
>;

const anthropicClaudeSonnet45Mock = anthropicClaudeSonnet45 as jest.MockedFunction<
	typeof anthropicClaudeSonnet45
>;
const formatMessagesMock = formatMessages as jest.MockedFunction<typeof formatMessages>;

describe('AiWorkflowBuilderService', () => {
	let service: AiWorkflowBuilderService;
	let mockClient: AiAssistantClient;
	let mockLogger: Logger;
	let mockUser: IUser;
	let mockChatAnthropic: ChatAnthropic;
	let mockTracingClient: TracingClient;
	let mockMemorySaver: MemorySaver;
	let mockSessionManager: SessionManagerService;
	let mockOnCreditsUpdated: jest.Mock;

	const mockNodeTypeDescriptions: INodeTypeDescription[] = [
		{
			name: 'TestNode',
			displayName: 'Test Node',
			description: 'A test node',
			version: 1,
			defaults: {},
			inputs: [],
			outputs: [],
			properties: [
				{
					displayName: 'Test Property',
					name: 'testProperty',
					type: 'string',
					default: '',
				},
			],
			group: ['transform'],
		},
		{
			name: 'HiddenNode',
			displayName: 'Hidden Node',
			description: 'A hidden node',
			version: 1,
			defaults: {},
			inputs: [],
			outputs: [],
			properties: [],
			group: ['transform'],
			hidden: true,
		},
		{
			name: 'n8n-nodes-base.dataTable',
			displayName: 'Data Table',
			description: 'Data table node',
			version: 1,
			defaults: {},
			inputs: [],
			outputs: [],
			properties: [],
			group: ['transform'],
			hidden: true,
		},
		{
			name: '@n8n/n8n-nodes-langchain.toolVectorStore',
			displayName: 'Tool Vector Store',
			description: 'An ignored tool node',
			version: 1,
			defaults: {},
			inputs: [],
			outputs: [],
			properties: [],
			group: ['transform'],
		},
		{
			name: 'TestNodeTool',
			displayName: 'Test Tool Node',
			description: 'Test tool node description',
			version: 1,
			defaults: {},
			inputs: [],
			outputs: [],
			properties: [
				{
					displayName: 'Test Tool Property',
					name: 'testToolProperty',
					type: 'string',
					default: '',
				},
			],
			group: ['transform'],
		},
	];

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Mock AI assistant client
		mockClient = mock<AiAssistantClient>();
		(mockClient.getBuilderApiProxyToken as jest.Mock).mockResolvedValue({
			tokenType: 'Bearer',
			accessToken: 'test-access-token',
		});
		(mockClient.getApiProxyBaseUrl as jest.Mock).mockReturnValue('https://api.example.com');
		(mockClient.markBuilderSuccess as jest.Mock).mockResolvedValue({
			creditsQuota: 10,
			creditsClaimed: 1,
		});

		// Mock logger
		mockLogger = mock<Logger>();

		// Mock user
		mockUser = mock<IUser>();
		mockUser.id = 'test-user-id';

		// Mock ChatAnthropic
		mockChatAnthropic = mock<ChatAnthropic>();
		MockedChatAnthropic.mockImplementation(() => mockChatAnthropic);

		// Mock TracingClient
		mockTracingClient = mock<TracingClient>();
		MockedTracingClient.mockImplementation(() => mockTracingClient);

		// Mock MemorySaver
		mockMemorySaver = mock<MemorySaver>();
		MockedMemorySaver.mockImplementation(() => mockMemorySaver);

		// Mock SessionManagerService
		mockSessionManager = mock<SessionManagerService>();
		(mockSessionManager.getCheckpointer as jest.Mock).mockReturnValue(mockMemorySaver);
		MockedSessionManagerService.mockImplementation(() => mockSessionManager);

		// Mock WorkflowBuilderAgent - capture config and call onGenerationSuccess
		MockedWorkflowBuilderAgent.mockImplementation((config) => {
			const mockAgent = mock<WorkflowBuilderAgent>();
			(mockAgent.chat as jest.Mock).mockImplementation(async function* () {
				yield { messages: [{ role: 'assistant', type: 'message', text: 'Test response' }] };
				// Simulate the agent calling onGenerationSuccess after successful stream
				if (config.onGenerationSuccess) {
					await config.onGenerationSuccess();
				}
			});
			return mockAgent;
		});

		anthropicClaudeSonnet45Mock.mockResolvedValue(mockChatAnthropic);

		// Mock onCreditsUpdated callback
		mockOnCreditsUpdated = jest.fn();

		// Create service instance
		service = new AiWorkflowBuilderService(
			mockNodeTypeDescriptions,
			mockClient,
			mockLogger,
			'test-instance-id',
			'https://n8n.example.com',
			'1.0.0',
			mockOnCreditsUpdated,
		);
	});

	describe('constructor', () => {
		it('should initialize with provided dependencies', () => {
			const testService = new AiWorkflowBuilderService(
				mockNodeTypeDescriptions,
				mockClient,
				mockLogger,
				'test-instance-id',
				'https://test.com',
				'1.0.0',
				mockOnCreditsUpdated,
			);

			expect(testService).toBeInstanceOf(AiWorkflowBuilderService);
			expect(MockedSessionManagerService).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ name: 'TestNode' })]),
				mockLogger,
			);
		});

		it('should initialize without optional dependencies', () => {
			const testService = new AiWorkflowBuilderService(mockNodeTypeDescriptions);

			expect(testService).toBeInstanceOf(AiWorkflowBuilderService);
			expect(MockedSessionManagerService).toHaveBeenCalledWith(expect.any(Array), undefined);
		});

		it('should filter out ignored types and hidden nodes except the data table', () => {
			MockedSessionManagerService.mockClear();

			new AiWorkflowBuilderService(
				mockNodeTypeDescriptions,
				mockClient,
				mockLogger,
				'test-instance-id',
				'https://test.com',
				'1.0.0',
				mockOnCreditsUpdated,
			);

			expect(MockedSessionManagerService).toHaveBeenCalledTimes(1);
			const filteredNodeTypes = MockedSessionManagerService.mock.calls[0][0];

			expect(filteredNodeTypes.find((node) => node.name === 'HiddenNode')).toBeUndefined();
			expect(
				filteredNodeTypes.find((node) => node.name === '@n8n/n8n-nodes-langchain.toolVectorStore'),
			).toBeUndefined();
			expect(
				filteredNodeTypes.find((node) => node.name === 'n8n-nodes-base.dataTable'),
			).toMatchObject({ name: 'n8n-nodes-base.dataTable' });
		});

		it('should merge tool node descriptions with their base node types', () => {
			MockedSessionManagerService.mockClear();

			new AiWorkflowBuilderService(
				mockNodeTypeDescriptions,
				mockClient,
				mockLogger,
				'test-instance-id',
				'https://test.com',
				'1.0.0',
				mockOnCreditsUpdated,
			);

			expect(MockedSessionManagerService).toHaveBeenCalledTimes(1);
			const filteredNodeTypes = MockedSessionManagerService.mock.calls[0][0];

			const testToolNode = filteredNodeTypes.find((node) => node.name === 'TestNodeTool');
			expect(testToolNode).toBeDefined();
			expect(testToolNode?.description).toBe('Test tool node description');
			expect(testToolNode?.displayName).toBe('Test Tool Node');
			expect(testToolNode?.properties).toEqual([
				{
					displayName: 'Test Tool Property',
					name: 'testToolProperty',
					type: 'string',
					default: '',
				},
			]);
		});
	});

	describe('chat', () => {
		let mockPayload: ChatPayload;

		beforeEach(() => {
			mockPayload = {
				id: '12345',
				message: 'Create a simple workflow',
				workflowContext: {
					currentWorkflow: { id: 'test-workflow' },
				},
			};
		});

		it('should yield results from agent chat', async () => {
			const generator = service.chat(mockPayload, mockUser);
			const result = await generator.next();

			expect(result.value).toEqual({
				messages: [{ role: 'assistant', type: 'message', text: 'Test response' }],
			});
			expect(result.done).toBe(false);
		});

		it('should pass abort signal to agent', async () => {
			const abortController = new AbortController();
			const generator = service.chat(mockPayload, mockUser, abortController.signal);

			await generator.next();

			// Verify that the agent's chat method was called with the abort signal
			const mockAgentInstance = MockedWorkflowBuilderAgent.mock.results[0]
				.value as WorkflowBuilderAgent;
			expect(mockAgentInstance.chat).toHaveBeenCalledWith(
				mockPayload,
				'test-user-id',
				abortController.signal,
			);
		});

		it('should create WorkflowBuilderAgent with correct configuration when using client', async () => {
			const generator = service.chat(mockPayload, mockUser);
			await generator.next();

			// Verify WorkflowBuilderAgent was called
			expect(MockedWorkflowBuilderAgent).toHaveBeenCalled();

			const config = MockedWorkflowBuilderAgent.mock.calls[0][0];

			// Verify key configuration properties
			expect(config).toHaveProperty('parsedNodeTypes');
			expect(config).toHaveProperty('instanceUrl', 'https://n8n.example.com');
			expect(config).toHaveProperty('tracer');
			expect(config).toHaveProperty('checkpointer', mockMemorySaver);
			expect(config.parsedNodeTypes).toBeInstanceOf(Array);
			// Verify checkpointer comes from SessionManagerService
			expect(mockSessionManager.getCheckpointer).toHaveBeenCalled();
		});

		it('should create WorkflowBuilderAgent without tracer when no client', async () => {
			const serviceWithoutClient = new AiWorkflowBuilderService(
				mockNodeTypeDescriptions,
				undefined,
				mockLogger,
			);

			const generator = serviceWithoutClient.chat(mockPayload, mockUser);
			await generator.next();

			// Verify WorkflowBuilderAgent was called
			expect(MockedWorkflowBuilderAgent).toHaveBeenCalled();

			const config =
				MockedWorkflowBuilderAgent.mock.calls[MockedWorkflowBuilderAgent.mock.calls.length - 1][0];

			// Verify key configuration properties
			expect(config).toHaveProperty('parsedNodeTypes');
			expect(config).toHaveProperty('instanceUrl', undefined);
			expect(config).toHaveProperty('tracer', undefined);
			expect(config).toHaveProperty('checkpointer');
			expect(config.parsedNodeTypes).toBeInstanceOf(Array);
		});

		it('should throw LLMServiceError when model setup fails', async () => {
			const testError = new Error('Model setup failed');
			anthropicClaudeSonnet45Mock.mockRejectedValue(testError);

			const generator = service.chat(mockPayload, mockUser);

			await expect(generator.next()).rejects.toThrow(LLMServiceError);
		});

		it('should include error details in LLMServiceError', async () => {
			const testError = new Error('Specific error message');
			anthropicClaudeSonnet45Mock.mockRejectedValue(testError);

			const generator = service.chat(mockPayload, mockUser);

			try {
				await generator.next();
			} catch (error) {
				expect(error).toBeInstanceOf(LLMServiceError);
				expect((error as LLMServiceError).message).toContain('Specific error message');
				expect((error as LLMServiceError).tags).toMatchObject({
					hasClient: true,
					hasUser: true,
				});
			}
		});

		it('should use environment variables when no client provided', async () => {
			const serviceWithoutClient = new AiWorkflowBuilderService(mockNodeTypeDescriptions);
			process.env.N8N_AI_ANTHROPIC_KEY = 'test-env-key';

			const generator = serviceWithoutClient.chat(mockPayload, mockUser);
			await generator.next();

			expect(anthropicClaudeSonnet45Mock).toHaveBeenCalledWith({
				baseUrl: undefined,
				apiKey: 'test-env-key',
				headers: {
					'anthropic-beta': 'prompt-caching-2024-07-31',
				},
			});

			delete process.env.N8N_AI_ANTHROPIC_KEY;
		});

		it('should call markBuilderSuccess after stream completes', async () => {
			const generator = service.chat(mockPayload, mockUser);
			// Drain the generator to complete the stream
			for await (const _ of generator) {
				// consume all outputs
			}

			expect(mockClient.markBuilderSuccess).toHaveBeenCalledWith(mockUser, {
				Authorization: 'Bearer test-access-token',
			});
		});

		it('should call onCreditsUpdated callback after markBuilderSuccess', async () => {
			const generator = service.chat(mockPayload, mockUser);
			// Drain the generator to complete the stream
			for await (const _ of generator) {
				// consume all outputs
			}

			// Verify callback was called with correct parameters
			expect(mockOnCreditsUpdated).toHaveBeenCalledWith('test-user-id', 10, 1);
		});
	});

	describe('getSessions', () => {
		beforeEach(() => {
			formatMessagesMock.mockReturnValue([
				{ role: 'user', type: 'message', text: 'Hello' },
				{ role: 'assistant', type: 'message', text: 'Hi there!' },
			]);

			// Reset mocks for each test
			(mockMemorySaver.getTuple as jest.Mock).mockReset();
			(mockSessionManager.getSessions as jest.Mock).mockReset();
		});

		it('should return empty sessions when no workflowId provided', async () => {
			(mockSessionManager.getSessions as jest.Mock).mockResolvedValue({ sessions: [] });

			const result = await service.getSessions(undefined, mockUser);

			expect(result.sessions).toEqual([]);
			expect(mockSessionManager.getSessions).toHaveBeenCalledWith(undefined, 'test-user-id');
		});

		it('should return session when workflowId exists', async () => {
			const workflowId = 'test-workflow';
			const mockSession = {
				sessionId: 'workflow-test-workflow-user-test-user-id',
				messages: [
					{ role: 'user', type: 'message', text: 'Hello' },
					{ role: 'assistant', type: 'message', text: 'Hi there!' },
				],
				lastUpdated: '2023-12-01T12:00:00Z',
			};

			// Mock SessionManagerService to return the session
			(mockSessionManager.getSessions as jest.Mock).mockResolvedValue({
				sessions: [mockSession],
			});

			const result = await service.getSessions(workflowId, mockUser);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0]).toMatchObject({
				sessionId: 'workflow-test-workflow-user-test-user-id',
				lastUpdated: '2023-12-01T12:00:00Z',
			});
			expect(result.sessions[0].messages).toHaveLength(2);
			expect(mockSessionManager.getSessions).toHaveBeenCalledWith(workflowId, 'test-user-id');
		});

		it('should handle missing checkpoint gracefully', async () => {
			const workflowId = 'non-existent-workflow';

			// Mock SessionManagerService to return empty sessions
			(mockSessionManager.getSessions as jest.Mock).mockResolvedValue({ sessions: [] });

			const result = await service.getSessions(workflowId, mockUser);

			expect(result.sessions).toEqual([]);
			expect(mockSessionManager.getSessions).toHaveBeenCalledWith(workflowId, 'test-user-id');
		});

		it('should handle checkpoint without messages', async () => {
			const workflowId = 'test-workflow';
			const mockSession = {
				sessionId: 'workflow-test-workflow-user-test-user-id',
				messages: [],
				lastUpdated: '2023-12-01T12:00:00Z',
			};

			// Mock SessionManagerService to return session with empty messages
			(mockSessionManager.getSessions as jest.Mock).mockResolvedValue({
				sessions: [mockSession],
			});

			const result = await service.getSessions(workflowId, mockUser);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0].messages).toEqual([]);
			expect(mockSessionManager.getSessions).toHaveBeenCalledWith(workflowId, 'test-user-id');
		});

		it('should handle checkpoint with null messages', async () => {
			const workflowId = 'test-workflow';
			const mockSession = {
				sessionId: 'workflow-test-workflow-user-test-user-id',
				messages: [],
				lastUpdated: '2023-12-01T12:00:00Z',
			};

			// Mock SessionManagerService to return session with empty messages
			(mockSessionManager.getSessions as jest.Mock).mockResolvedValue({
				sessions: [mockSession],
			});

			const result = await service.getSessions(workflowId, mockUser);

			expect(result.sessions).toHaveLength(1);
			expect(result.sessions[0].messages).toEqual([]);
			expect(mockSessionManager.getSessions).toHaveBeenCalledWith(workflowId, 'test-user-id');
		});

		it('should work without user', async () => {
			const workflowId = 'test-workflow';

			// Mock SessionManagerService to return empty sessions
			(mockSessionManager.getSessions as jest.Mock).mockResolvedValue({ sessions: [] });

			const result = await service.getSessions(workflowId);

			expect(result.sessions).toEqual([]);
			expect(mockSessionManager.getSessions).toHaveBeenCalledWith(workflowId, undefined);
		});
	});

	describe('integration tests', () => {
		it('should handle complete workflow from chat to session retrieval', async () => {
			const workflowId = 'integration-test-workflow';
			const mockPayload: ChatPayload = {
				id: '545623',
				message: 'Create a workflow with HTTP request',
				workflowContext: {
					currentWorkflow: { id: workflowId },
				},
			};

			// First, simulate a chat session
			const generator = service.chat(mockPayload, mockUser);
			await generator.next();

			// Mock the session to simulate that it was saved
			const mockSession = {
				sessionId: 'workflow-integration-test-workflow-user-test-user-id',
				messages: [
					{ role: 'user', content: 'Create a workflow with HTTP request' },
					{
						role: 'assistant',
						content: 'I will create a workflow with an HTTP request node for you.',
					},
				],
				lastUpdated: new Date().toISOString(),
			};

			// Mock SessionManagerService to return the session
			(mockSessionManager.getSessions as jest.Mock).mockResolvedValue({
				sessions: [mockSession],
			});

			// Then retrieve the session
			const sessions = await service.getSessions(workflowId, mockUser);

			expect(sessions.sessions).toHaveLength(1);
			expect(sessions.sessions[0].sessionId).toBe(
				'workflow-integration-test-workflow-user-test-user-id',
			);
			expect(mockSessionManager.getSessions).toHaveBeenCalledWith(workflowId, 'test-user-id');
		});
	});

	describe('getBuilderInstanceCredits', () => {
		it('should return builder instance credits when client is available', async () => {
			const expectedCredits = {
				creditsQuota: 100,
				creditsClaimed: 25,
			};

			(mockClient.getBuilderInstanceCredits as jest.Mock).mockResolvedValue(expectedCredits);

			const result = await service.getBuilderInstanceCredits(mockUser);

			expect(result).toEqual(expectedCredits);
			expect(mockClient.getBuilderInstanceCredits).toHaveBeenCalledWith(mockUser);
		});

		it('should return default values when client is not configured', async () => {
			const serviceWithoutClient = new AiWorkflowBuilderService(mockNodeTypeDescriptions);

			const result = await serviceWithoutClient.getBuilderInstanceCredits(mockUser);

			expect(result).toEqual({
				creditsQuota: -1,
				creditsClaimed: 0,
			});
		});
	});
});
