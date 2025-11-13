import type {
	ChatHubConversationModel,
	ChatHubProvider,
	ChatMessageId,
	ChatSessionId,
} from '@n8n/api-types';
import type { INodeCredentials } from 'n8n-workflow';

export interface ModelWithCredentials {
	provider: ChatHubProvider;
	model?: string;
	workflowId?: string;
	credentialId: string | null;
	agentId?: string;
	name?: string;
}

export interface BaseMessagePayload {
	userId: string;
	sessionId: ChatSessionId;
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
