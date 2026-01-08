import type {
	AuthConfiguration,
	DefaultConversationState,
	DefaultUserState,
	TurnContext,
	TurnState,
} from '@microsoft/agents-hosting';

import { MemoryStorage, AgentApplication, CloudAdapter } from '@microsoft/agents-hosting';
import { NodeOperationError, type IWebhookFunctions } from 'n8n-workflow';

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

import type { ClientConfig, Connection } from '@langchain/mcp-adapters';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { convertJsonSchemaToZod } from '../../../utils/schemaParsing';
import { z } from 'zod';

export type MicrosoftAgent365Credentials = {
	clientId: string;
	tenantId: string;
	clientSecret: string;
};

export type ActivityCapture = {
	input: string;
	output: string[];
};

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

async function getMicrosoftMcpTools(turnContext: TurnContext, mcpAuthToken: string) {
	const configService: McpToolServerConfigurationService = new McpToolServerConfigurationService();

	Utility.ValidateAuthToken(mcpAuthToken);

	const agenticAppId = RuntimeUtility.ResolveAgentIdentity(turnContext, mcpAuthToken);
	const servers = await configService.listToolServers(agenticAppId, mcpAuthToken);
	const mcpServers: Record<string, Connection> = {};

	const tenantId =
		turnContext.activity.recipient?.tenantId || turnContext.activity?.channelData?.tenant?.id;

	for (const server of servers) {
		const headers: Record<string, string> = {};
		if (mcpAuthToken) {
			headers['Authorization'] = `Bearer ${mcpAuthToken}`;
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

	if (Object.keys(mcpServers).length === 0) return undefined;

	const mcpClientConfig = { mcpServers } as ClientConfig;

	const client = new MultiServerMCPClient(mcpClientConfig);
	const rawTools = await client.getTools();

	// Convert tools from JSON Schema to Zod schema format
	// The MultiServerMCPClient returns tools with JSON Schema, but LangChain agents
	// require DynamicStructuredTool instances with Zod schemas for proper validation
	const tools = rawTools.map((rawTool: any) => {
		const inputSchema = rawTool.lc_kwargs?.schema || rawTool.schema;

		if (!inputSchema) {
			// Tool has no schema, return as-is
			return rawTool;
		}

		// Check if already a Zod schema (has _def property)
		if (inputSchema && typeof inputSchema === 'object' && '_def' in inputSchema) {
			return rawTool;
		}

		// Convert JSON Schema to Zod schema
		const rawSchema = convertJsonSchemaToZod(inputSchema);

		// Ensure we always have an object schema for structured tools
		const objectSchema =
			rawSchema instanceof z.ZodObject ? rawSchema : z.object({ value: rawSchema });

		// Create a new DynamicStructuredTool with the converted Zod schema
		return new DynamicStructuredTool({
			name: rawTool.name,
			description: rawTool.description ?? '',
			schema: objectSchema,
			func: rawTool.func || rawTool.lc_kwargs?.func,
		});
	});

	return { tools, client };
}

const configureActivityCallback = (
	nodeContext: IWebhookFunctions,
	credentials: MicrosoftAgent365Credentials,
	mcpTokenRef: { token: string | undefined },
) => {
	const agentDescription = nodeContext.getNodeParameter('agentDescription') as string;
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
						const result = await getMicrosoftMcpTools(turnContext, mcpTokenRef.token);
						mcpClient = result?.client;
						microsoftMcpTools = result?.tools;
					} catch (error) {
						console.log('Error retrieving MCP tools');
					}
				}

				try {
					const response = await invokeAgent(
						nodeContext,
						inputText,
						agentDescription,
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

		const observability = ObservabilityManager.configure((builder: Builder) =>
			builder
				.withService('TypeScript Sample Agent', '1.0.0')
				.withTokenResolver((_agentId: string, _tenantId: string) => aauToken || ''),
		);

		observability.start();

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
				'welcomeMessage',
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
			await observability.shutdown();
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

/**
 * Helper function to ensure observability environment variables are set
 * Sets ENABLE_OBSERVABILITY and ENABLE_A365_OBSERVABILITY_EXPORTER to 'true' if not already set
 */
export function setObservabilityDefaultEnv(): void {
	if (process.env.ENABLE_OBSERVABILITY === undefined || process.env.ENABLE_OBSERVABILITY === '') {
		process.env.ENABLE_OBSERVABILITY = 'true';
	}
	if (
		process.env.ENABLE_A365_OBSERVABILITY_EXPORTER === undefined ||
		process.env.ENABLE_A365_OBSERVABILITY_EXPORTER === ''
	) {
		process.env.ENABLE_A365_OBSERVABILITY_EXPORTER = 'true';
	}
}
