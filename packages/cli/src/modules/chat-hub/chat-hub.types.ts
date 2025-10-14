import type { ChatHubConversationModel } from '@n8n/api-types';
import type { INodeCredentials } from 'n8n-workflow';

export interface ModelWithCredentials extends ChatHubConversationModel {
	credentialId: string | null;
}

export interface BaseMessagePayload {
	userId: string;
	messageId: string;
	sessionId: string;
	replyId: string;
	model: ChatHubConversationModel;
	credentials: INodeCredentials;
}

export interface HumanMessagePayload extends BaseMessagePayload {
	previousMessageId: string | null;
	message: string;
}
export interface RetryMessagePayload extends BaseMessagePayload {
	retryId: string;
}

export interface EditMessagePayload extends BaseMessagePayload {
	editId: string;
	message: string;
}

// From packages/@n8n/nodes-langchain/nodes/memory/MemoryManager/MemoryManager.node.ts
export type MessageRole = 'ai' | 'system' | 'user';
export interface MessageRecord {
	type: MessageRole;
	message: string;
	hideFromUI: boolean;
}
