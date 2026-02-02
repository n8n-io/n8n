import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	createMicrosoftAgentApplication,
	configureAdapterProcessCallback,
	getMicrosoftMcpTools,
	configureActivityCallback,
	microsoftMcpServers,
	extractActivityInfo,
	type MicrosoftAgent365Credentials,
	type ActivityCapture,
	type ActivityInfo,
} from '../microsoft-utils';

jest.mock('@microsoft/agents-hosting', () => ({
	MemoryStorage: jest.fn().mockImplementation(() => ({})),
	AgentApplication: jest.fn().mockImplementation(function (this: any, config: any) {
		this.adapter = config.adapter;
		this.storage = config.storage;
		this.authorization = config.authorization;
		this.onConversationUpdate = jest.fn();
		this.onActivity = jest.fn();
		this.run = jest.fn();
		return this;
	}),
	CloudAdapter: jest.fn().mockImplementation((config: any) => ({ config })),
}));

jest.mock('@microsoft/agents-a365-observability', () => ({
	ExecutionType: {
		HumanToAgent: 'HumanToAgent',
	},
	InvokeAgentScope: {
		start: jest.fn().mockReturnValue({
			withActiveSpanAsync: jest.fn().mockImplementation((fn: any) => fn()),
			recordInputMessages: jest.fn(),
			recordOutputMessages: jest.fn(),
			dispose: jest.fn(),
		}),
	},
	BaggageBuilder: jest.fn().mockImplementation(() => ({
		tenantId: jest.fn().mockReturnThis(),
		agentId: jest.fn().mockReturnThis(),
		correlationId: jest.fn().mockReturnThis(),
		agentName: jest.fn().mockReturnThis(),
		conversationId: jest.fn().mockReturnThis(),
		build: jest.fn().mockReturnValue({
			run: jest.fn().mockImplementation((fn: any) => fn()),
		}),
	})),
	ObservabilityManager: {
		configure: jest.fn().mockReturnValue({
			start: jest.fn(),
			shutdown: jest.fn(),
		}),
	},
}));

jest.mock('@microsoft/agents-a365-runtime', () => ({
	getMcpPlatformAuthenticationScope: jest.fn().mockReturnValue('mcp-scope'),
	getObservabilityAuthenticationScope: jest.fn().mockReturnValue('observability-scope'),
	Utility: {
		ResolveAgentIdentity: jest.fn().mockReturnValue('agent-identity'),
	},
}));

jest.mock('@microsoft/agents-a365-tooling', () => ({
	McpToolServerConfigurationService: jest.fn().mockImplementation(() => ({
		listToolServers: jest.fn().mockResolvedValue([]),
	})),
	Utility: {
		ValidateAuthToken: jest.fn(),
	},
}));

jest.mock('../langchain-utils', () => ({
	invokeAgent: jest.fn(),
}));

jest.mock('../../../mcp/shared/utils', () => ({
	connectMcpClient: jest.fn(),
	getAllTools: jest.fn(),
}));

jest.mock('../../../mcp/McpClientTool/utils', () => ({
	createCallTool: jest.fn(),
	mcpToolToDynamicTool: jest.fn(),
}));

jest.mock('uuid', () => ({
	v4: jest.fn(() => 'test-uuid'),
}));

import { MemoryStorage, AgentApplication, CloudAdapter } from '@microsoft/agents-hosting';
import { invokeAgent } from '../langchain-utils';
import { connectMcpClient, getAllTools } from '../../../mcp/shared/utils';
import { createCallTool, mcpToolToDynamicTool } from '../../../mcp/McpClientTool/utils';

