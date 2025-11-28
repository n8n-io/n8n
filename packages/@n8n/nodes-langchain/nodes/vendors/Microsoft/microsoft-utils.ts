import type {
	AuthConfiguration,
	DefaultConversationState,
	DefaultUserState,
	TurnContext,
	TurnState,
	CloudAdapter,
} from '@microsoft/agents-hosting';

import { MemoryStorage, AgentApplication } from '@microsoft/agents-hosting';
import { NodeOperationError, type IWebhookFunctions } from 'n8n-workflow';

import {
	type AgentDetails,
	ExecutionType,
	type InvokeAgentDetails,
	InvokeAgentScope,
	type TenantDetails,
	BaggageBuilder,
	ObservabilityManager,
	type Builder,
} from '@microsoft/agents-a365-observability';
import {
	getObservabilityAuthenticationScope,
	Utility as RuntimeUtility,
} from '@microsoft/agents-a365-runtime';
import { type Activity, ActivityTypes } from '@microsoft/agents-activity';
import { v4 as uuid } from 'uuid';
import { invokeAgent } from './langchain-utils';

import { McpToolServerConfigurationService, Utility } from '@microsoft/agents-a365-tooling';

import type { ClientConfig, Connection } from '@langchain/mcp-adapters';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';

export function createMicrosoftAgentApplication(
	agentNode: IWebhookFunctions,
	adapter: CloudAdapter,
) {
	const storage = new MemoryStorage();

	const agentApplication: AgentApplication<TurnState> = new AgentApplication<TurnState>({
		adapter,
		storage,
		authorization: {
			agentic: {
				type: 'agentic',
				scopes: ['https://graph.microsoft.com/.default'],
			},
		},
	});

	const welcomeMessage = agentNode.getNodeParameter(
		'welcomeMessage',
		"Hello! I'm here to help you!",
	) as string;

	agentApplication.onConversationUpdate('membersAdded', async (context) => {
		await context.sendActivity(welcomeMessage);
	});

	return agentApplication;
}

