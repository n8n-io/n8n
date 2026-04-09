import type {
	AuthConfiguration,
	Authorization,
	DefaultConversationState,
	DefaultUserState,
	TurnContext,
	TurnState,
} from '@microsoft/agents-hosting';

import { MemoryStorage, AgentApplication, CloudAdapter } from '@microsoft/agents-hosting';
import {
	NodeOperationError,
	type IDataObject,
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
	defaultObservabilityConfigurationProvider,
} from '@microsoft/agents-a365-observability';
import { type Activity, ActivityTypes } from '@microsoft/agents-activity';
import { v4 as uuid } from 'uuid';
import { invokeAgent } from './langchain-utils';
import {
	McpToolServerConfigurationService,
	defaultToolingConfigurationProvider,
} from '@microsoft/agents-a365-tooling';

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StructuredToolkit } from 'n8n-core';
import { connectMcpClient, getAllTools } from '../../mcp/shared/utils';
import {
	buildMcpToolName,
	createCallTool,
	mcpToolToDynamicTool,
} from '../../mcp/McpClientTool/utils';
export { buildMcpToolName };

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

export type McpToolCallLog = {
	serverName: string;
	toolName: string;
	input: IDataObject;
	output: unknown;
	isError: boolean;
	durationMs: number;
	timestamp: string;
};

export type ActivityCapture = {
	input: string;
	output: string[];
	activity: ActivityInfo;
	mcpToolLogs?: McpToolCallLog[];
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
	authorization: Authorization,
	mcpAuthToken: string,
	selectedTools: string[] | undefined,
) {
	const configService: McpToolServerConfigurationService = new McpToolServerConfigurationService();

	let servers = await configService.listToolServers(
		turnContext,
		authorization,
		'agentic',
		mcpAuthToken,
	);

	if (servers.length === 0) return undefined;

	if (selectedTools?.length) {
		servers = servers.filter((server) => selectedTools.includes(server.mcpServerName));
	}

	const tenantId =
		turnContext.activity.recipient?.tenantId || turnContext.activity?.channelData?.tenant?.id;

	const toolkits: StructuredToolkit[] = [];
	const clients: Client[] = [];
	const mcpToolCallLogs: McpToolCallLog[] = [];
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

		let mcpTools;
		try {
			mcpTools = await getAllTools(client);
		} catch (error) {
			console.error(`Failed to get tools from MCP server ${server.mcpServerName}:`, error);
			continue;
		}

		const serverName = server.mcpServerName;
		const serverTools = mcpTools.map((tool) => {
			const prefixedName = buildMcpToolName(serverName, tool.name);

			const callToolWithLogging = async (args: IDataObject) => {
				let isError = false;
				const callTool = createCallTool(tool.name, client, timeout, (errorMessage) => {
					console.error(`Tool "${tool.name}" execution error:`, errorMessage);
					isError = true;
				});
				const start = Date.now();
				const result = await callTool(args);
				mcpToolCallLogs.push({
					serverName,
					toolName: prefixedName,
					input: args,
					output: result,
					isError,
					durationMs: Date.now() - start,
					timestamp: new Date().toISOString(),
				});
				return result;
			};

			return mcpToolToDynamicTool({ ...tool, name: prefixedName }, callToolWithLogging);
		});

		if (serverTools.length > 0) {
			toolkits.push(new StructuredToolkit(serverTools));
		}
	}

	if (toolkits.length === 0) return undefined;

	return {
		toolkits,
		logs: mcpToolCallLogs,
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
	authorization: Authorization,
	activityCapture: ActivityCapture,
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

				let addMemberMessage = false;
				if (inputText.trimStart().startsWith('<addmember>')) {
					addMemberMessage = true;
				}

				let mcpClient = undefined;
				let microsoftMcpToolkits: StructuredToolkit[] | undefined = undefined;
				let mcpLogs: McpToolCallLog[] | undefined = undefined;
				if (!addMemberMessage && mcpTokenRef.token) {
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
								authorization,
								mcpTokenRef.token,
								selectedTools,
							);

							mcpClient = result?.client;
							microsoftMcpToolkits = result?.toolkits;
							mcpLogs = result?.logs;
						}
					} catch (error) {
						console.log('Error retrieving MCP tools');
					}
				}

				try {
					let response = '';
					if (addMemberMessage) {
						response = nodeContext.getNodeParameter('options.welcomeMessage', '') as string;
					} else {
						response = await invokeAgent(
							nodeContext,
							inputText,
							systemPrompt,
							{
								configurable: { thread_id: turnContext.activity.conversation!.id },
							},
							microsoftMcpToolkits,
						);
					}

					invokeAgentScope.recordOutputMessages([`n8n Agent Response: ${response}`]);

					await turnContext.sendActivity(response);
				} finally {
					if (mcpLogs?.length) {
						activityCapture.mcpToolLogs = mcpLogs;
					}
					await disposeActivityResources(invokeAgentScope, mcpClient);
				}
			});
		});
	};
};

