import type { BaseChatMemory } from '@langchain/classic/memory';
import type { BaseChatMessageHistory } from '@langchain/core/chat_history';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseLLM } from '@langchain/core/language_models/llms';
import type { Tool } from '@langchain/core/tools';

function hasMethods<T>(obj: unknown, ...methodNames: Array<string | symbol>): obj is T {
	return methodNames.every(
		(methodName) =>
			typeof obj === 'object' &&
			obj !== null &&
			methodName in obj &&
			typeof (obj as Record<string | symbol, unknown>)[methodName] === 'function',
	);
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