async function getMicrosoftMcpTools(turnContext: TurnContext, authToken: string) {
	const configService: McpToolServerConfigurationService = new McpToolServerConfigurationService();

	Utility.ValidateAuthToken(authToken);

	// @ts-expect-error Type mismatch due to multiple versions of @microsoft/agents-hosting
	const agenticAppId = RuntimeUtility.ResolveAgentIdentity(turnContext, authToken);
	const servers = await configService.listToolServers(agenticAppId, authToken);
	const mcpServers: Record<string, Connection> = {};

	const tenantId =
		(turnContext.activity.recipient as any)?.tenantId ||
		(turnContext.activity as any)?.channelData?.tenant?.id;

	for (const server of servers) {
		const headers: Record<string, string> = {};
		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken}`;
		}

		if (tenantId) {
			headers['x-ms-tenant-id'] = tenantId;
		}

		mcpServers[server.mcpServerName] = {
			type: 'http',
			url: server.url,
			headers,
		} as Connection;
	}

	if (Object.keys(mcpServers).length === 0) return [];

	const mcpClientConfig = { mcpServers } as ClientConfig;

	const multiServerMcpClient = new MultiServerMCPClient(mcpClientConfig);
	const mcpTools = await multiServerMcpClient.getTools();

	return mcpTools;
}

const configureActivityCallback = (
	agentNode: IWebhookFunctions,
	credentials: { clientId?: string; tenantId?: string },
	mcpTokenRef: { token: string | undefined },
) => {
	const agentDescription = agentNode.getNodeParameter('agentDescription') as string;
	const { clientId, tenantId } = credentials;

	return async (turnContext: TurnContext) => {
		const mcpAuthToken = mcpTokenRef.token;

		const agentInfo: AgentDetails = {
			agentId: (turnContext.activity.recipient as any)?.agenticAppId ?? clientId,
			agentName: (turnContext.activity.recipient as any)?.name ?? 'Microsoft Agent',
		};

		const tenantDetails: TenantDetails = {
			tenantId: (turnContext.activity.recipient as any)?.tenantId ?? tenantId ?? '',
		};

		const correlationId = uuid();

		const baggageScope = new BaggageBuilder()
			.tenantId(tenantDetails.tenantId)
			.agentId(agentInfo.agentId)
			.correlationId(correlationId)
			.agentName(agentInfo.agentName)
			.conversationId(turnContext.activity.conversation?.id)
			.build();

		await baggageScope.run(async () => {
			const invokeAgentDetails: InvokeAgentDetails = {
				agentId: agentInfo.agentId,
				agentName: agentInfo.agentName,
				conversationId: turnContext.activity.conversation?.id,
				request: {
					content: turnContext.activity.text || 'Unknown text',
					executionType: ExecutionType.HumanToAgent,
					sessionId: turnContext.activity.conversation?.id,
				},
			};

			const invokeAgentScope = InvokeAgentScope.start(invokeAgentDetails, tenantDetails);

			await invokeAgentScope.withActiveSpanAsync(async () => {
				invokeAgentScope.recordInputMessages([turnContext.activity.text ?? 'Unknown text']);

				let microsoftMcpTools = undefined;
				if (mcpAuthToken) {
					try {
						microsoftMcpTools = await getMicrosoftMcpTools(turnContext, mcpAuthToken);
					} catch (error) {
						console.log('Error retrieving MCP tools');
					}
				}

				try {
					const response = await invokeAgent(
						agentNode,
						turnContext.activity.text || '',
						agentDescription,
						{
							configurable: { thread_id: turnContext.activity.conversation!.id },
						},
						microsoftMcpTools,
					);

					invokeAgentScope.recordOutputMessages([`n8n Agent Response: ${response}`]);

					await turnContext.sendActivity(response);
				} finally {
					invokeAgentScope.dispose();
				}
			});
		});
	};
};

export function configureAdapterProcessCallback(
	agentNode: IWebhookFunctions,
	agent: AgentApplication<TurnState<DefaultConversationState, DefaultUserState>>,
	authConfig: AuthConfiguration,
	trackData: {
		inputText: string;
		activities: string[];
	},
) {
	return async (turnContext: TurnContext) => {
		const { token: aauToken } = await agent.authorization.exchangeToken(
			turnContext,
			getObservabilityAuthenticationScope(),
			'agentic',
		);

		const observability = ObservabilityManager.configure((builder: Builder) =>
			builder
				.withService('TypeScript Sample Agent', '1.0.0')
				.withTokenResolver((_agentId: string, _tenantId: string) => aauToken || ''),
		);

		observability.start();

		const mcpTokenRef = { token: undefined as string | undefined };

		try {
			const tokenResult = await agent.authorization.getToken(turnContext, 'agentic');
			mcpTokenRef.token = tokenResult.token;
		} catch (error) {
			console.error('Error getting MCP token');
		}

		try {
			const originalSendActivity = turnContext.sendActivity.bind(turnContext);
			trackData.inputText = turnContext.activity.text || '';
			const sendActivityWrapper = async (activityOrText: string | Activity) => {
				if (typeof activityOrText === 'string') {
					trackData.activities.push(activityOrText);
				} else if (activityOrText.text) {
					trackData.activities.push(activityOrText.text);
				}
				return await originalSendActivity(activityOrText);
			};

			turnContext.sendActivity = sendActivityWrapper;

			const onActivity = configureActivityCallback(agentNode, authConfig, mcpTokenRef);
			agent.onActivity(ActivityTypes.Message, onActivity, ['agentic']);

			await agent.run(turnContext);
		} catch (error) {
			throw new NodeOperationError(agentNode.getNode(), error);
		} finally {
			await observability.shutdown();
		}
	};
}

export const createAuthConfig = (credentials: {
	clientId: string;
	tenantId: string;
	clientSecret: string;
}) => {
	const { clientId, tenantId, clientSecret } = credentials;
	const connections: Map<string, AuthConfiguration> = new Map();
	connections.set('serviceConnection', {
		clientId,
		clientSecret,
		tenantId,
		authority: 'https://login.microsoftonline.com',
		issuers: [
			'https://api.botframework.com',
			`https://sts.windows.net/${tenantId}/`,
			`https://login.microsoftonline.com/${tenantId}/v2.0`,
		],
	});

	const config = {
		clientId,
		clientSecret,
		tenantId,
		authority: 'https://login.microsoftonline.com',
		issuers: [
			'https://api.botframework.com',
			`https://sts.windows.net/${tenantId}/`,
			`https://login.microsoftonline.com/${tenantId}/v2.0`,
		],
		connections,
		connectionsMap: [
			{
				connection: 'serviceConnection',
				serviceUrl: '*',
			},
		],
	};

	return config;
};
