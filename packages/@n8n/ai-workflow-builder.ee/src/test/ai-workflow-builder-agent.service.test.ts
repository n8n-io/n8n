import { ChatAnthropic } from '@langchain/anthropic';
import { MemorySaver } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { mock } from 'jest-mock-extended';
import { Client as TracingClient } from 'langsmith';
import type { IUser, INodeTypes, INodeTypeDescription } from 'n8n-workflow';

import { AiWorkflowBuilderService } from '@/ai-workflow-builder-agent.service';
import { LLMServiceError } from '@/errors';
import { anthropicClaudeSonnet45 } from '@/llm-config';
import { SessionManagerService } from '@/session-manager.service';
import { formatMessages } from '@/utils/stream-processor';
import { WorkflowBuilderAgent, type ChatPayload } from '@/workflow-builder-agent';

// Mock dependencies
jest.mock('@langchain/anthropic');
jest.mock('@langchain/langgraph');
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
	let mockNodeTypes: INodeTypes;
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
			properties: [],
			group: ['transform'],
		} as INodeTypeDescription,
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
		} as INodeTypeDescription,
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
		} as INodeTypeDescription,
	];

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Mock node types
		mockNodeTypes = mock<INodeTypes>();
		(mockNodeTypes.getKnownTypes as jest.Mock).mockReturnValue({
			TestNode: { type: {} },
			HiddenNode: { type: {} },
			'@n8n/n8n-nodes-langchain.toolVectorStore': { type: {} },
		});
		(mockNodeTypes.getByNameAndVersion as jest.Mock).mockImplementation((name: string) => {
			const nodeType = mockNodeTypeDescriptions.find((n) => n.name === name);
			if (nodeType) {
				return { description: nodeType };
			}
			throw new Error(`Node type ${name} not found`);
		});

		// Mock AI assistant client
		mockClient = mock<AiAssistantClient>();
		(mockClient.generateApiProxyCredentials as jest.Mock).mockResolvedValue({
			apiKey: 'test-api-key',
		});
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

		// Mock WorkflowBuilderAgent
		MockedWorkflowBuilderAgent.mockImplementation(() => {
			const mockAgent = mock<WorkflowBuilderAgent>();
			(mockAgent.chat as jest.Mock).mockImplementation(async function* () {
				yield { messages: [{ role: 'assistant', type: 'message', text: 'Test response' }] };
			});
			return mockAgent;
		});

		anthropicClaudeSonnet45Mock.mockResolvedValue(mockChatAnthropic);

		// Mock onCreditsUpdated callback
		mockOnCreditsUpdated = jest.fn();

		// Create service instance
		service = new AiWorkflowBuilderService(
			mockNodeTypes,
			mockClient,
			mockLogger,
			'https://n8n.example.com',
			mockOnCreditsUpdated,
		);
	});

	describe('constructor', () => {
		it('should initialize with provided dependencies', () => {
			const testService = new AiWorkflowBuilderService(
				mockNodeTypes,
				mockClient,
				mockLogger,
				'https://test.com',
				mockOnCreditsUpdated,
			);

			expect(testService).toBeInstanceOf(AiWorkflowBuilderService);
			expect(mockNodeTypes.getKnownTypes).toHaveBeenCalled();
			expect(MockedSessionManagerService).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ name: 'TestNode' })]),
				mockLogger,
			);
		});

		it('should initialize without optional dependencies', () => {
			const testService = new AiWorkflowBuilderService(mockNodeTypes);

			expect(testService).toBeInstanceOf(AiWorkflowBuilderService);
			expect(MockedSessionManagerService).toHaveBeenCalledWith(expect.any(Array), undefined);
		});

		it('should filter out ignored and hidden node types', () => {
			// The service filters ignored types at the filter stage, not at getByNameAndVersion stage
			// Hidden nodes are filtered out after being retrieved in the filter() call
			expect(mockNodeTypes.getKnownTypes).toHaveBeenCalled();
			expect(mockNodeTypes.getByNameAndVersion).toHaveBeenCalledWith('TestNode');
			// Hidden nodes are still retrieved but filtered out later, so this call happens
			expect(mockNodeTypes.getByNameAndVersion).toHaveBeenCalledWith('HiddenNode');
			// Ignored types are filtered out before getByNameAndVersion call
			expect(mockNodeTypes.getByNameAndVersion).not.toHaveBeenCalledWith(
				'@n8n/n8n-nodes-langchain.toolVectorStore',
			);
		});

		it('should handle errors when getting node types', () => {
			(mockNodeTypes.getByNameAndVersion as jest.Mock).mockImplementation(() => {
				throw new Error('Node type error');
			});

			// Should not throw when constructing, but should log error
			const testService = new AiWorkflowBuilderService(mockNodeTypes, mockClient, mockLogger);

			expect(testService).toBeInstanceOf(AiWorkflowBuilderService);
			expect(mockLogger.error).toHaveBeenCalledWith('Error getting node type', expect.any(Object));
		});

		it('should handle tool node merging correctly when calling chat', async () => {
			// Setup node types that include tool nodes
			(mockNodeTypes.getKnownTypes as jest.Mock).mockReturnValue({
				HttpRequestTool: { type: {} },
				HttpRequest: { type: {} },
			});

			const httpRequestToolNode: INodeTypeDescription = {
				name: 'HttpRequestTool',
				displayName: 'HTTP Request Tool',
				description: 'Tool version of HTTP Request',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				properties: [
					{
						name: 'toolProp',
						type: 'string',
						displayName: '',
						default: undefined,
					},
				],
				group: ['transform'],
			};

			const httpRequestNode: INodeTypeDescription = {
				name: 'HttpRequest',
				displayName: 'HTTP Request',
				description: 'Regular HTTP Request node',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				properties: [
					{
						name: 'regularProp',
						type: 'string',
						displayName: '',
						default: undefined,
					},
				],
				group: ['transform'],
			};

			(mockNodeTypes.getByNameAndVersion as jest.Mock).mockImplementation((name: string) => {
				if (name === 'HttpRequestTool') return { description: httpRequestToolNode };
				if (name === 'HttpRequest') return { description: httpRequestNode };
				throw new Error(`Node type ${name} not found`);
			});

			// Get the mocked WorkflowBuilderAgent constructor
			const MockedWorkflowBuilderAgent = WorkflowBuilderAgent as jest.MockedClass<
				typeof WorkflowBuilderAgent
			>;

			// Clear previous calls and setup return value
			MockedWorkflowBuilderAgent.mockClear();

			const testService = new AiWorkflowBuilderService(mockNodeTypes, mockClient, mockLogger);

			const payload: ChatPayload = {
				message: 'Create a workflow',
				workflowContext: {
					currentWorkflow: { id: 'test-workflow' },
				},
				useDeprecatedCredentials: false,
			};

			// Call chat to trigger agent creation
			const generator = testService.chat(payload, mockUser);
			await generator.next();

			// Verify WorkflowBuilderAgent was called with merged node types
			expect(MockedWorkflowBuilderAgent).toHaveBeenCalledWith(
				expect.objectContaining({
					parsedNodeTypes: expect.arrayContaining([
						expect.objectContaining({
							name: 'HttpRequestTool',
							displayName: 'HTTP Request Tool',
							// Should have tool properties (since tool node overrides regular node in merge)
							properties: [
								{ name: 'toolProp', type: 'string', displayName: '', default: undefined },
							],
						}),
					]),
				}),
			);

			// Also verify that the merged node has the correct structure
			const actualCall = MockedWorkflowBuilderAgent.mock.calls[0][0];
			const parsedNodeTypes = actualCall.parsedNodeTypes;

			// Should have the merged HttpRequestTool node and keep the separate HttpRequest node
			const toolNode = parsedNodeTypes.find(
				(node: INodeTypeDescription) => node.name === 'HttpRequestTool',
			);
			const regularNode = parsedNodeTypes.find(
				(node: INodeTypeDescription) => node.name === 'HttpRequest',
			);

			expect(toolNode).toBeDefined();
			expect(toolNode?.displayName).toBe('HTTP Request Tool');
			expect(toolNode?.properties).toEqual([
				{
					name: 'toolProp',
					type: 'string',
					displayName: '',
					default: undefined,
				},
			]);

			// The regular node should still exist separately (not merged into tool)
			expect(regularNode).toBeDefined();
			expect(regularNode?.displayName).toBe('HTTP Request');
		});
	});

	describe('chat', () => {
		let mockPayload: ChatPayload;

		beforeEach(() => {
			mockPayload = {
				message: 'Create a simple workflow',
				workflowContext: {
					currentWorkflow: { id: 'test-workflow' },
				},
				useDeprecatedCredentials: false,
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

		it('should handle deprecated credentials', async () => {
			const payloadWithDeprecatedCredentials = {
				...mockPayload,
				useDeprecatedCredentials: true,
			};

			const generator = service.chat(payloadWithDeprecatedCredentials, mockUser);
			await generator.next();

			// Verify that the deprecated credentials flow was used
			expect(mockClient.generateApiProxyCredentials).toHaveBeenCalledWith(mockUser);
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
			expect(config).toHaveProperty('onGenerationSuccess');
			expect(config).toHaveProperty('tracer');
			expect(config).toHaveProperty('checkpointer', mockMemorySaver);
			expect(config.parsedNodeTypes).toBeInstanceOf(Array);
			expect(config.onGenerationSuccess).toBeInstanceOf(Function);
			// Verify checkpointer comes from SessionManagerService
			expect(mockSessionManager.getCheckpointer).toHaveBeenCalled();
		});

		it('should create WorkflowBuilderAgent without tracer when no client', async () => {
			const serviceWithoutClient = new AiWorkflowBuilderService(
				mockNodeTypes,
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
			expect(config).toHaveProperty('onGenerationSuccess');
			expect(config).toHaveProperty('tracer', undefined);
			expect(config).toHaveProperty('checkpointer');
			expect(config.parsedNodeTypes).toBeInstanceOf(Array);
			expect(config.onGenerationSuccess).toBeInstanceOf(Function);
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
			const serviceWithoutClient = new AiWorkflowBuilderService(mockNodeTypes);
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

		it('should call onGenerationSuccess callback when not using deprecated credentials', async () => {
			const generator = service.chat(mockPayload, mockUser);
			await generator.next();

			const config = MockedWorkflowBuilderAgent.mock.calls[0][0];

			// Call the onGenerationSuccess callback
			await config.onGenerationSuccess!();

			expect(mockClient.markBuilderSuccess).toHaveBeenCalledWith(mockUser, {
				Authorization: 'Bearer test-access-token',
			});
		});

		it('should call onCreditsUpdated callback after markBuilderSuccess', async () => {
			const generator = service.chat(mockPayload, mockUser);
			await generator.next();

			const config = MockedWorkflowBuilderAgent.mock.calls[0][0];

			// Call the onGenerationSuccess callback
			await config.onGenerationSuccess!();

			// Verify callback was called with correct parameters
			expect(mockOnCreditsUpdated).toHaveBeenCalledWith('test-user-id', 10, 1);
		});

		it('should not call markBuilderSuccess when using deprecated credentials', async () => {
			const payloadWithDeprecatedCredentials = {
				...mockPayload,
				useDeprecatedCredentials: true,
			};

			const generator = service.chat(payloadWithDeprecatedCredentials, mockUser);
			await generator.next();

			const config = MockedWorkflowBuilderAgent.mock.calls[0][0];

			// Call the onGenerationSuccess callback
			await config.onGenerationSuccess!();

			// Should not call markBuilderSuccess for deprecated credentials
			expect(mockClient.markBuilderSuccess).not.toHaveBeenCalled();
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
				message: 'Create a workflow with HTTP request',
				workflowContext: {
					currentWorkflow: { id: workflowId },
				},
				useDeprecatedCredentials: false,
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
			const serviceWithoutClient = new AiWorkflowBuilderService(mockNodeTypes);

			const result = await serviceWithoutClient.getBuilderInstanceCredits(mockUser);

			expect(result).toEqual({
				creditsQuota: -1,
				creditsClaimed: 0,
			});
		});
	});
});
