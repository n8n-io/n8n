import { assert, jsonParse, NodeOperationError, type IWebhookFunctions } from 'n8n-workflow';

import {
	getChatModel,
	getOptionalMemory,
	getTools,
	preparePrompt,
} from '../../agents/Agent/agents/ToolsAgent/common';

import { McpToolServerConfigurationService, Utility } from '@microsoft/agents-a365-tooling';
import { Utility as RuntimeUtility } from '@microsoft/agents-a365-runtime';

import type { TurnContext, AuthConfiguration } from '@microsoft/agents-hosting';

import type { ClientConfig, Connection } from '@langchain/mcp-adapters';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';

import {
	getOptionalOutputParser,
	type N8nOutputParser,
} from '../../../utils/output_parsers/N8nOutputParser';
import type { BaseMessagePromptTemplateLike, ChatPromptTemplate } from '@langchain/core/prompts';
import { SYSTEM_MESSAGE } from '../../agents/Agent/agents/ConversationalAgent/prompt';
import { createAgentExecutor } from '../../agents/Agent/agents/ToolsAgent/V2/execute';
import type { RunnableConfig } from '@langchain/core/runnables';

async function prepareMessages(options: {
	systemMessage?: string;
	outputParser?: N8nOutputParser;
}): Promise<BaseMessagePromptTemplateLike[]> {
	const messages: BaseMessagePromptTemplateLike[] = [];

	if (options.systemMessage) {
		messages.push([
			'system',
			`{system_message}${options.outputParser ? '\n\n{formatting_instructions}' : ''}`,
		]);
	} else if (options.outputParser) {
		messages.push(['system', '{formatting_instructions}']);
	}

	messages.push([
		'system',
		`{system_message}${options.outputParser ? '\n\n{formatting_instructions}' : ''}`,
	]);

	messages.push(['placeholder', '{chat_history}'], ['human', '{input}']);

	messages.push(['placeholder', '{agent_scratchpad}']);
	return messages;
}

async function getMicrosoftMcpTools(turnContext: TurnContext, authToken: string) {
	const configService: McpToolServerConfigurationService = new McpToolServerConfigurationService();

	Utility.ValidateAuthToken(authToken);

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

export async function ms365AgentExecute(
	agentNode: IWebhookFunctions,
	turnContext: TurnContext,
	systemMessage?: string,
	invokeOptions: RunnableConfig = {},
	mcpAuthToken: string | undefined = undefined,
): Promise<string> {
	const needsFallback = agentNode.getNodeParameter('needsFallback', false) as boolean;
	const memory = await getOptionalMemory(agentNode);
	const model = await getChatModel(agentNode, 0);
	assert(model, 'Please connect a model to the Chat Model input');
	const fallbackModel = needsFallback ? await getChatModel(agentNode, 1) : null;

	if (needsFallback && !fallbackModel) {
		throw new NodeOperationError(
			agentNode.getNode(),
			'Please connect a model to the Fallback Model input or disable the fallback option',
		);
	}

	const outputParser = await getOptionalOutputParser(agentNode, 0);
	let tools = await getTools(agentNode, outputParser);

	if (mcpAuthToken) {
		try {
			const microsoftMcpTools = await getMicrosoftMcpTools(turnContext, mcpAuthToken);
			tools = tools.concat(microsoftMcpTools);
		} catch (error) {
			console.log('Error retrieving MCP tools:', error);
		}
	}

	const options = agentNode.getNodeParameter('options', {}) as {
		systemMessage?: string;
		maxIterations?: number;
	};

	if (systemMessage) {
		options.systemMessage = systemMessage;
	}

	if (options.maxIterations === undefined) {
		options.maxIterations = 10;
	}

	const messages = await prepareMessages({
		systemMessage: options.systemMessage,
		outputParser,
	});
	const prompt: ChatPromptTemplate = preparePrompt(messages);

	const executor = createAgentExecutor(
		model,
		tools,
		prompt,
		options,
		outputParser,
		memory,
		fallbackModel,
	);

	const invokeParams = {
		input: turnContext.activity.text || '',
		system_message: options.systemMessage ?? SYSTEM_MESSAGE,
		formatting_instructions:
			'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
	};

	const result = await executor.invoke(invokeParams, invokeOptions);

	if (result.status === 'rejected') {
		const error = result.reason as Error;

		throw new NodeOperationError(agentNode.getNode(), error);
	}
	const response = result;

	if (memory && outputParser) {
		const parsedOutput = jsonParse<{ output: Record<string, unknown> }>(response.output as string);
		response.output = parsedOutput?.output ?? parsedOutput;
	}

	return response.output;
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
