import {
	chatHubProviderSchema,
	type ChatHubMessageDto,
	type ChatMessageId,
	type ChatHubSessionDto,
	type ChatHubConversationDto,
	type ChatSessionId,
	type ChatHubConversationModel,
	type EnrichedStructuredChunk,
	type ChatHubProvider,
} from '@n8n/api-types';
import { z } from 'zod';

export interface UserMessage {
	id: string;
	key: string;
	role: 'user';
	type: 'message';
	text: string;
}

export interface AssistantMessage {
	id: string;
	key: string;
	role: 'assistant';
	type: 'message';
	text: string;
}

export interface ErrorMessage {
	id: string;
	key: string;
	role: 'assistant';
	type: 'error';
	content: string;
}

export type StreamChunk = AssistantMessage | ErrorMessage;

export interface ChatMessage extends ChatHubMessageDto {
	responses: ChatMessageId[];
	alternatives: ChatMessageId[];
}

export interface ChatConversation extends ChatHubConversationDto {
	messages: Record<ChatMessageId, ChatMessage>;
	activeMessageChain: ChatMessageId[];
}

export interface StreamOutput {
	messages: StreamChunk[];
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
	sessions: ChatHubSessionDto[];
}

export interface ChatAgentFilter {
	sortBy: 'updatedAt' | 'createdAt';
	provider: 'custom-agent' | 'n8n' | '';
	search: string;
}

export interface ChatStreamingState extends Partial<EnrichedStructuredChunk['metadata']> {
	promptId: ChatMessageId;
	sessionId: ChatSessionId;
	model: ChatHubConversationModel;
}

export interface FlattenedModel {
	provider: ChatHubProvider | null;
	model: string | null;
	workflowId: string | null;
	agentId: string | null;
}
