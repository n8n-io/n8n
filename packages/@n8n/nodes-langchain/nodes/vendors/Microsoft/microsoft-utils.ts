import type {
	AuthConfiguration,
	DefaultConversationState,
	DefaultUserState,
	TurnContext,
	TurnState,
} from '@microsoft/agents-hosting';

import { MemoryStorage, AgentApplication, CloudAdapter } from '@microsoft/agents-hosting';
import {
	NodeOperationError,
	type IWebhookFunctions,
	type INodePropertyOptions,
} from 'n8n-workflow';

import {
	ExecutionType,
	type InvokeAgentDetails,
	InvokeAgentScope,
	type TenantDetails,
	BaggageBuilder,
	ObservabilityManager,
	type Builder,
} from '@microsoft/agents-a365-observability';
import {
	getMcpPlatformAuthenticationScope,
	getObservabilityAuthenticationScope,
	Utility as RuntimeUtility,
} from '@microsoft/agents-a365-runtime';
import { type Activity, ActivityTypes } from '@microsoft/agents-activity';
import { v4 as uuid } from 'uuid';
import { invokeAgent } from './langchain-utils';

import { McpToolServerConfigurationService, Utility } from '@microsoft/agents-a365-tooling';

import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { connectMcpClient, getAllTools } from '../../mcp/shared/utils';
import { createCallTool, mcpToolToDynamicTool } from '../../mcp/McpClientTool/utils';

export type MicrosoftAgent365Credentials = {
	clientId: string;
	tenantId: string;
	clientSecret: string;
};

export type ActivityInfo = {
	id?: string;
	type?: string;
	channelId?: string;
	conversationId?: string;
	from?: {
		id?: string;
		name?: string;
	};
	recipient?: {
		id?: string;
		name?: string;
	};
	timestamp?: string;
	locale?: string;
};

export type ActivityCapture = {
	input: string;
	output: string[];
	activity: ActivityInfo;
};

export function extractActivityInfo(activity: Activity): ActivityInfo {
	return {
		id: activity.id,
		type: activity.type,
		channelId: activity.channelId,
		conversationId: activity.conversation?.id,
		from: activity.from
			? {
					id: activity.from.id,
					name: activity.from.name,
				}
			: undefined,
		recipient: activity.recipient
			? {
					id: activity.recipient.id,
					name: activity.recipient.name,
				}
			: undefined,
		timestamp:
			activity.timestamp instanceof Date ? activity.timestamp.toISOString() : activity.timestamp,
		locale: activity.locale,
	};
}

export const microsoftMcpServers: INodePropertyOptions[] = [
	{ name: 'Calendar', value: 'mcp_CalendarTools' },
	{ name: 'Mail', value: 'mcp_MailTools' },
	{ name: 'Me', value: 'mcp_MeServer' },
	{ name: 'OneDrive & SharePoint', value: 'mcp_ODSPRemoteServer' },
	{ name: 'SharePoint Lists', value: 'mcp_SharePointListsTools' },
	{ name: 'Teams', value: 'mcp_TeamsServer' },
	{ name: 'Teams Canary', value: 'mcp_TeamsCanaryServer' },
	{ name: 'Word', value: 'mcp_WordServer' },
];

const MS_TENANT_ID_HEADER = 'x-ms-tenant-id';

function isMicrosoftObservabilityEnabled(): boolean {
	return (
		process.env.ENABLE_OBSERVABILITY === 'true' &&
		process.env.ENABLE_A365_OBSERVABILITY_EXPORTER === 'true'
	);
}

export function createMicrosoftAgentApplication(credentials: MicrosoftAgent365Credentials) {
	const authConfig: AuthConfiguration = createAuthConfig(credentials);

	const adapter = new CloudAdapter(authConfig);
	const storage = new MemoryStorage();

	const agent: AgentApplication<TurnState> = new AgentApplication<TurnState>({
		adapter,
		storage,
		authorization: {
			agentic: {
				type: 'agentic',
				scopes: ['https://graph.microsoft.com/.default'],
			},
		},
	});

	return agent;
}

