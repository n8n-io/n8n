import type {
	EventNamesAiNodesType,
	IDataObject,
	IExecuteFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, jsonStringify } from 'n8n-workflow';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseOutputParser } from '@langchain/core/output_parsers';
import type { BaseMessage } from '@langchain/core/messages';
import type { Tool } from '@langchain/core/tools';
import type { BaseLLM } from '@langchain/core/language_models/llms';
import type { BaseChatMemory } from 'langchain/memory';
import type { BaseChatMessageHistory } from '@langchain/core/chat_history';
import { N8nTool } from './N8nTool';
import { DynamicTool } from '@langchain/core/tools';

function hasMethods<T>(obj: unknown, ...methodNames: Array<string | symbol>): obj is T {
	return methodNames.every(
		(methodName) =>
			typeof obj === 'object' &&
			obj !== null &&
			methodName in obj &&
			typeof (obj as Record<string | symbol, unknown>)[methodName] === 'function',
	);
}

export function getMetadataFiltersValues(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Record<string, never> | undefined {
	const options = ctx.getNodeParameter('options', itemIndex, {});

	if (options.metadata) {
		const { metadataValues: metadata } = options.metadata as {
			metadataValues: Array<{
				name: string;
				value: string;
			}>;
		};
		if (metadata.length > 0) {
			return metadata.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {});
		}
	}

	if (options.searchFilterJson) {
		return ctx.getNodeParameter('options.searchFilterJson', itemIndex, '', {
			ensureType: 'object',
		}) as Record<string, never>;
	}

	return undefined;
}

export function isBaseChatMemory(obj: unknown) {
	return hasMethods<BaseChatMemory>(obj, 'loadMemoryVariables', 'saveContext');
}

export function isBaseChatMessageHistory(obj: unknown) {
	return hasMethods<BaseChatMessageHistory>(obj, 'getMessages', 'addMessage');
}

export function isChatInstance(model: unknown): model is BaseChatModel {
	const namespace = (model as BaseLLM)?.lc_namespace ?? [];

	return namespace.includes('chat_models');
}

export function isToolsInstance(model: unknown): model is Tool {
	const namespace = (model as Tool)?.lc_namespace ?? [];

	return namespace.includes('tools');
}

export async function getOptionalOutputParsers(
	ctx: IExecuteFunctions,
): Promise<Array<BaseOutputParser<unknown>>> {
	let outputParsers: BaseOutputParser[] = [];

	if (ctx.getNodeParameter('hasOutputParser', 0, true) === true) {
		outputParsers = (await ctx.getInputConnectionData(
			NodeConnectionType.AiOutputParser,
			0,
		)) as BaseOutputParser[];
	}

	return outputParsers;
}

export function getPromptInputByType(options: {
	ctx: IExecuteFunctions;
	i: number;
	promptTypeKey: string;
	inputKey: string;
}) {
	const { ctx, i, promptTypeKey, inputKey } = options;
	const prompt = ctx.getNodeParameter(promptTypeKey, i) as string;

	let input;
	if (prompt === 'auto') {
		input = ctx.evaluateExpression('{{ $json["chatInput"] }}', i) as string;
	} else {
		input = ctx.getNodeParameter(inputKey, i) as string;
	}

	if (input === undefined) {
		throw new NodeOperationError(ctx.getNode(), 'No prompt specified', {
			description:
				"Expected to find the prompt in an input field called 'chatInput' (this is what the chat trigger node outputs). To use something else, change the 'Prompt' parameter",
		});
	}

	return input;
}

export function getSessionId(
	ctx: IExecuteFunctions | IWebhookFunctions,
	itemIndex: number,
	selectorKey = 'sessionIdType',
	autoSelect = 'fromInput',
	customKey = 'sessionKey',
) {
	let sessionId = '';
	const selectorType = ctx.getNodeParameter(selectorKey, itemIndex) as string;

	if (selectorType === autoSelect) {
		// If memory node is used in webhook like node(like chat trigger node), it doesn't have access to evaluateExpression
		// so we try to extract sessionId from the bodyData
		if ('getBodyData' in ctx) {
			const bodyData = ctx.getBodyData() ?? {};
			sessionId = bodyData.sessionId as string;
		} else {
			sessionId = ctx.evaluateExpression('{{ $json.sessionId }}', itemIndex) as string;
		}

		if (sessionId === '' || sessionId === undefined) {
			throw new NodeOperationError(ctx.getNode(), 'No session ID found', {
				description:
					"Expected to find the session ID in an input field called 'sessionId' (this is what the chat trigger node outputs). To use something else, change the 'Session ID' parameter",
				itemIndex,
			});
		}
	} else {
		sessionId = ctx.getNodeParameter(customKey, itemIndex, '') as string;
		if (sessionId === '' || sessionId === undefined) {
			throw new NodeOperationError(ctx.getNode(), 'Key parameter is empty', {
				description:
					"Provide a key to use as session ID in the 'Key' parameter or use the 'Take from previous node automatically' option to use the session ID from the previous node, e.t. chat trigger node",
				itemIndex,
			});
		}
	}

	return sessionId;
}

export async function logAiEvent(
	executeFunctions: IExecuteFunctions,
	event: EventNamesAiNodesType,
	data?: IDataObject,
) {
	try {
		await executeFunctions.logAiEvent(event, data ? jsonStringify(data) : undefined);
	} catch (error) {
		executeFunctions.logger.debug(`Error logging AI event: ${event}`);
	}
}

export function serializeChatHistory(chatHistory: BaseMessage[]): string {
	return chatHistory
		.map((chatMessage) => {
			if (chatMessage._getType() === 'human') {
				return `Human: ${chatMessage.content}`;
			} else if (chatMessage._getType() === 'ai') {
				return `Assistant: ${chatMessage.content}`;
			} else {
				return `${chatMessage.content}`;
			}
		})
		.join('\n');
}

export const getConnectedTools = async (
	ctx: IExecuteFunctions,
	enforceUniqueNames: boolean,
	convertStructuredTool: boolean = true,
) => {
	const connectedTools =
		((await ctx.getInputConnectionData(NodeConnectionType.AiTool, 0)) as Tool[]) || [];

	if (!enforceUniqueNames) return connectedTools;

	const seenNames = new Set<string>();

	const finalTools = [];

	for (const tool of connectedTools) {
		if (!(tool instanceof DynamicTool) && !(tool instanceof N8nTool)) continue;

		const { name } = tool;
		if (seenNames.has(name)) {
			throw new NodeOperationError(
				ctx.getNode(),
				`You have multiple tools with the same name: '${name}', please rename them to avoid conflicts`,
			);
		}
		seenNames.add(name);

		if (convertStructuredTool && tool instanceof N8nTool) {
			finalTools.push(tool.asDynamicTool());
		} else {
			finalTools.push(tool);
		}
	}

	return finalTools;
};