export async function disposeActivityResources(
	invokeAgentScope: InvokeAgentScope,
	mcpClient: NonNullable<Awaited<ReturnType<typeof getMicrosoftMcpTools>>>['client'] | undefined,
): Promise<void> {
	try {
		invokeAgentScope.dispose();
	} catch (error) {
		console.error('Failed to dispose invokeAgentScope:', error);
	}
	if (mcpClient) {
		try {
			await mcpClient.close();
		} catch (error) {
			console.error('Failed to close MCP client connections:', error);
		}
	}
}

export function configureAdapterProcessCallback(
	nodeContext: IWebhookFunctions,
	agent: AgentApplication<TurnState<DefaultConversationState, DefaultUserState>>,
	credentials: MicrosoftAgent365Credentials,
	activityCapture: ActivityCapture,
) {
	return async (turnContext: TurnContext) => {
		let observability: ReturnType<typeof ObservabilityManager.configure> | undefined;

		if (isMicrosoftObservabilityEnabled()) {
			const observabilityScopes = [
				...defaultObservabilityConfigurationProvider.getConfiguration()
					.observabilityAuthenticationScopes,
			];
			const { token: aauToken } = await agent.authorization.exchangeToken(
				turnContext,
				observabilityScopes,
				'agentic',
			);

			observability = ObservabilityManager.configure((builder: Builder) =>
				builder
					.withService('n8n-microsoft-agent-365')
					.withTokenResolver((_agentId: string, _tenantId: string) => aauToken || ''),
			);

			observability.start();
		}

		const mcpTokenRef = { token: undefined as string | undefined };

		try {
			turnContext.turnState.set('AgenticAuthorization/agentic', undefined);
			const tokenResult = await agent.authorization.exchangeToken(turnContext, 'agentic', {
				scopes: [
					defaultToolingConfigurationProvider.getConfiguration().mcpPlatformAuthenticationScope,
				],
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

			const onActivity = configureActivityCallback(
				nodeContext,
				credentials,
				mcpTokenRef,
				agent.authorization,
				activityCapture,
			);
			agent.onActivity(ActivityTypes.Message, onActivity, ['agentic']);

			await agent.run(turnContext);
		} catch (error) {
			throw new NodeOperationError(nodeContext.getNode(), error);
		} finally {
			if (observability) {
				try {
					const OBSERVABILITY_SHUTDOWN_TIMEOUT_MS = 5000;
					await Promise.race([
						observability.shutdown(),
						new Promise<never>((_, reject) =>
							setTimeout(
								() => reject(new Error('Observability shutdown timed out')),
								OBSERVABILITY_SHUTDOWN_TIMEOUT_MS,
							),
						),
					]);
				} catch (error) {
					// Backend unreachable or export timed out — not a code error
					console.warn('Failed to shut down observability:', error);
				}
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
