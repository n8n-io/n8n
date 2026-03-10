import { NodeOperationError, type IWebhookFunctions, assert, jsonParse } from 'n8n-workflow';

import {
	getChatModel,
	getOptionalMemory,
	getTools,
	preparePrompt,
} from '../../agents/Agent/agents/ToolsAgent/common';

import { SYSTEM_MESSAGE } from '../../agents/Agent/agents/ConversationalAgent/prompt';
import { createAgentExecutor } from '../../agents/Agent/agents/ToolsAgent/V2/execute';
import type { RunnableConfig } from '@langchain/core/runnables';

import { getOptionalOutputParser } from '../../../utils/output_parsers/N8nOutputParser';

import type { ChatPromptTemplate, BaseMessagePromptTemplateLike } from '@langchain/core/prompts';

import { type N8nOutputParser } from '../../../utils/output_parsers/N8nOutputParser';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { ToolInputSchemaBase } from '@langchain/core/dist/tools/types';

export async function invokeAgent(
	nodeContext: IWebhookFunctions,
	input: string,
	systemMessage?: string,
	invokeOptions: RunnableConfig = {},
	microsoftMcpTools: Array<DynamicStructuredTool<ToolInputSchemaBase, any, any, any>> = [],
): Promise<string> {
	const needsFallback = nodeContext.getNodeParameter('needsFallback', false) as boolean;
	const memory = await getOptionalMemory(nodeContext);
	const model = await getChatModel(nodeContext, 0);

	assert(model, 'Please connect a model to the Chat Model input');

	const fallbackModel = needsFallback ? await getChatModel(nodeContext, 1) : null;

	if (needsFallback && !fallbackModel) {
		throw new NodeOperationError(
			nodeContext.getNode(),
			'Please connect a model to the Fallback Model input or disable the fallback option',
		);
	}

	const outputParser = await getOptionalOutputParser(nodeContext, 0);
	let tools = await getTools(nodeContext, outputParser);

	if (microsoftMcpTools?.length) {
		tools = tools.concat(microsoftMcpTools);
	}

	const options = nodeContext.getNodeParameter('options', {}) as {
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

	const system_message = options.systemMessage ?? SYSTEM_MESSAGE;

	const invokeParams = {
		input,
		system_message,
		formatting_instructions:
			'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
	};

	const result = await executor.invoke(invokeParams, invokeOptions);

	if (result.status === 'rejected') {
		const error = result.reason as Error;

		throw new NodeOperationError(nodeContext.getNode(), error);
	}
	const response = result;

	if (memory && outputParser) {
		const parsedOutput = jsonParse<{ output: Record<string, unknown> }>(response.output as string);
		response.output = parsedOutput?.output ?? parsedOutput;
	}

	return response.output;
}

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
