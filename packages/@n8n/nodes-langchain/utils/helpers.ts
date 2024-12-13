import type { BaseChatMessageHistory } from '@langchain/core/chat_history';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseLLM } from '@langchain/core/language_models/llms';
import type { BaseMessage } from '@langchain/core/messages';
import type { Tool } from '@langchain/core/tools';
import type { BaseChatMemory } from 'langchain/memory';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, ISupplyDataFunctions, IWebhookFunctions } from 'n8n-workflow';

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
	ctx: IExecuteFunctions | ISupplyDataFunctions,
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

export function getSessionId(
	ctx: ISupplyDataFunctions | IWebhookFunctions,
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
					"Provide a key to use as session ID in the 'Key' parameter or use the 'Connected Chat Trigger Node' option to use the session ID from your Chat Trigger",
				itemIndex,
			});
		}
	}

	return sessionId;
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