export async function getMicrosoftMcpTools(
	turnContext: TurnContext,
	mcpAuthToken: string,
	selectedTools: string[] | undefined,
) {
	const configService: McpToolServerConfigurationService = new McpToolServerConfigurationService();

	Utility.ValidateAuthToken(mcpAuthToken);

	const agenticAppId = RuntimeUtility.ResolveAgentIdentity(turnContext, mcpAuthToken);
	let servers = await configService.listToolServers(agenticAppId, mcpAuthToken);

	if (servers.length === 0) return undefined;

	if (selectedTools?.length) {
		servers = servers.filter((server) => selectedTools.includes(server.mcpServerName));
	}

	const tenantId =
		turnContext.activity.recipient?.tenantId || turnContext.activity?.channelData?.tenant?.id;

	const tools: DynamicStructuredTool[] = [];
	const clients: Client[] = [];
	const timeout = 60000;

	for (const server of servers) {
		const headers: Record<string, string> = {};
		if (mcpAuthToken) {
			headers['Authorization'] = `Bearer ${mcpAuthToken}`;
		}
		if (tenantId) {
			headers[MS_TENANT_ID_HEADER] = tenantId;
		}

		const clientResult = await connectMcpClient({
			serverTransport: 'httpStreamable', // Microsoft servers use HTTP
			endpointUrl: server.url,
			headers,
			name: 'Microsoft-Agent-365',
			version: 1,
		});

		if (!clientResult.ok) {
			console.error(`Failed to connect to MCP server ${server.mcpServerName}:`, clientResult.error);
			continue;
		}

		const client = clientResult.result;
		clients.push(client);

		const mcpTools = await getAllTools(client);

		for (const tool of mcpTools) {
			const callToolFunc = createCallTool(tool.name, client, timeout, (errorMessage) => {
				console.error(`Tool "${tool.name}" execution error:`, errorMessage);
			});

			const dynamicTool = mcpToolToDynamicTool(tool, callToolFunc);
			tools.push(dynamicTool);
		}
	}

	if (tools.length === 0) return undefined;

	return {
		tools,
		client: {
			async close() {
				await Promise.all(clients.map(async (c) => await c.close()));
			},
		},
	};
}

export const configureActivityCallback = (
	nodeContext: IWebhookFunctions,
	credentials: MicrosoftAgent365Credentials,
	mcpTokenRef: { token: string | undefined },
) => {
	const systemPrompt = nodeContext.getNodeParameter('systemPrompt') as string;
	const { clientId, tenantId } = credentials;

	return async (turnContext: TurnContext) => {
		const agentId = turnContext.activity.recipient?.agenticAppId ?? clientId;
		const agentName = turnContext.activity.recipient?.name ?? 'Microsoft Agent 365';
		const tenantDetails: TenantDetails = {
			tenantId: turnContext.activity.recipient?.tenantId ?? tenantId ?? '',
		};
		const conversationId = turnContext.activity.conversation?.id;
		const inputText = turnContext.activity.text || '';

		const baggageScope = new BaggageBuilder()
			.tenantId(tenantDetails.tenantId)
			.agentId(agentId)
			.correlationId(uuid())
			.agentName(agentName)
			.conversationId(conversationId)
			.build();

		await baggageScope.run(async () => {
			const invokeAgentDetails: InvokeAgentDetails = {
				agentId,
				agentName,
				conversationId,
				request: {
					content: inputText || 'Unknown text',
					executionType: ExecutionType.HumanToAgent,
					sessionId: conversationId,
				},
			};

			const invokeAgentScope = InvokeAgentScope.start(invokeAgentDetails, tenantDetails);

			await invokeAgentScope.withActiveSpanAsync(async () => {
				invokeAgentScope.recordInputMessages([inputText || 'Unknown text']);

				let microsoftMcpTools = undefined;
				let mcpClient = undefined;
				if (mcpTokenRef.token) {
					try {
						const useMcpTools = nodeContext.getNodeParameter('useMcpTools', false) as boolean;

						if (useMcpTools) {
							let selectedTools: string[] | undefined = undefined;
							const include = nodeContext.getNodeParameter('include', 'all') as 'all' | 'selected';

							if (include === 'selected') {
								const selected = nodeContext.getNodeParameter('includeTools', []) as string[];
								selectedTools = microsoftMcpServers
									.filter((server) => selected.includes(server.value as string))
									.map((server) => server.value as string);
							}

							const result = await getMicrosoftMcpTools(
								turnContext,
								mcpTokenRef.token,
								selectedTools,
							);

							mcpClient = result?.client;
							microsoftMcpTools = result?.tools;
						}
					} catch (error) {
						console.log('Error retrieving MCP tools');
					}
				}

				try {
					const response = await invokeAgent(
						nodeContext,
						inputText,
						systemPrompt,
						{
							configurable: { thread_id: turnContext.activity.conversation!.id },
						},
						microsoftMcpTools,
					);

					invokeAgentScope.recordOutputMessages([`n8n Agent Response: ${response}`]);

					await turnContext.sendActivity(response);
				} finally {
					if (mcpClient) await mcpClient.close();
					invokeAgentScope.dispose();
				}
			});
		});
	};
};

