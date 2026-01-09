import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	createMicrosoftAgentApplication,
	configureAdapterProcessCallback,
	type MicrosoftAgent365Credentials,
	type ActivityCapture,
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

jest.mock('@langchain/mcp-adapters', () => ({
	MultiServerMCPClient: jest.fn().mockImplementation(() => ({
		getTools: jest.fn().mockResolvedValue([]),
		close: jest.fn(),
	})),
}));

import { MemoryStorage, AgentApplication, CloudAdapter } from '@microsoft/agents-hosting';
import { invokeAgent } from '../langchain-utils';

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
				if (param === 'welcomeMessage') return 'Welcome to the agent!';
				if (param === 'agentDescription') return 'Test agent';
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
				if (param === 'welcomeMessage') return 'Welcome!';
				if (param === 'agentDescription') return 'Test agent';
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
				if (param === 'welcomeMessage') return 'Welcome!';
				if (param === 'agentDescription') return 'Test agent';
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
				if (param === 'welcomeMessage') return 'Welcome!';
				if (param === 'agentDescription') return 'Test agent';
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
				if (param === 'welcomeMessage') return 'Welcome!';
				if (param === 'agentDescription') return 'Test agent';
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
	});
});
