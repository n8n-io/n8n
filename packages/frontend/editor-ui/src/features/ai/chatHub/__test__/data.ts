import type {
	ChatModelsResponse,
	ChatModelDto,
	ChatHubSessionDto,
	ChatHubMessageDto,
	ChatHubConversationResponse,
	MessageChunk,
	ChatHubModuleSettings,
	ChatHubAgentDto,
	ChatHubAgentKnowledgeItem,
} from '@n8n/api-types';
import { emptyChatModelsResponse } from '@n8n/api-types';
import type { ChatMessage } from '../chat.types';

export type SimulateMessageChunkFn = (
	type: MessageChunk['type'],
	content: string,
	metadata: Partial<MessageChunk['metadata']>,
) => void;

export function wrapOnMessageUpdate(fn: (chunk: MessageChunk) => void) {
	return (...[type, content, metadata]: Parameters<SimulateMessageChunkFn>) =>
		fn(createMockStreamChunk({ type, content, metadata }));
}

export function createMockAgent(overrides: Partial<ChatModelDto> = {}): ChatModelDto {
	return {
		name: 'Test Agent',
		description: 'A test agent',
		model: { provider: 'openai', model: 'gpt-4' },
		icon: null,
		updatedAt: '2024-01-15T12:00:00Z',
		createdAt: '2024-01-15T12:00:00Z',
		metadata: {
			allowFileUploads: true,
			allowedFilesMimeTypes: 'text/*',
			capabilities: {
				functionCalling: true,
			},
			available: true,
		},
		groupName: null,
		groupIcon: null,
		...overrides,
	};
}

export function createMockModelsResponse(
	overrides: Partial<ChatModelsResponse> = {},
): ChatModelsResponse {
	return {
		...emptyChatModelsResponse,
		openai: {
			models: [
				createMockAgent({
					name: 'GPT-4',
					model: { provider: 'openai', model: 'gpt-4' },
				}),
			],
		},
		...overrides,
	};
}

export function createMockSession(overrides: Partial<ChatHubSessionDto> = {}): ChatHubSessionDto {
	return {
		id: 'session-123',
		title: 'Test Conversation',
		ownerId: 'user-123',
		lastMessageAt: null,
		credentialId: null,
		provider: 'openai',
		model: 'gpt-4',
		workflowId: null,
		agentId: null,
		agentName: 'gpt-4',
		agentIcon: null,
		type: 'production',
		createdAt: '2024-01-15T12:00:00Z',
		updatedAt: '2024-01-15T12:00:00Z',
		toolIds: [],
		...overrides,
	};
}

export function createMockMessageDto(
	overrides: Partial<ChatHubMessageDto> = {},
): ChatHubMessageDto {
	return {
		id: 'message-123',
		sessionId: 'session-123',
		type: 'human',
		name: 'User',
		content: [{ type: 'text', content: 'Test message' }],
		status: 'success',
		provider: null,
		model: null,
		workflowId: null,
		agentId: null,
		executionId: null,
		previousMessageId: null,
		retryOfMessageId: null,
		revisionOfMessageId: null,
		attachments: [],
		createdAt: '2024-01-15T12:00:00Z',
		updatedAt: '2024-01-15T12:00:00Z',
		...overrides,
	};
}

export function createMockMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
	return {
		...createMockMessageDto(overrides),
		responses: [],
		alternatives: [],
		attachments: [],
		...overrides,
	};
}

export function createMockConversationResponse(
	overrides: Partial<ChatHubConversationResponse> = {},
): ChatHubConversationResponse {
	return {
		session: createMockSession(),
		conversation: { messages: {} },
		...overrides,
	};
}

export function createMockStreamChunk(
	overrides: Partial<Omit<MessageChunk, 'metadata'>> & {
		metadata?: Partial<MessageChunk['metadata']>;
	} = {},
): MessageChunk {
	const { metadata, ...rest } = overrides;
	return {
		type: 'item',
		content: 'Test content',
		...rest,
		metadata: {
			timestamp: Date.now(),
			messageId: 'message-123',
			previousMessageId: null,
			retryOfMessageId: null,
			executionId: null,
			...metadata,
		},
	};
}

export function createMockKnowledgeItem(
	overrides: Partial<ChatHubAgentKnowledgeItem> = {},
): ChatHubAgentKnowledgeItem {
	return {
		id: 'file-1',
		type: 'embedding',
		provider: 'openai',
		fileName: 'document.pdf',
		mimeType: 'application/pdf',
		status: 'indexed',
		...overrides,
	};
}

export function createMockAgentDto(overrides: Partial<ChatHubAgentDto> = {}): ChatHubAgentDto {
	return {
		id: 'agent-1',
		name: 'Test Agent',
		description: null,
		icon: null,
		suggestedPrompts: [],
		systemPrompt: '',
		ownerId: 'user-1',
		credentialId: null,
		provider: 'openai',
		model: 'gpt-4',
		files: [],
		toolIds: [],
		createdAt: '',
		updatedAt: '',
		...overrides,
	};
}

export function createChatHubModuleSettings(
	overrides: Partial<ChatHubModuleSettings> = {},
): ChatHubModuleSettings {
	return {
		enabled: true,
		semanticSearch: {
			vectorStore: { provider: 'qdrant', credentialId: null },
			embeddingModel: { provider: 'openai', credentialId: null },
		},
		agentUploadMaxSizeMb: 10,
		providers: {
			openai: {
				provider: 'openai',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			anthropic: {
				provider: 'anthropic',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			google: {
				provider: 'google',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			azureOpenAi: {
				provider: 'azureOpenAi',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			azureEntraId: {
				provider: 'azureEntraId',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			ollama: {
				provider: 'ollama',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			awsBedrock: {
				provider: 'awsBedrock',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			vercelAiGateway: {
				provider: 'vercelAiGateway',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			xAiGrok: {
				provider: 'xAiGrok',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			groq: {
				provider: 'groq',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			openRouter: {
				provider: 'openRouter',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			deepSeek: {
				provider: 'deepSeek',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			cohere: {
				provider: 'cohere',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
			mistralCloud: {
				provider: 'mistralCloud',
				credentialId: null,
				allowedModels: [],
				createdAt: '2025-12-18T09:07:29.060Z',
				updatedAt: null,
				enabled: true,
			},
		},
		...overrides,
	};
}
