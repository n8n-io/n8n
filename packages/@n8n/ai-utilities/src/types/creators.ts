import type { INodeTypeDescription, ISupplyDataFunctions, NodeMethods } from 'n8n-workflow';

import type { ChatModel } from './chat-model';
import type { ChatMemory } from './memory';
import type { OpenAIModelOptions } from './openai';

interface AiNode {
	description: INodeTypeDescription;
	methods?: NodeMethods;
}

export type OpenAiModel = OpenAIModelOptions & {
	type: 'openai';
};
export type ChatModelOptions = ChatModel | OpenAiModel;
export type GetChatModelFn = (
	context: ISupplyDataFunctions,
	itemIndex: number,
) => Promise<ChatModelOptions>;

export interface ChatModelNodeConfig extends AiNode {
	getModel: GetChatModelFn;
}

export interface ChatMemoryOptions {
	closeFunction?: () => Promise<void>;
}
export type GetChatMemoryFn = (
	context: ISupplyDataFunctions,
	itemIndex: number,
) => Promise<ChatMemory>;
export interface ChatMemoryNodeConfig extends AiNode {
	getMemory: GetChatMemoryFn;
	memoryOptions?: ChatMemoryOptions;
}
