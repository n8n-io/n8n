import { chatHubProviderSchema } from '@n8n/api-types';
import { z } from 'zod';

export interface UserMessage {
	id: string;
	role: 'user';
	type: 'message';
	text: string;
}

export interface AssistantMessage {
	id: string;
	role: 'assistant';
	type: 'message';
	text: string;
}

export interface ErrorMessage {
	id: string;
	role: 'assistant';
	type: 'error';
	content: string;
}

export type StreamChunk = AssistantMessage | ErrorMessage;
export type ChatMessage = UserMessage | AssistantMessage | ErrorMessage;

export interface StreamOutput {
	messages: StreamChunk[];
}

export type Suggestion = {
	title: string;
	subtitle: string;
	icon?: string;
};

// From @n8n/chat
export type ChunkType = 'begin' | 'item' | 'end' | 'error';
export interface StructuredChunk {
	type: ChunkType;
	content?: string;
	metadata: {
		nodeId: string;
		nodeName: string;
		timestamp: number;
		runIndex: number;
		itemIndex: number;
	};
}

export interface NodeStreamingState {
	nodeId: string;
	chunks: string[];
	isActive: boolean;
	startTime: number;
}

export const credentialsMapSchema = z.record(chatHubProviderSchema, z.string().or(z.null()));

export type CredentialsMap = z.infer<typeof credentialsMapSchema>;

export interface GroupedConversations {
	group: string;
	sessions: Array<{ id: string; label: string }>;
}