describe('microsoft-utils', () => {
	describe('createMicrosoftAgentApplication', () => {
		const mockCredentials: MicrosoftAgent365Credentials = {
			clientId: 'test-client-id',
			tenantId: 'test-tenant-id',
			clientSecret: 'test-client-secret',
		};

		test('should create CloudAdapter with correct auth configuration', () => {
			createMicrosoftAgentApplication(mockCredentials);

			expect(CloudAdapter).toHaveBeenCalledWith(
				expect.objectContaining({
					clientId: mockCredentials.clientId,
					clientSecret: mockCredentials.clientSecret,
					tenantId: mockCredentials.tenantId,
					authority: 'https://login.microsoftonline.com',
					issuers: expect.arrayContaining([
						'https://api.botframework.com',
						`https://sts.windows.net/${mockCredentials.tenantId}/`,
						`https://login.microsoftonline.com/${mockCredentials.tenantId}/v2.0`,
					]),
				}),
			);
		});

		test('should create MemoryStorage', () => {
			createMicrosoftAgentApplication(mockCredentials);

			expect(MemoryStorage).toHaveBeenCalled();
		});

		test('should create AgentApplication with correct configuration', () => {
			const result = createMicrosoftAgentApplication(mockCredentials);

			expect(AgentApplication).toHaveBeenCalledWith(
				expect.objectContaining({
					adapter: expect.any(Object),
					storage: expect.any(Object),
					authorization: {
						agentic: {
							type: 'agentic',
							scopes: ['https://graph.microsoft.com/.default'],
						},
					},
				}),
			);

			expect(result).toBeInstanceOf(AgentApplication);
		});

		test('should return AgentApplication instance', () => {
			const result = createMicrosoftAgentApplication(mockCredentials);

			expect(result).toBeDefined();
			expect(result).toHaveProperty('adapter');
			expect(result).toHaveProperty('storage');
			expect(result).toHaveProperty('authorization');
		});
	});

	describe('configureAdapterProcessCallback', () => {
		let nodeContext: IWebhookFunctions;
		let agent: any;
		let credentials: MicrosoftAgent365Credentials;
		let activityCapture: ActivityCapture;

		beforeEach(() => {
			jest.clearAllMocks();

			nodeContext = mock<IWebhookFunctions>({
				getNodeParameter: jest.fn(),
				getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
			});

			agent = {
				authorization: {
					exchangeToken: jest.fn().mockResolvedValue({ token: 'mock-token' }),
				},
				onConversationUpdate: jest.fn(),
				onActivity: jest.fn(),
				run: jest.fn(),
			};

			credentials = {
				clientId: 'test-client-id',
				tenantId: 'test-tenant-id',
				clientSecret: 'test-client-secret',
			};

			activityCapture = {
				input: '',
				output: [],
				activity: {},
			};
		});

		test('should configure agent with welcome message', async () => {
			const mockTurnContext = {
				activity: {
					type: 'conversationUpdate',
					text: 'Hello',
					recipient: { agenticAppId: 'agent-id', name: 'Agent', tenantId: 'tenant-id' },
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn(),
				turnState: {
					set: jest.fn(),
				},
			};

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return 'Welcome to the agent!';
				if (param === 'systemPrompt') return 'Test agent';
				return undefined;
			});

			const callback = configureAdapterProcessCallback(
				nodeContext,
				agent,
				credentials,
				activityCapture,
			);

			await callback(mockTurnContext as any);

			expect(agent.onConversationUpdate).toHaveBeenCalled();
		});

		test('should set up activity callback that invokes agent', async () => {
			const mockTurnContext = {
				activity: {
					type: 'message',
					text: 'Test input message',
					recipient: { agenticAppId: 'agent-id', name: 'Agent', tenantId: 'tenant-id' },
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn().mockResolvedValue({}),
				turnState: {
					set: jest.fn(),
				},
			};

			(invokeAgent as jest.Mock).mockResolvedValue('Test agent response');
			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return 'Welcome!';
				if (param === 'systemPrompt') return 'Test agent';
				return undefined;
			});

			const callback = configureAdapterProcessCallback(
				nodeContext,
				agent,
				credentials,
				activityCapture,
			);

			await callback(mockTurnContext as any);

			expect(agent.onActivity).toHaveBeenCalled();
			expect(activityCapture.input).toBe('Test input message');
		});

		test('should handle agent.run errors and throw NodeOperationError', async () => {
			const mockTurnContext = {
				activity: {
					type: 'message',
					text: 'Test input',
					recipient: { agenticAppId: 'agent-id', name: 'Agent', tenantId: 'tenant-id' },
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn(),
				turnState: {
					set: jest.fn(),
				},
			};

			const mockError = new Error('Agent run failed');
			agent.run = jest.fn().mockRejectedValue(mockError);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return 'Welcome!';
				if (param === 'systemPrompt') return 'Test agent';
				return undefined;
			});

			const callback = configureAdapterProcessCallback(
				nodeContext,
				agent,
				credentials,
				activityCapture,
			);

			await expect(callback(mockTurnContext as any)).rejects.toThrow(NodeOperationError);
		});

		test('should call agent.run with turnContext', async () => {
			const mockTurnContext = {
				activity: {
					type: 'message',
					text: 'Test input',
					recipient: { agenticAppId: 'agent-id', name: 'Agent', tenantId: 'tenant-id' },
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn(),
				turnState: {
					set: jest.fn(),
				},
			};

			(invokeAgent as jest.Mock).mockResolvedValue('Test response');
			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return 'Welcome!';
				if (param === 'systemPrompt') return 'Test agent';
				return undefined;
			});

			const callback = configureAdapterProcessCallback(
				nodeContext,
				agent,
				credentials,
				activityCapture,
			);

			await callback(mockTurnContext as any);

			expect(agent.run).toHaveBeenCalledWith(mockTurnContext);
		});

		test('should exchange tokens for observability and MCP', async () => {
			const mockTurnContext = {
				activity: {
					type: 'message',
					text: 'Test input',
					recipient: { agenticAppId: 'agent-id', name: 'Agent', tenantId: 'tenant-id' },
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn(),
				turnState: {
					set: jest.fn(),
				},
			};

			(invokeAgent as jest.Mock).mockResolvedValue('Test response');
			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return 'Welcome!';
				if (param === 'systemPrompt') return 'Test agent';
				return undefined;
			});

			const callback = configureAdapterProcessCallback(
				nodeContext,
				agent,
				credentials,
				activityCapture,
			);

			await callback(mockTurnContext as any);

			expect(agent.authorization.exchangeToken).toHaveBeenCalledWith(
				mockTurnContext,
				'observability-scope',
				'agentic',
			);

			expect(agent.authorization.exchangeToken).toHaveBeenCalledWith(
				mockTurnContext,
				'agentic',
				expect.objectContaining({
					scopes: ['mcp-scope'],
				}),
			);
		});

		test('should handle MCP token exchange failure gracefully', async () => {
			const mockTurnContext = {
				activity: {
					type: 'message',
					text: 'Test input',
					recipient: { agenticAppId: 'agent-id', name: 'Agent', tenantId: 'tenant-id' },
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn(),
				turnState: {
					set: jest.fn(),
				},
			};

			agent.authorization.exchangeToken = jest
				.fn()
				.mockResolvedValueOnce({ token: 'observability-token' })
				.mockRejectedValueOnce(new Error('Token exchange failed'));

			(invokeAgent as jest.Mock).mockResolvedValue('Test response');
			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return 'Welcome!';
				if (param === 'systemPrompt') return 'Test agent';
				return undefined;
			});

			const callback = configureAdapterProcessCallback(
				nodeContext,
				agent,
				credentials,
				activityCapture,
			);

			await callback(mockTurnContext as any);

			expect(agent.run).toHaveBeenCalled();
		});

		test('should capture activity input and output', async () => {
			const mockTurnContext = {
				activity: {
					type: 'message',
					text: 'User input message',
					recipient: { agenticAppId: 'agent-id', name: 'Agent', tenantId: 'tenant-id' },
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn().mockImplementation(async (_activityOrText: string) => {
					return {};
				}),
				turnState: {
					set: jest.fn(),
				},
			};

			(invokeAgent as jest.Mock).mockResolvedValue('Agent response');
			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return 'Welcome!';
				if (param === 'systemPrompt') return 'Test agent';
				return undefined;
			});

			const callback = configureAdapterProcessCallback(
				nodeContext,
				agent,
				credentials,
				activityCapture,
			);

			await callback(mockTurnContext as any);

			expect(activityCapture.input).toBe('User input message');
		});

		test('should handle observability when enabled', async () => {
			const originalEnv = process.env;
			process.env.ENABLE_OBSERVABILITY = 'true';
			process.env.ENABLE_A365_OBSERVABILITY_EXPORTER = 'true';

			const mockTurnContext = {
				activity: {
					type: 'message',
					text: 'Test input',
					recipient: { agenticAppId: 'agent-id', name: 'Agent', tenantId: 'tenant-id' },
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn(),
				turnState: {
					set: jest.fn(),
				},
			};

			(invokeAgent as jest.Mock).mockResolvedValue('Test response');
			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return 'Welcome!';
				if (param === 'systemPrompt') return 'Test agent';
				return undefined;
			});

			const callback = configureAdapterProcessCallback(
				nodeContext,
				agent,
				credentials,
				activityCapture,
			);

			await callback(mockTurnContext as any);

			process.env = originalEnv;

			expect(agent.run).toHaveBeenCalled();
		});
	});

	describe('getMicrosoftMcpTools', () => {
		let mockTurnContext: any;
		let mockConfigService: any;

		beforeEach(() => {
			jest.clearAllMocks();

			mockTurnContext = {
				activity: {
					recipient: { tenantId: 'test-tenant-id' },
					channelData: { tenant: { id: 'test-tenant-id' } },
				},
			};

			// Reset the mock implementation for each test
			const { McpToolServerConfigurationService } = jest.requireMock(
				'@microsoft/agents-a365-tooling',
			);
			mockConfigService = {
				listToolServers: jest.fn().mockResolvedValue([]),
			};
			(McpToolServerConfigurationService as jest.Mock).mockImplementation(() => mockConfigService);
		});

		test('should return undefined when no servers are configured', async () => {
			mockConfigService.listToolServers.mockResolvedValue([]);

			const result = await getMicrosoftMcpTools(mockTurnContext, 'test-token', undefined);

			expect(result).toBeUndefined();
		});

		test('should filter servers when selectedTools is provided', async () => {
			const mockServers = [
				{ mcpServerName: 'mcp_CalendarTools', url: 'http://calendar-server' },
				{ mcpServerName: 'mcp_MailTools', url: 'http://mail-server' },
				{ mcpServerName: 'mcp_TeamsServer', url: 'http://teams-server' },
			];

			mockConfigService.listToolServers.mockResolvedValue(mockServers);

			const mockClient = { close: jest.fn() };
			(connectMcpClient as jest.Mock).mockResolvedValue({
				ok: true,
				result: mockClient,
			});

			const mockTool = { name: 'test-tool', description: 'Test tool' };
			(getAllTools as jest.Mock).mockResolvedValue([mockTool]);

			const mockCallTool = jest.fn();
			(createCallTool as jest.Mock).mockReturnValue(mockCallTool);

			const mockDynamicTool = { name: 'test-tool' };
			(mcpToolToDynamicTool as jest.Mock).mockReturnValue(mockDynamicTool);

			const selectedTools = ['mcp_CalendarTools', 'mcp_TeamsServer'];

			const result = await getMicrosoftMcpTools(mockTurnContext, 'test-token', selectedTools);

			expect(result).toBeDefined();
			expect(connectMcpClient).toHaveBeenCalledTimes(2);
		});

		test('should connect to MCP servers with correct headers', async () => {
			const mockServers = [{ mcpServerName: 'mcp_CalendarTools', url: 'http://calendar-server' }];

			mockConfigService.listToolServers.mockResolvedValue(mockServers);

			const mockClient = { close: jest.fn() };
			(connectMcpClient as jest.Mock).mockResolvedValue({
				ok: true,
				result: mockClient,
			});

			(getAllTools as jest.Mock).mockResolvedValue([]);

			await getMicrosoftMcpTools(mockTurnContext, 'test-token', undefined);

			expect(connectMcpClient).toHaveBeenCalledWith({
				serverTransport: 'httpStreamable',
				endpointUrl: 'http://calendar-server',
				headers: {
					Authorization: 'Bearer test-token',
					'x-ms-tenant-id': 'test-tenant-id',
				},
				name: 'Microsoft-Agent-365',
				version: 1,
			});
		});

		test('should handle connection errors gracefully', async () => {
			const mockServers = [
				{ mcpServerName: 'mcp_CalendarTools', url: 'http://calendar-server' },
				{ mcpServerName: 'mcp_MailTools', url: 'http://mail-server' },
			];

			mockConfigService.listToolServers.mockResolvedValue(mockServers);

			(connectMcpClient as jest.Mock)
				.mockResolvedValueOnce({
					ok: false,
					error: 'Connection failed',
				})
				.mockResolvedValueOnce({
					ok: true,
					result: { close: jest.fn() },
				});

			(getAllTools as jest.Mock).mockResolvedValue([]);

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

			try {
				await getMicrosoftMcpTools(mockTurnContext, 'test-token', undefined);

				expect(consoleSpy).toHaveBeenCalledWith(
					'Failed to connect to MCP server mcp_CalendarTools:',
					'Connection failed',
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});

		test('should create dynamic tools from MCP tools', async () => {
			const mockServers = [{ mcpServerName: 'mcp_CalendarTools', url: 'http://calendar-server' }];

			mockConfigService.listToolServers.mockResolvedValue(mockServers);

			const mockClient = { close: jest.fn() };
			(connectMcpClient as jest.Mock).mockResolvedValue({
				ok: true,
				result: mockClient,
			});

			const mockTools = [
				{ name: 'create_event', description: 'Create calendar event' },
				{ name: 'list_events', description: 'List calendar events' },
			];
			(getAllTools as jest.Mock).mockResolvedValue(mockTools);

			const mockCallTool = jest.fn();
			(createCallTool as jest.Mock).mockReturnValue(mockCallTool);

			const mockDynamicTool1 = { name: 'create_event' };
			const mockDynamicTool2 = { name: 'list_events' };
			(mcpToolToDynamicTool as jest.Mock)
				.mockReturnValueOnce(mockDynamicTool1)
				.mockReturnValueOnce(mockDynamicTool2);

			const result = await getMicrosoftMcpTools(mockTurnContext, 'test-token', undefined);

			expect(result).toBeDefined();
			expect(result?.tools).toHaveLength(2);
			expect(createCallTool).toHaveBeenCalledTimes(2);
			expect(mcpToolToDynamicTool).toHaveBeenCalledTimes(2);
		});

		test('should return undefined when no tools are available', async () => {
			const mockServers = [{ mcpServerName: 'mcp_CalendarTools', url: 'http://calendar-server' }];

			mockConfigService.listToolServers.mockResolvedValue(mockServers);

			const mockClient = { close: jest.fn() };
			(connectMcpClient as jest.Mock).mockResolvedValue({
				ok: true,
				result: mockClient,
			});

			(getAllTools as jest.Mock).mockResolvedValue([]);

			const result = await getMicrosoftMcpTools(mockTurnContext, 'test-token', undefined);

			expect(result).toBeUndefined();
		});

		test('should provide close method that closes all clients', async () => {
			const mockServers = [
				{ mcpServerName: 'mcp_CalendarTools', url: 'http://calendar-server' },
				{ mcpServerName: 'mcp_MailTools', url: 'http://mail-server' },
			];

			mockConfigService.listToolServers.mockResolvedValue(mockServers);

			const mockClient1 = { close: jest.fn() };
			const mockClient2 = { close: jest.fn() };
			(connectMcpClient as jest.Mock)
				.mockResolvedValueOnce({ ok: true, result: mockClient1 })
				.mockResolvedValueOnce({ ok: true, result: mockClient2 });

			const mockTool = { name: 'test-tool', description: 'Test tool' };
			(getAllTools as jest.Mock).mockResolvedValue([mockTool]);

			const mockCallTool = jest.fn();
			(createCallTool as jest.Mock).mockReturnValue(mockCallTool);

			const mockDynamicTool = { name: 'test-tool' };
			(mcpToolToDynamicTool as jest.Mock).mockReturnValue(mockDynamicTool);

			const result = await getMicrosoftMcpTools(mockTurnContext, 'test-token', undefined);

			await result?.client.close();

			expect(mockClient1.close).toHaveBeenCalled();
			expect(mockClient2.close).toHaveBeenCalled();
		});

		test('should use tenant id from channelData if recipient tenantId is not available', async () => {
			const contextWithChannelData = {
				activity: {
					recipient: {},
					channelData: { tenant: { id: 'channel-tenant-id' } },
				},
			};

			const mockServers = [{ mcpServerName: 'mcp_CalendarTools', url: 'http://calendar-server' }];

			mockConfigService.listToolServers.mockResolvedValue(mockServers);

			const mockClient = { close: jest.fn() };
			(connectMcpClient as jest.Mock).mockResolvedValue({
				ok: true,
				result: mockClient,
			});

			(getAllTools as jest.Mock).mockResolvedValue([]);

			await getMicrosoftMcpTools(contextWithChannelData as any, 'test-token', undefined);

			expect(connectMcpClient).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({
						'x-ms-tenant-id': 'channel-tenant-id',
					}),
				}),
			);
		});
	});

	describe('configureActivityCallback', () => {
		let nodeContext: IWebhookFunctions;
		let credentials: MicrosoftAgent365Credentials;
		let mcpTokenRef: { token: string | undefined };
		let mockTurnContext: any;

		beforeEach(() => {
			jest.clearAllMocks();

			nodeContext = mock<IWebhookFunctions>({
				getNodeParameter: jest.fn(),
				getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
			});

			credentials = {
				clientId: 'test-client-id',
				tenantId: 'test-tenant-id',
				clientSecret: 'test-client-secret',
			};

			mcpTokenRef = { token: 'test-mcp-token' };

			mockTurnContext = {
				activity: {
					text: 'Test message',
					recipient: {
						agenticAppId: 'agent-id',
						name: 'Test Agent',
						tenantId: 'tenant-id',
					},
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn().mockResolvedValue({}),
			};
		});

		test('should invoke agent with input text and system prompt', async () => {
			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'systemPrompt') return 'You are a helpful assistant';
				if (param === 'useMcpTools') return false;
				return undefined;
			});

			(invokeAgent as jest.Mock).mockResolvedValue('Agent response');

			const callback = configureActivityCallback(nodeContext, credentials, mcpTokenRef);
			await callback(mockTurnContext);

			expect(invokeAgent).toHaveBeenCalledWith(
				nodeContext,
				'Test message',
				'You are a helpful assistant',
				{ configurable: { thread_id: 'conversation-id' } },
				undefined,
			);
		});

		test('should handle empty input text', async () => {
			const contextWithEmptyText = {
				...mockTurnContext,
				activity: {
					...mockTurnContext.activity,
					text: '',
				},
			};

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'systemPrompt') return 'Test prompt';
				if (param === 'useMcpTools') return false;
				return undefined;
			});

			(invokeAgent as jest.Mock).mockResolvedValue('Response');

			const callback = configureActivityCallback(nodeContext, credentials, mcpTokenRef);
			await callback(contextWithEmptyText);

			expect(invokeAgent).toHaveBeenCalledWith(
				nodeContext,
				'',
				'Test prompt',
				{ configurable: { thread_id: 'conversation-id' } },
				undefined,
			);
		});

		test('should not use MCP tools when token is not available', async () => {
			const noTokenRef = { token: undefined };

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'systemPrompt') return 'Test prompt';
				return undefined;
			});

			(invokeAgent as jest.Mock).mockResolvedValue('Response');

			const callback = configureActivityCallback(nodeContext, credentials, noTokenRef);
			await callback(mockTurnContext);

			expect(invokeAgent).toHaveBeenCalledWith(
				nodeContext,
				'Test message',
				'Test prompt',
				{ configurable: { thread_id: 'conversation-id' } },
				undefined,
			);
		});

		test('should send agent response to turn context', async () => {
			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'systemPrompt') return 'Test prompt';
				if (param === 'useMcpTools') return false;
				return undefined;
			});

			(invokeAgent as jest.Mock).mockResolvedValue('Test agent response');

			const callback = configureActivityCallback(nodeContext, credentials, mcpTokenRef);
			await callback(mockTurnContext);

			expect(mockTurnContext.sendActivity).toHaveBeenCalledWith('Test agent response');
		});

		test('should use default values when recipient data is missing', async () => {
			const contextWithoutRecipient = {
				activity: {
					text: 'Test message',
					conversation: { id: 'conversation-id' },
					recipient: {},
				},
				sendActivity: jest.fn().mockResolvedValue({}),
			};

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'systemPrompt') return 'Test prompt';
				if (param === 'useMcpTools') return false;
				return undefined;
			});

			(invokeAgent as jest.Mock).mockResolvedValue('Response');

			const callback = configureActivityCallback(nodeContext, credentials, mcpTokenRef);
			await callback(contextWithoutRecipient as any);

			expect(invokeAgent).toHaveBeenCalled();
		});
	});

	describe('microsoftMcpServers', () => {
		test('should export correct server options', () => {
			expect(microsoftMcpServers).toEqual([
				{ name: 'Calendar', value: 'mcp_CalendarTools' },
				{ name: 'Mail', value: 'mcp_MailTools' },
				{ name: 'Me', value: 'mcp_MeServer' },
				{ name: 'OneDrive & SharePoint', value: 'mcp_ODSPRemoteServer' },
				{ name: 'SharePoint Lists', value: 'mcp_SharePointListsTools' },
				{ name: 'Teams', value: 'mcp_TeamsServer' },
				{ name: 'Teams Canary', value: 'mcp_TeamsCanaryServer' },
				{ name: 'Word', value: 'mcp_WordServer' },
			]);
		});

		test('should have correct number of server options', () => {
			expect(microsoftMcpServers).toHaveLength(8);
		});
	});

	describe('extractActivityInfo', () => {
		test('should extract all fields from a complete activity', () => {
			const activity = {
				id: 'activity-123',
				type: 'message',
				channelId: 'msteams',
				conversation: { id: 'conv-456' },
				from: { id: 'user-789', name: 'John Doe' },
				recipient: { id: 'bot-abc', name: 'Test Bot' },
				timestamp: new Date('2024-01-15T10:30:00Z'),
				locale: 'en-US',
			};

			const result: ActivityInfo = extractActivityInfo(activity as any);

			expect(result).toEqual({
				id: 'activity-123',
				type: 'message',
				channelId: 'msteams',
				conversationId: 'conv-456',
				from: { id: 'user-789', name: 'John Doe' },
				recipient: { id: 'bot-abc', name: 'Test Bot' },
				timestamp: '2024-01-15T10:30:00.000Z',
				locale: 'en-US',
			});
		});

		test('should handle activity with missing optional fields', () => {
			const activity = {
				type: 'message',
			};

			const result: ActivityInfo = extractActivityInfo(activity as any);

			expect(result).toEqual({
				id: undefined,
				type: 'message',
				channelId: undefined,
				conversationId: undefined,
				from: undefined,
				recipient: undefined,
				timestamp: undefined,
				locale: undefined,
			});
		});

		test('should handle activity with string timestamp', () => {
			const activity = {
				type: 'message',
				timestamp: '2024-01-15T10:30:00Z',
			};

			const result: ActivityInfo = extractActivityInfo(activity as any);

			expect(result.timestamp).toBe('2024-01-15T10:30:00Z');
		});

		test('should handle activity with partial from/recipient data', () => {
			const activity = {
				type: 'message',
				from: { id: 'user-123' },
				recipient: { name: 'Bot Name' },
			};

			const result: ActivityInfo = extractActivityInfo(activity as any);

			expect(result.from).toEqual({ id: 'user-123', name: undefined });
			expect(result.recipient).toEqual({ id: undefined, name: 'Bot Name' });
		});

		test('should handle activity with null conversation', () => {
			const activity = {
				type: 'message',
				conversation: null,
			};

			const result: ActivityInfo = extractActivityInfo(activity as any);

			expect(result.conversationId).toBeUndefined();
		});

		test('should extract conversationId from conversation object', () => {
			const activity = {
				type: 'conversationUpdate',
				conversation: { id: 'conversation-id-123', name: 'Test Conversation' },
			};

			const result: ActivityInfo = extractActivityInfo(activity as any);

			expect(result.conversationId).toBe('conversation-id-123');
		});
	});
});
