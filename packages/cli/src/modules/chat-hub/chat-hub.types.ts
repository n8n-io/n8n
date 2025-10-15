import type { ChatHubConversationModel } from '@n8n/api-types';
import type { INodeCredentials } from 'n8n-workflow';

export interface ChatPayloadWithCredentials {
	userId: string;
	message: string;
	messageId: string;
	sessionId: string;
	replyId: string;
	previousMessageId: string | null;
	model: ChatHubConversationModel;
	credentials: INodeCredentials;
}

export type ChatMessage = {
	id: string;
	message: string;
	type: 'user' | 'ai' | 'system';
	createdAt: Date;
};

// From packages/@n8n/nodes-langchain/nodes/memory/MemoryManager/MemoryManager.node.ts
export type MessageRole = 'ai' | 'system' | 'user';
export interface MessageRecord {
	type: MessageRole;
	message: string;
	hideFromUI: boolean;
}
