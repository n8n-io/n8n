import type {
	ChatHubConversationModel,
	ChatHubProvider,
	ChatMessageId,
	ChatSessionId,
	ChatAttachment,
} from '@n8n/api-types';
import type { INode, INodeCredentials } from 'n8n-workflow';
import { z } from 'zod';

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
	timeZone?: string;
}

export interface HumanMessagePayload extends BaseMessagePayload {
	messageId: ChatMessageId;
	message: string;
	previousMessageId: ChatMessageId | null;
	attachments: ChatAttachment[];
	tools: INode[];
}
export interface RegenerateMessagePayload extends BaseMessagePayload {
	retryId: ChatMessageId;
}

export interface EditMessagePayload extends BaseMessagePayload {
	editId: ChatMessageId;
	messageId: ChatMessageId;
	message: string;
}

// From @langchain/core
export type ContentBlock =
	| { type: 'text'; text: string }
	| { type: 'image_url'; image_url: string };

// From packages/@n8n/nodes-langchain/nodes/memory/MemoryManager/MemoryManager.node.ts
export type MessageRole = 'ai' | 'system' | 'user';
export interface MessageRecord {
	type: MessageRole;
	message: string | ContentBlock[];
	hideFromUI: boolean;
}

const ChatTriggerResponseModeSchema = z.enum([
	'streaming',
	'lastNode',
	'responseNode',
	'responseNodes',
]);
export type ChatTriggerResponseMode = z.infer<typeof ChatTriggerResponseModeSchema>;

export const chatTriggerParamsShape = z.object({
	availableInChat: z.boolean().optional().default(false),
	agentName: z.string().min(1).optional(),
	agentDescription: z.string().min(1).optional(),
	options: z
		.object({
			allowFileUploads: z.boolean().optional(),
			allowedFilesMimeTypes: z.string().optional(),
			responseMode: ChatTriggerResponseModeSchema.optional(),
		})
		.optional(),
});