export function configureAdapterProcessCallback(
	nodeContext: IWebhookFunctions,
	agent: AgentApplication<TurnState<DefaultConversationState, DefaultUserState>>,
	credentials: MicrosoftAgent365Credentials,
	activityCapture: ActivityCapture,
) {
	return async (turnContext: TurnContext) => {
		const { token: aauToken } = await agent.authorization.exchangeToken(
			turnContext,
			getObservabilityAuthenticationScope(),
			'agentic',
		);

		let observability: ReturnType<typeof ObservabilityManager.configure> | undefined;

		if (isMicrosoftObservabilityEnabled()) {
			observability = ObservabilityManager.configure((builder: Builder) =>
				builder
					.withService('TypeScript Sample Agent', '1.0.0')
					.withTokenResolver((_agentId: string, _tenantId: string) => aauToken || ''),
			);

			observability.start();
		}

		const mcpTokenRef = { token: undefined as string | undefined };

		try {
			turnContext.turnState.set('AgenticAuthorization/agentic', undefined);
			const tokenResult = await agent.authorization.exchangeToken(turnContext, 'agentic', {
				scopes: [getMcpPlatformAuthenticationScope()],
			});
			mcpTokenRef.token = tokenResult.token;
		} catch (error) {
			console.error('Error getting MCP token');
		}

		try {
			const originalSendActivity = turnContext.sendActivity.bind(turnContext);
			activityCapture.input = turnContext.activity.text || '';
			activityCapture.activity = extractActivityInfo(turnContext.activity);

			const sendActivityWrapper = async (activityOrText: string | Activity) => {
				if (typeof activityOrText === 'string') {
					activityCapture.output.push(activityOrText);
				} else if (activityOrText.text) {
					activityCapture.output.push(activityOrText.text);
				}
				return await originalSendActivity(activityOrText);
			};

			turnContext.sendActivity = sendActivityWrapper;

			const welcomeMessage = nodeContext.getNodeParameter(
				'options.welcomeMessage',
				"Hello! I'm here to help you!",
			) as string;

			agent.onConversationUpdate('membersAdded', async (context) => {
				await context.sendActivity(welcomeMessage);
			});

			const onActivity = configureActivityCallback(nodeContext, credentials, mcpTokenRef);
			agent.onActivity(ActivityTypes.Message, onActivity, ['agentic']);

			await agent.run(turnContext);
		} catch (error) {
			throw new NodeOperationError(nodeContext.getNode(), error);
		} finally {
			if (observability) {
				await observability.shutdown();
			}
		}
	};
}

const createAuthConfig = (credentials: MicrosoftAgent365Credentials) => {
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
