import type { ChatHubConversationModel, ChatMessageId, ChatSessionId } from '@n8n/api-types';
import type { INodeCredentials } from 'n8n-workflow';

export interface ModelWithCredentials extends ChatHubConversationModel {
	credentialId: string | null;
}

export interface BaseMessagePayload {
	userId: string;
	sessionId: ChatSessionId;
	replyId: ChatMessageId;
	model: ChatHubConversationModel;
	credentials: INodeCredentials;
}

export interface HumanMessagePayload extends BaseMessagePayload {
	messageId: ChatMessageId;
	message: string;
	previousMessageId: ChatMessageId | null;
}
export interface RegenerateMessagePayload extends BaseMessagePayload {
	retryId: ChatMessageId;
}

export interface EditMessagePayload extends BaseMessagePayload {
	editId: ChatMessageId;
	messageId: ChatMessageId;
	message: string;
}

// From packages/@n8n/nodes-langchain/nodes/memory/MemoryManager/MemoryManager.node.ts
export type MessageRole = 'ai' | 'system' | 'user';
export interface MessageRecord {
	type: MessageRole;
	message: string;
	hideFromUI: boolean;
}
