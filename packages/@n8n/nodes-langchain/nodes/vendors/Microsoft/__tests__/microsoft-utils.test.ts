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
	buildMcpToolName,
	disposeActivityResources,
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
	defaultObservabilityConfigurationProvider: {
		getConfiguration: jest.fn().mockReturnValue({
			observabilityAuthenticationScopes: ['observability-scope'],
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
	defaultToolingConfigurationProvider: {
		getConfiguration: jest.fn().mockReturnValue({
			mcpPlatformAuthenticationScope: 'mcp-scope',
		}),
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
	buildMcpToolName: jest.requireActual('../../../mcp/McpClientTool/utils').buildMcpToolName,
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

		test('should not register installationUpdate handler', async () => {
			const mockTurnContext = {
				activity: {
					type: 'message',
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

			expect(agent.onActivity).not.toHaveBeenCalledWith('installationUpdate', expect.any(Function));
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

		test('should exchange observability token only when observability is enabled', async () => {
			const originalEnv = process.env;
			process.env = {
				...originalEnv,
				ENABLE_OBSERVABILITY: 'true',
				ENABLE_A365_OBSERVABILITY_EXPORTER: 'true',
			};

			const mockTurnContext = {
				activity: {
					type: 'message',
					text: 'Test input',
					recipient: { agenticAppId: 'agent-id', name: 'Agent', tenantId: 'tenant-id' },
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn(),
				turnState: { set: jest.fn() },
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

			expect(agent.authorization.exchangeToken).toHaveBeenCalledWith(
				mockTurnContext,
				['observability-scope'],
				'agentic',
			);
			expect(agent.authorization.exchangeToken).toHaveBeenCalledWith(
				mockTurnContext,
				'agentic',
				expect.objectContaining({ scopes: ['mcp-scope'] }),
			);
		});

		test('should not exchange observability token when observability is disabled', async () => {
			const originalEnv = process.env;
			process.env = { ...originalEnv, ENABLE_OBSERVABILITY: 'false' };

			const mockTurnContext = {
				activity: {
					type: 'message',
					text: 'Test input',
					recipient: { agenticAppId: 'agent-id', name: 'Agent', tenantId: 'tenant-id' },
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn(),
				turnState: { set: jest.fn() },
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

			expect(agent.authorization.exchangeToken).not.toHaveBeenCalledWith(
				mockTurnContext,
				['observability-scope'],
				'agentic',
			);
			// MCP token exchange still happens regardless
			expect(agent.authorization.exchangeToken).toHaveBeenCalledWith(
				mockTurnContext,
				'agentic',
				expect.objectContaining({ scopes: ['mcp-scope'] }),
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

		test('should set activityCapture.input to addmember XML so webhook can suppress execution', async () => {
			const addmemberXml =
				'<addmember><eventtime>1775195471530</eventtime><initiator>28:app:abc</initiator></addmember>';
			const mockTurnContext = {
				activity: {
					type: 'message',
					text: addmemberXml,
					recipient: { agenticAppId: 'agent-id', name: 'Agent', tenantId: 'tenant-id' },
					conversation: { id: 'conversation-id' },
				},
				sendActivity: jest.fn().mockResolvedValue({}),
				turnState: { set: jest.fn() },
			};

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return 'Hello!';
				if (param === 'systemPrompt') return 'Test prompt';
				return undefined;
			});

			const callback = configureAdapterProcessCallback(
				nodeContext,
				agent,
				credentials,
				activityCapture,
			);

			await callback(mockTurnContext as any);

			expect(activityCapture.input).toBe(addmemberXml);
			expect(activityCapture.input.trimStart().startsWith('<addmember>')).toBe(true);
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

		let mockAuthorization: any;

		beforeEach(() => {
			jest.clearAllMocks();

			mockTurnContext = {
				activity: {
					recipient: { tenantId: 'test-tenant-id' },
					channelData: { tenant: { id: 'test-tenant-id' } },
				},
			};

			mockAuthorization = { exchangeToken: jest.fn() };

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

			const result = await getMicrosoftMcpTools(
				mockTurnContext,
				mockAuthorization,
				'test-token',
				undefined,
			);

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

			const result = await getMicrosoftMcpTools(
				mockTurnContext,
				mockAuthorization,
				'test-token',
				selectedTools,
			);

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

			await getMicrosoftMcpTools(mockTurnContext, mockAuthorization, 'test-token', undefined);

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
				await getMicrosoftMcpTools(mockTurnContext, mockAuthorization, 'test-token', undefined);

				expect(consoleSpy).toHaveBeenCalledWith(
					'Failed to connect to MCP server mcp_CalendarTools:',
					'Connection failed',
				);
			} finally {
				consoleSpy.mockRestore();
			}
		});

		test('should create dynamic tools from MCP tools grouped into one toolkit per server', async () => {
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

			(mcpToolToDynamicTool as jest.Mock)
				.mockReturnValueOnce({ name: 'mcp_CalendarTools_create_event' })
				.mockReturnValueOnce({ name: 'mcp_CalendarTools_list_events' });

			const result = await getMicrosoftMcpTools(
				mockTurnContext,
				mockAuthorization,
				'test-token',
				undefined,
			);

			expect(result).toBeDefined();
			// One toolkit per server
			expect(result?.toolkits).toHaveLength(1);
			expect(result?.toolkits[0].tools).toHaveLength(2);
			expect(mcpToolToDynamicTool).toHaveBeenCalledTimes(2);
			// mcpToolToDynamicTool receives the prefixed name and a logging wrapper
			expect(mcpToolToDynamicTool).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'mcp_CalendarTools_create_event' }),
				expect.any(Function),
			);
			expect(mcpToolToDynamicTool).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'mcp_CalendarTools_list_events' }),
				expect.any(Function),
			);
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

			const result = await getMicrosoftMcpTools(
				mockTurnContext,
				mockAuthorization,
				'test-token',
				undefined,
			);

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

			const result = await getMicrosoftMcpTools(
				mockTurnContext,
				mockAuthorization,
				'test-token',
				undefined,
			);

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

			await getMicrosoftMcpTools(
				contextWithChannelData as any,
				mockAuthorization,
				'test-token',
				undefined,
			);

			expect(connectMcpClient).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({
						'x-ms-tenant-id': 'channel-tenant-id',
					}),
				}),
			);
		});

		test('should create separate toolkits for each server', async () => {
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

			(getAllTools as jest.Mock)
				.mockResolvedValueOnce([{ name: 'create_event', description: 'Create event' }])
				.mockResolvedValueOnce([{ name: 'send_email', description: 'Send email' }]);

			const mockCallTool = jest.fn();
			(createCallTool as jest.Mock).mockReturnValue(mockCallTool);
			(mcpToolToDynamicTool as jest.Mock)
				.mockReturnValueOnce({ name: 'mcp_CalendarTools_create_event' })
				.mockReturnValueOnce({ name: 'mcp_MailTools_send_email' });

			const result = await getMicrosoftMcpTools(
				mockTurnContext,
				mockAuthorization,
				'test-token',
				undefined,
			);

			expect(result?.toolkits).toHaveLength(2);
			expect(result?.toolkits[0].tools).toHaveLength(1);
			expect(result?.toolkits[1].tools).toHaveLength(1);
		});

		test('should prevent duplicate tool names when multiple servers expose same-named tools', async () => {
			const mockServers = [
				{ mcpServerName: 'mcp_CalendarTools', url: 'http://calendar-server' },
				{ mcpServerName: 'mcp_MailTools', url: 'http://mail-server' },
			];

			mockConfigService.listToolServers.mockResolvedValue(mockServers);

			(connectMcpClient as jest.Mock).mockResolvedValue({ ok: true, result: { close: jest.fn() } });

			// Both servers expose a tool called 'search'
			(getAllTools as jest.Mock).mockResolvedValue([{ name: 'search', description: 'Search' }]);

			(mcpToolToDynamicTool as jest.Mock)
				.mockReturnValueOnce({ name: 'mcp_CalendarTools_search' })
				.mockReturnValueOnce({ name: 'mcp_MailTools_search' });

			const result = await getMicrosoftMcpTools(
				mockTurnContext,
				mockAuthorization,
				'test-token',
				undefined,
			);

			// mcpToolToDynamicTool gets server-prefixed names, avoiding collision
			expect(mcpToolToDynamicTool).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'mcp_CalendarTools_search' }),
				expect.any(Function),
			);
			expect(mcpToolToDynamicTool).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'mcp_MailTools_search' }),
				expect.any(Function),
			);
			// Two toolkits, each with one distinctly-named tool
			expect(result?.toolkits).toHaveLength(2);
		});

		test('should sanitize special characters in server name when prefixing tool names', async () => {
			const mockServers = [
				{ mcpServerName: 'mcp-Calendar.Tools (v2)', url: 'http://calendar-server' },
			];

			mockConfigService.listToolServers.mockResolvedValue(mockServers);

			const mockClient = { close: jest.fn() };
			(connectMcpClient as jest.Mock).mockResolvedValue({ ok: true, result: mockClient });

			(getAllTools as jest.Mock).mockResolvedValue([
				{ name: 'create_event', description: 'Create event' },
			]);

			(mcpToolToDynamicTool as jest.Mock).mockReturnValue({
				name: 'mcp_Calendar_Tools__v2__create_event',
			});

			await getMicrosoftMcpTools(mockTurnContext, mockAuthorization, 'test-token', undefined);

			// Special chars (dash, dot, space, parens) all replaced with underscores
			expect(mcpToolToDynamicTool).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'mcp_Calendar_Tools__v2__create_event' }),
				expect.any(Function),
			);
		});

		test('should trim server prefix to keep tool name intact when combined name exceeds 64 chars', async () => {
			// Server name (40 chars) + '_' + tool name (30 chars) = 71 chars — over the 64-char limit
			const longServerName = 'mcp_AVeryLongServerNameThatIsFortyChars_'; // 40 chars
			const toolName = 'a_tool_name_that_is_thirty_chars__'; // 34 chars: 40+1+34 = 75 > 64
			const mockServers = [{ mcpServerName: longServerName, url: 'http://long-server' }];

			mockConfigService.listToolServers.mockResolvedValue(mockServers);
			(connectMcpClient as jest.Mock).mockResolvedValue({ ok: true, result: { close: jest.fn() } });
			(getAllTools as jest.Mock).mockResolvedValue([{ name: toolName, description: 'Tool' }]);

			const mockCallTool = jest.fn();
			(createCallTool as jest.Mock).mockReturnValue(mockCallTool);
			(mcpToolToDynamicTool as jest.Mock).mockReturnValue({ name: 'trimmed' });

			await getMicrosoftMcpTools(mockTurnContext, mockAuthorization, 'test-token', undefined);

			const calledWith = (mcpToolToDynamicTool as jest.Mock).mock.calls[0][0];
			// Tool name is always preserved; only the prefix is trimmed
			expect(calledWith.name).toHaveLength(64);
			expect(calledWith.name).toContain(`_${toolName}`);
			expect(calledWith.name.endsWith(`_${toolName}`)).toBe(true);
		});

		test('should use tool name alone when tool name itself reaches 64 chars', async () => {
			// Tool name is exactly 64 chars — no room for any prefix
			const toolName = 'a'.repeat(64);
			const mockServers = [{ mcpServerName: 'mcp_SomeServer', url: 'http://some-server' }];

			mockConfigService.listToolServers.mockResolvedValue(mockServers);
			(connectMcpClient as jest.Mock).mockResolvedValue({ ok: true, result: { close: jest.fn() } });
			(getAllTools as jest.Mock).mockResolvedValue([{ name: toolName, description: 'Tool' }]);

			(mcpToolToDynamicTool as jest.Mock).mockReturnValue({ name: toolName });

			await getMicrosoftMcpTools(mockTurnContext, mockAuthorization, 'test-token', undefined);

			expect(mcpToolToDynamicTool).toHaveBeenCalledWith(
				expect.objectContaining({ name: toolName }),
				expect.any(Function),
			);
		});
		describe('tool call logging', () => {
			let mockTurnContextLogging: any;
			let mockConfigServiceLogging: any;
			let mockAuthorizationLogging: any;

			beforeEach(() => {
				jest.clearAllMocks();

				mockTurnContextLogging = {
					activity: {
						recipient: { tenantId: 'test-tenant-id' },
						channelData: { tenant: { id: 'test-tenant-id' } },
					},
				};

				mockAuthorizationLogging = { exchangeToken: jest.fn() };

				const { McpToolServerConfigurationService } = jest.requireMock(
					'@microsoft/agents-a365-tooling',
				);
				mockConfigServiceLogging = {
					listToolServers: jest
						.fn()
						.mockResolvedValue([
							{ mcpServerName: 'mcp_CalendarTools', url: 'http://calendar-server' },
						]),
				};
				(McpToolServerConfigurationService as jest.Mock).mockImplementation(
					() => mockConfigServiceLogging,
				);

				(connectMcpClient as jest.Mock).mockResolvedValue({
					ok: true,
					result: { close: jest.fn() },
				});

				(getAllTools as jest.Mock).mockResolvedValue([
					{ name: 'list_events', description: 'List calendar events' },
				]);
			});

			test('should return an empty logs array when no tools have been called', async () => {
				(mcpToolToDynamicTool as jest.Mock).mockReturnValue({
					name: 'mcp_CalendarTools_list_events',
				});

				const result = await getMicrosoftMcpTools(
					mockTurnContextLogging,
					mockAuthorizationLogging,
					'test-token',
					undefined,
				);

				expect(result).toBeDefined();
				expect(result?.logs).toBeDefined();
				expect(result?.logs).toHaveLength(0);
			});

			test('should log a successful tool call with correct metadata', async () => {
				let capturedToolFunc: ((args: Record<string, unknown>) => Promise<unknown>) | undefined;
				(mcpToolToDynamicTool as jest.Mock).mockImplementation(
					(_tool: unknown, func: (args: Record<string, unknown>) => Promise<unknown>) => {
						capturedToolFunc = func;
						return { name: 'mcp_CalendarTools_list_events' };
					},
				);

				(createCallTool as jest.Mock).mockImplementation(() =>
					jest.fn().mockResolvedValue([{ id: '1', title: 'Team meeting' }]),
				);

				const result = await getMicrosoftMcpTools(
					mockTurnContextLogging,
					mockAuthorizationLogging,
					'test-token',
					undefined,
				);

				await capturedToolFunc!({ maxResults: 5 });

				expect(result?.logs).toHaveLength(1);
				expect(result?.logs[0]).toMatchObject({
					serverName: 'mcp_CalendarTools',
					toolName: 'mcp_CalendarTools_list_events',
					input: { maxResults: 5 },
					output: [{ id: '1', title: 'Team meeting' }],
					isError: false,
				});
				expect(typeof result?.logs[0].durationMs).toBe('number');
				expect(typeof result?.logs[0].timestamp).toBe('string');
			});

			test('should log a failed tool call with isError set to true', async () => {
				let capturedToolFunc: ((args: Record<string, unknown>) => Promise<unknown>) | undefined;
				(mcpToolToDynamicTool as jest.Mock).mockImplementation(
					(_tool: unknown, func: (args: Record<string, unknown>) => Promise<unknown>) => {
						capturedToolFunc = func;
						return { name: 'mcp_CalendarTools_list_events' };
					},
				);

				(createCallTool as jest.Mock).mockImplementation(
					(_name: string, _client: unknown, _timeout: number, onError: (msg: string) => void) =>
						jest.fn().mockImplementation(async () => {
							onError('Calendar API unavailable');
							return 'Calendar API unavailable';
						}),
				);

				const result = await getMicrosoftMcpTools(
					mockTurnContextLogging,
					mockAuthorizationLogging,
					'test-token',
					undefined,
				);

				await capturedToolFunc!({ maxResults: 5 });

				expect(result?.logs).toHaveLength(1);
				expect(result?.logs[0].isError).toBe(true);
				expect(result?.logs[0].output).toBe('Calendar API unavailable');
			});

			test('should use original tool name (not prefixed) when calling createCallTool', async () => {
				let capturedToolFunc: ((args: Record<string, unknown>) => Promise<unknown>) | undefined;
				(mcpToolToDynamicTool as jest.Mock).mockImplementation(
					(_tool: unknown, func: (args: Record<string, unknown>) => Promise<unknown>) => {
						capturedToolFunc = func;
						return { name: 'mcp_CalendarTools_list_events' };
					},
				);

				const mockCallTool = jest.fn().mockResolvedValue('result');
				(createCallTool as jest.Mock).mockReturnValue(mockCallTool);

				await getMicrosoftMcpTools(
					mockTurnContextLogging,
					mockAuthorizationLogging,
					'test-token',
					undefined,
				);

				// createCallTool is not called at setup — only when the tool is actually invoked
				expect(createCallTool).not.toHaveBeenCalled();

				await capturedToolFunc!({ arg: 'value' });

				// After invocation, createCallTool is called with the original (unprefixed) tool name
				expect(createCallTool).toHaveBeenCalledWith(
					'list_events',
					expect.anything(),
					60000,
					expect.any(Function),
				);
			});

			test('should accumulate logs across multiple tool invocations', async () => {
				const capturedFuncs: Array<(args: Record<string, unknown>) => Promise<unknown>> = [];
				(getAllTools as jest.Mock).mockResolvedValue([
					{ name: 'list_events', description: 'List events' },
					{ name: 'create_event', description: 'Create event' },
				]);
				(mcpToolToDynamicTool as jest.Mock).mockImplementation(
					(_tool: unknown, func: (args: Record<string, unknown>) => Promise<unknown>) => {
						capturedFuncs.push(func);
						return { name: 'some-tool' };
					},
				);
				(createCallTool as jest.Mock).mockImplementation(() => jest.fn().mockResolvedValue('ok'));

				const result = await getMicrosoftMcpTools(
					mockTurnContextLogging,
					mockAuthorizationLogging,
					'test-token',
					undefined,
				);

				await capturedFuncs[0]!({ query: 'today' });
				await capturedFuncs[1]!({ title: 'Standup' });

				expect(result?.logs).toHaveLength(2);
				expect(result?.logs[0].toolName).toBe('mcp_CalendarTools_list_events');
				expect(result?.logs[1].toolName).toBe('mcp_CalendarTools_create_event');
			});
		});
	});

	describe('configureActivityCallback', () => {
		let nodeContext: IWebhookFunctions;
		let credentials: MicrosoftAgent365Credentials;
		let mcpTokenRef: { token: string | undefined };
		let mockAuthorization: any;
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

			mockAuthorization = { exchangeToken: jest.fn() };

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

			const activityCapture = { input: '', output: [], activity: {} };
			const callback = configureActivityCallback(
				nodeContext,
				credentials,
				mcpTokenRef,
				mockAuthorization,
				activityCapture,
			);
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

			const activityCapture = { input: '', output: [], activity: {} };
			const callback = configureActivityCallback(
				nodeContext,
				credentials,
				mcpTokenRef,
				mockAuthorization,
				activityCapture,
			);
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

			const activityCapture = { input: '', output: [], activity: {} };
			const callback = configureActivityCallback(
				nodeContext,
				credentials,
				noTokenRef,
				mockAuthorization,
				activityCapture,
			);
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

			const activityCapture = { input: '', output: [], activity: {} };
			const callback = configureActivityCallback(
				nodeContext,
				credentials,
				mcpTokenRef,
				mockAuthorization,
				activityCapture,
			);
			await callback(mockTurnContext);

			expect(mockTurnContext.sendActivity).toHaveBeenCalledWith('Test agent response');
		});

		test('should not set mcpToolLogs on activityCapture when no MCP tools are invoked', async () => {
			const { McpToolServerConfigurationService } = jest.requireMock(
				'@microsoft/agents-a365-tooling',
			);
			const mockConfigSvc = {
				listToolServers: jest
					.fn()
					.mockResolvedValue([
						{ mcpServerName: 'mcp_CalendarTools', url: 'http://calendar-server' },
					]),
			};
			(McpToolServerConfigurationService as jest.Mock).mockImplementation(() => mockConfigSvc);
			(connectMcpClient as jest.Mock).mockResolvedValue({ ok: true, result: { close: jest.fn() } });
			(getAllTools as jest.Mock).mockResolvedValue([
				{ name: 'list_events', description: 'List events' },
			]);
			(mcpToolToDynamicTool as jest.Mock).mockReturnValue({
				name: 'mcp_CalendarTools_list_events',
			});

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'systemPrompt') return 'Test prompt';
				if (param === 'useMcpTools') return true;
				if (param === 'include') return 'all';
				return undefined;
			});

			(invokeAgent as jest.Mock).mockResolvedValue('Response');

			const activityCapture: ActivityCapture = { input: '', output: [], activity: {} };
			const callback = configureActivityCallback(
				nodeContext,
				credentials,
				mcpTokenRef,
				mockAuthorization,
				activityCapture,
			);
			await callback(mockTurnContext);

			// invokeAgent is mocked and never actually calls the tools,
			// so logs remain empty and mcpToolLogs should not be set
			expect(activityCapture.mcpToolLogs).toBeUndefined();
		});

		test('should persist mcpToolLogs on activityCapture even when invokeAgent throws', async () => {
			const { McpToolServerConfigurationService } = jest.requireMock(
				'@microsoft/agents-a365-tooling',
			);
			const mockConfigSvc = {
				listToolServers: jest
					.fn()
					.mockResolvedValue([
						{ mcpServerName: 'mcp_CalendarTools', url: 'http://calendar-server' },
					]),
			};
			(McpToolServerConfigurationService as jest.Mock).mockImplementation(() => mockConfigSvc);
			(connectMcpClient as jest.Mock).mockResolvedValue({ ok: true, result: { close: jest.fn() } });
			(getAllTools as jest.Mock).mockResolvedValue([
				{ name: 'list_events', description: 'List events' },
			]);

			let capturedToolFunc: ((args: Record<string, unknown>) => Promise<unknown>) | undefined;
			(mcpToolToDynamicTool as jest.Mock).mockImplementation(
				(_tool: unknown, func: (args: Record<string, unknown>) => Promise<unknown>) => {
					capturedToolFunc = func;
					return { name: 'mcp_CalendarTools_list_events' };
				},
			);
			(createCallTool as jest.Mock).mockImplementation(() =>
				jest.fn().mockResolvedValue('event list result'),
			);

			// Simulate agent invoking a tool before the LLM call fails
			(invokeAgent as jest.Mock).mockImplementation(async () => {
				await capturedToolFunc!({ query: 'today' });
				throw new Error('LLM API timeout');
			});

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'systemPrompt') return 'Test prompt';
				if (param === 'useMcpTools') return true;
				if (param === 'include') return 'all';
				return undefined;
			});

			const activityCapture: ActivityCapture = { input: '', output: [], activity: {} };
			const callback = configureActivityCallback(
				nodeContext,
				credentials,
				mcpTokenRef,
				mockAuthorization,
				activityCapture,
			);

			await expect(callback(mockTurnContext)).rejects.toThrow('LLM API timeout');

			// Logs from the tool call that ran before the failure must still be present
			expect(activityCapture.mcpToolLogs).toHaveLength(1);
			expect(activityCapture.mcpToolLogs![0]).toMatchObject({
				serverName: 'mcp_CalendarTools',
				toolName: 'mcp_CalendarTools_list_events',
				input: { query: 'today' },
				isError: false,
			});
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

			const activityCapture = { input: '', output: [], activity: {} };
			const callback = configureActivityCallback(
				nodeContext,
				credentials,
				mcpTokenRef,
				mockAuthorization,
				activityCapture,
			);
			await callback(contextWithoutRecipient as any);

			expect(invokeAgent).toHaveBeenCalled();
		});

		test('should send welcome message and skip LLM when input is addmember XML', async () => {
			const addmemberContext = {
				...mockTurnContext,
				activity: {
					...mockTurnContext.activity,
					text: '<addmember><eventtime>1775195471530</eventtime><initiator>28:app:abc</initiator><rosterVersion>123</rosterVersion><target>8:orgid:user-id</target></addmember>',
				},
			};

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return 'Hello! Welcome!';
				if (param === 'systemPrompt') return 'Test prompt';
				return undefined;
			});

			const activityCapture = { input: '', output: [], activity: {} };
			const callback = configureActivityCallback(
				nodeContext,
				credentials,
				mcpTokenRef,
				mockAuthorization,
				activityCapture,
			);
			await callback(addmemberContext);

			expect(addmemberContext.sendActivity).toHaveBeenCalledWith('Hello! Welcome!');
			expect(invokeAgent).not.toHaveBeenCalled();
		});

		test('should skip LLM and send empty string when addmember XML arrives but welcome message is empty', async () => {
			const addmemberContext = {
				...mockTurnContext,
				activity: {
					...mockTurnContext.activity,
					text: '<addmember><eventtime>1775195471530</eventtime></addmember>',
				},
			};

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return '';
				if (param === 'systemPrompt') return 'Test prompt';
				return undefined;
			});

			const activityCapture = { input: '', output: [], activity: {} };
			const callback = configureActivityCallback(
				nodeContext,
				credentials,
				mcpTokenRef,
				mockAuthorization,
				activityCapture,
			);
			await callback(addmemberContext);

			expect(invokeAgent).not.toHaveBeenCalled();
			expect(addmemberContext.sendActivity).toHaveBeenCalledWith('');
		});

		test('should send welcome message when addmember XML has leading whitespace', async () => {
			const addmemberContext = {
				...mockTurnContext,
				activity: {
					...mockTurnContext.activity,
					text: '  \n<addmember><eventtime>1775195471530</eventtime></addmember>',
				},
			};

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'options.welcomeMessage') return 'Hi there!';
				if (param === 'systemPrompt') return 'Test prompt';
				return undefined;
			});

			const activityCapture = { input: '', output: [], activity: {} };
			const callback = configureActivityCallback(
				nodeContext,
				credentials,
				mcpTokenRef,
				mockAuthorization,
				activityCapture,
			);
			await callback(addmemberContext);

			expect(addmemberContext.sendActivity).toHaveBeenCalledWith('Hi there!');
			expect(invokeAgent).not.toHaveBeenCalled();
		});
	});

	describe('microsoftMcpServers', () => {
		test('should export correct server options', () => {
			expect(microsoftMcpServers).toEqual([
				{ name: 'Admin 365', value: 'mcp_Admin365_GraphTools' },
				{ name: 'Admin Tools', value: 'mcp_AdminTools' },
				{ name: 'Calendar', value: 'mcp_CalendarTools' },
				{ name: 'DA Search', value: 'mcp_DASearch' },
				{ name: 'Excel', value: 'mcp_ExcelServer' },
				{ name: 'Knowledge', value: 'mcp_KnowledgeTools' },
				{ name: 'M365 Copilot', value: 'mcp_M365Copilot' },
				{ name: 'Mail', value: 'mcp_MailTools' },
				{ name: 'OneDrive', value: 'mcp_OneDriveRemoteServer' },
				{ name: 'OneDrive & SharePoint', value: 'mcp_ODSPRemoteServer' },
				{ name: 'Planner', value: 'mcp_PlannerServer' },
				{ name: 'SharePoint', value: 'mcp_SharePointRemoteServer' },
				{ name: 'SharePoint Lists', value: 'mcp_SharePointListsTools' },
				{ name: 'Task Personalization', value: 'mcp_TaskPersonalizationServer' },
				{ name: 'Teams', value: 'mcp_TeamsServer' },
				{ name: 'Teams Canary', value: 'mcp_TeamsCanaryServer' },
				{ name: 'Teams V1', value: 'mcp_TeamsServerV1' },
				{ name: 'Web Search', value: 'mcp_WebSearchTools' },
				{ name: 'Windows 365 Computer Use', value: 'mcp_W365ComputerUse' },
				{ name: 'Word', value: 'mcp_WordServer' },
			]);
		});

		test('should have correct number of server options', () => {
			expect(microsoftMcpServers).toHaveLength(20);
		});
	});

	describe('buildMcpToolName', () => {
		test('should combine server name and tool name with underscore', () => {
			expect(buildMcpToolName('mcp_CalendarTools', 'create_event')).toBe(
				'mcp_CalendarTools_create_event',
			);
		});

		test('should return combined name unchanged when within 64 chars', () => {
			const result = buildMcpToolName('server', 'tool');
			expect(result).toBe('server_tool');
			expect(result.length).toBeLessThanOrEqual(64);
		});

		test('should sanitize special characters in server name', () => {
			expect(buildMcpToolName('mcp-Calendar.Tools (v2)', 'create_event')).toBe(
				'mcp_Calendar_Tools__v2__create_event',
			);
		});

		test('should trim prefix when combined name exceeds 64 chars', () => {
			const serverName = 'mcp_AVeryLongServerNameThatIsFortyChars_'; // 40 chars
			const toolName = 'a_tool_name_that_is_thirty_chars__'; // 34 chars → total 75 > 64
			const result = buildMcpToolName(serverName, toolName);
			expect(result.length).toBe(64);
			expect(result.endsWith(`_${toolName}`)).toBe(true);
		});

		test('should return bare tool name when tool name alone fills 64 chars', () => {
			const toolName = 'a'.repeat(64);
			expect(buildMcpToolName('mcp_SomeServer', toolName)).toBe(toolName);
		});

		test('should return bare tool name when tool name exceeds 64 chars', () => {
			const toolName = 'a'.repeat(70);
			expect(buildMcpToolName('mcp_SomeServer', toolName)).toBe(toolName);
		});

		test('should handle exactly 64 char combined name without trimming', () => {
			// server(10) + '_' + tool(53) = 64
			const serverName = 'mcp_Server'; // 10 chars
			const toolName = 'a'.repeat(53); // 53 chars
			const result = buildMcpToolName(serverName, toolName);
			expect(result).toBe(`${serverName}_${toolName}`);
			expect(result.length).toBe(64);
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

	describe('disposeActivityResources', () => {
		let mockInvokeAgentScope: { dispose: jest.Mock };
		let mockMcpClient: { close: jest.Mock };
		let consoleErrorSpy: jest.SpyInstance;

		beforeEach(() => {
			mockInvokeAgentScope = { dispose: jest.fn() };
			mockMcpClient = { close: jest.fn().mockResolvedValue(undefined) };
			consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
		});

		afterEach(() => {
			consoleErrorSpy.mockRestore();
		});

		test('should dispose invokeAgentScope and close mcpClient', async () => {
			await disposeActivityResources(mockInvokeAgentScope as any, mockMcpClient);

			expect(mockInvokeAgentScope.dispose).toHaveBeenCalledTimes(1);
			expect(mockMcpClient.close).toHaveBeenCalledTimes(1);
		});

		test('should dispose invokeAgentScope when mcpClient is undefined', async () => {
			await disposeActivityResources(mockInvokeAgentScope as any, undefined);

			expect(mockInvokeAgentScope.dispose).toHaveBeenCalledTimes(1);
		});

		test('should not throw when invokeAgentScope.dispose throws', async () => {
			mockInvokeAgentScope.dispose.mockImplementation(() => {
				throw new Error('dispose failed');
			});

			await expect(
				disposeActivityResources(mockInvokeAgentScope as any, mockMcpClient),
			).resolves.not.toThrow();
			expect(mockMcpClient.close).toHaveBeenCalledTimes(1);
		});

		test('should not throw when mcpClient.close rejects', async () => {
			mockMcpClient.close.mockRejectedValue(new Error('close failed'));

			await expect(
				disposeActivityResources(mockInvokeAgentScope as any, mockMcpClient),
			).resolves.not.toThrow();
			expect(mockInvokeAgentScope.dispose).toHaveBeenCalledTimes(1);
		});

		test('should still close mcpClient when invokeAgentScope.dispose throws', async () => {
			mockInvokeAgentScope.dispose.mockImplementation(() => {
				throw new Error('dispose failed');
			});

			await disposeActivityResources(mockInvokeAgentScope as any, mockMcpClient);

			expect(mockMcpClient.close).toHaveBeenCalledTimes(1);
		});
	});
});
