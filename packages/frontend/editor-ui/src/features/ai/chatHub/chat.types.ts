import {
	chatHubProviderSchema,
	type ChatHubMessageDto,
	type ChatMessageId,
	type ChatHubSessionDto,
	type ChatHubConversationDto,
	type ChatSessionId,
	type MessageChunk,
	type ChatHubProvider,
	chatHubConversationModelSchema,
	type ChatModelDto,
	agentIconOrEmojiSchema,
} from '@n8n/api-types';
import type { IBinaryData, INode } from 'n8n-workflow';
import { z } from 'zod';
import { isLlmProviderModel } from './chat.utils';

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

export type MessagingState =
	| 'idle'
	| 'waitingFirstChunk'
	| 'receiving'
	| 'missingCredentials'
	| 'missingAgent';

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
	search: string;
}

export interface ChatStreamingState extends Partial<MessageChunk['metadata']> {
	promptPreviousMessageId: ChatMessageId | null;
	promptText: string;
	promptId: ChatMessageId;
	sessionId: ChatSessionId;
	retryOfMessageId: ChatMessageId | null;
	revisionOfMessageId: ChatMessageId | null;
	tools: INode[];
	attachments: IBinaryData[];
	agent: ChatModelDto;
}

export interface FlattenedModel {
	provider: ChatHubProvider | null;
	model: string | null;
	workflowId: string | null;
	agentId: string | null;
}

export const chatHubConversationModelWithCachedDisplayNameSchema = chatHubConversationModelSchema
	.and(
		z.object({
			cachedDisplayName: z.string().optional(),
			cachedIcon: agentIconOrEmojiSchema.optional(),
		}),
	)
	.transform((value) => ({
		...value,
		cachedDisplayName: value.cachedDisplayName || (isLlmProviderModel(value) ? value.model : ''),
	}));

export type ChatHubConversationModelWithCachedDisplayName = z.infer<
	typeof chatHubConversationModelWithCachedDisplayNameSchema
>;

export interface FetchOptions {
	minLoadingTime?: number;
}
