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
	InvokeAgentScope,
	BaggageBuilder,
	ObservabilityManager,
	type Builder,
	defaultObservabilityConfigurationProvider,
} from '@microsoft/agents-a365-observability';
import { type Activity, ActivityTypes } from '@microsoft/agents-activity';
import { invokeAgent } from './langchain-utils';
import {
	McpToolServerConfigurationService,
	defaultToolingConfigurationProvider,
	resolveTokenScopeForServer,
	Utility as MicrosoftToolingUtility,
	type MCPServerConfig,
	type ToolOptions,
} from '@microsoft/agents-a365-tooling';
import {
	AgenticAuthenticationService,
	Utility as MicrosoftRuntimeUtility,
} from '@microsoft/agents-a365-runtime';

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StructuredToolkit } from 'n8n-core';
import { proxyFetch } from '@n8n/ai-utilities';
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
const MICROSOFT_TOOL_OPTIONS: ToolOptions = { orchestratorName: 'LangChain' };

function hasAuthorizationHeader(headers: Record<string, string>) {
	return Object.keys(headers).some((headerName) => headerName.toLowerCase() === 'authorization');
}

function getAuthorizationHeader(headers: Record<string, string> | undefined) {
	if (!headers) return undefined;

	for (const [headerName, headerValue] of Object.entries(headers)) {
		if (headerName.toLowerCase() === 'authorization') {
			return headerValue;
		}
	}

	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringProperty(value: Record<string, unknown>, key: string) {
	const property = value[key];
	return typeof property === 'string' ? property : undefined;
}

function getHeadersProperty(value: Record<string, unknown>) {
	const headers = value.headers;
	if (!isRecord(headers)) return undefined;

	const result: Record<string, string> = {};
	for (const [headerName, headerValue] of Object.entries(headers)) {
		if (typeof headerValue === 'string') {
			result[headerName] = headerValue;
		}
	}

	return result;
}

function getRawMcpServers(payload: unknown) {
	if (Array.isArray(payload)) return payload;
	if (!isRecord(payload)) return undefined;

	const mcpServers = payload.mcpServers;
	if (Array.isArray(mcpServers)) return mcpServers;

	const value = payload.value;
	if (Array.isArray(value)) return value;

	return undefined;
}

function getMcpPlatformBaseUrl() {
	return defaultToolingConfigurationProvider.getConfiguration().mcpPlatformEndpoint;
}

function getToolingGatewayUrl(agenticAppId: string) {
	return `${getMcpPlatformBaseUrl()}/agents/v2/${agenticAppId}/mcpServers`;
}

function getMcpServerUrl(mcpServerName: string) {
	return `${getMcpPlatformBaseUrl()}/agents/servers/${mcpServerName}/`;
}

function normalizeMcpServerConfig(rawServer: unknown): MCPServerConfig | undefined {
	if (!isRecord(rawServer)) return undefined;

	const mcpServerName =
		getStringProperty(rawServer, 'mcpServerName') ??
		getStringProperty(rawServer, 'mcpServerUniqueName');
	if (!mcpServerName) return undefined;

	return {
		mcpServerName,
		url: getStringProperty(rawServer, 'url') ?? getMcpServerUrl(mcpServerName),
		headers: getHeadersProperty(rawServer),
		audience: getStringProperty(rawServer, 'audience'),
		scope: getStringProperty(rawServer, 'scope'),
		publisher: getStringProperty(rawServer, 'publisher'),
	};
}

async function getMcpServerConfigsWithoutAudienceTokens(
	turnContext: TurnContext,
	mcpAuthToken: string,
) {
	MicrosoftToolingUtility.ValidateAuthToken(mcpAuthToken);

	const agenticAppId = MicrosoftRuntimeUtility.ResolveAgentIdentity(turnContext, mcpAuthToken);
	const endpoint = getToolingGatewayUrl(agenticAppId);
	const response = await proxyFetch(endpoint, {
		headers: MicrosoftToolingUtility.GetToolRequestHeaders(
			mcpAuthToken,
			turnContext,
			MICROSOFT_TOOL_OPTIONS,
		),
	});

	if (!response.ok) {
		throw new Error(`Failed to read MCP servers from endpoint: ${response.status}`);
	}

	const payload: unknown = await response.json();
	const rawServers = getRawMcpServers(payload);
	if (!rawServers) {
		console.error('Microsoft MCP server discovery returned an unsupported payload shape', {
			payload,
		});
		throw new Error('Failed to read MCP servers from endpoint: response is not a server list');
	}

	const servers = rawServers
		.map((rawServer) => normalizeMcpServerConfig(rawServer))
		.filter((server): server is MCPServerConfig => server !== undefined);

	console.warn(`Microsoft MCP server discovery completed: ${servers.length} servers found`);

	return servers;
}

async function attachMcpServerAuthorization(
	server: MCPServerConfig,
	turnContext: TurnContext,
	authorization: Authorization,
	mcpAuthToken: string,
) {
	const sharedScope =
		defaultToolingConfigurationProvider.getConfiguration().mcpPlatformAuthenticationScope;
	const scope = resolveTokenScopeForServer(server, sharedScope);

	if (scope === sharedScope && hasAuthorizationHeader(server.headers ?? {})) return server;

	const token =
		scope === sharedScope
			? mcpAuthToken
			: await AgenticAuthenticationService.GetAgenticUserToken(
					authorization,
					'agentic',
					turnContext,
					[scope],
				);

	if (!token) {
		throw new Error(`Failed to obtain token for MCP server '${server.mcpServerName}'`);
	}

	return {
		...server,
		headers: {
			...server.headers,
			Authorization: `Bearer ${token}`,
		},
	};
}

function getMcpServerHeaders(
	server: MCPServerConfig,
	turnContext: TurnContext,
	mcpAuthToken: string,
	tenantId: string | undefined,
) {
	const headers: Record<string, string> = {
		...MicrosoftToolingUtility.GetToolRequestHeaders(
			mcpAuthToken,
			turnContext,
			MICROSOFT_TOOL_OPTIONS,
		),
	};

	for (const [headerName, headerValue] of Object.entries(server.headers ?? {})) {
		if (headerName.toLowerCase() !== 'authorization') {
			headers[headerName] = headerValue;
		}
	}

	const serverAuthorization = getAuthorizationHeader(server.headers);
	if (serverAuthorization) {
		headers.Authorization = serverAuthorization;
	} else if (mcpAuthToken && !hasAuthorizationHeader(headers)) {
		headers.Authorization = `Bearer ${mcpAuthToken}`;
	}

	if (tenantId) {
		headers[MS_TENANT_ID_HEADER] = tenantId;
	}

	return headers;
}

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

	let shouldAttachServerAuthorization = false;
	let servers: MCPServerConfig[];
	try {
		servers = await configService.listToolServers(
			turnContext,
			authorization,
			'agentic',
			mcpAuthToken,
			MICROSOFT_TOOL_OPTIONS,
		);
	} catch (error) {
		console.warn('Microsoft SDK listToolServers failed, falling back to direct discovery');
		servers = await getMcpServerConfigsWithoutAudienceTokens(turnContext, mcpAuthToken);
		shouldAttachServerAuthorization = true;
	}

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
		let authorizedServer = server;
		if (shouldAttachServerAuthorization) {
			try {
				authorizedServer = await attachMcpServerAuthorization(
					server,
					turnContext,
					authorization,
					mcpAuthToken,
				);
			} catch (error) {
				console.warn(`Skipping MCP server ${server.mcpServerName}: failed to authorize`, error);
				continue;
			}
		}

		const headers = getMcpServerHeaders(authorizedServer, turnContext, mcpAuthToken, tenantId);

		const clientResult = await connectMcpClient({
			serverTransport: 'httpStreamable', // Microsoft servers use HTTP
			endpointUrl: authorizedServer.url,
			headers,
			name: 'Microsoft-Agent-365',
			version: 1,
		});

		if (!clientResult.ok) {
			console.warn(
				`Skipping MCP server ${server.mcpServerName}: failed to connect`,
				clientResult.error,
			);
			continue;
		}

		const client = clientResult.result;
		clients.push(client);

		let mcpTools;
		try {
			mcpTools = await getAllTools(client);
		} catch (error) {
			console.warn(`Skipping MCP server ${server.mcpServerName}: failed to list tools`, error);
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
		const tenantDetails = {
			tenantId: turnContext.activity.recipient?.tenantId ?? tenantId ?? '',
		};
		const conversationId = turnContext.activity.conversation?.id;
		const inputText = turnContext.activity.text || '';

		const baggageScope = new BaggageBuilder()
			.tenantId(tenantDetails.tenantId)
			.agentId(agentId)
			.agentName(agentName)
			.conversationId(conversationId)
			.build();

		await baggageScope.run(async () => {
			const request = {
				content: inputText || 'Unknown text',
				sessionId: conversationId,
				conversationId,
			};

			const invokeScopeDetails = {};

			const agentDetails = {
				agentId,
				agentName,
				tenantId: tenantDetails.tenantId,
			};

			const invokeAgentScope = InvokeAgentScope.start(request, invokeScopeDetails, agentDetails);

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
						console.error('Error retrieving MCP tools:', error);
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
