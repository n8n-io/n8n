import type {
	ChatModelsResponse,
	ChatModelDto,
	ChatHubSessionDto,
	ChatHubMessageDto,
	ChatHubConversationResponse,
	EnrichedStructuredChunk,
	ChatHubModuleSettings,
} from '@n8n/api-types';
import { emptyChatModelsResponse } from '@n8n/api-types';
import type { ChatMessage } from '../chat.types';

export type SimulateStreamChunkFn = (
	type: EnrichedStructuredChunk['type'],
	content: string,
	metadata: Partial<EnrichedStructuredChunk['metadata']>,
) => void;

export function wrapOnMessageUpdate(fn: (chunk: EnrichedStructuredChunk) => void) {
	return (...[type, content, metadata]: Parameters<SimulateStreamChunkFn>) =>
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
			inputModalities: ['text'],
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
		createdAt: '2024-01-15T12:00:00Z',
		updatedAt: '2024-01-15T12:00:00Z',
		tools: [],
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
		content: 'Test message',
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
	overrides: Partial<Omit<EnrichedStructuredChunk, 'metadata'>> & {
		metadata?: Partial<EnrichedStructuredChunk['metadata']>;
	} = {},
): EnrichedStructuredChunk {
	const { metadata, ...rest } = overrides;
	return {
		type: 'item',
		content: 'Test content',
		...rest,
		metadata: {
			nodeId: 'test-node',
			nodeName: 'Test Node',
			runIndex: 0,
			itemIndex: 0,
			timestamp: Date.now(),
			messageId: 'message-123',
			previousMessageId: null,
			retryOfMessageId: null,
			executionId: null,
			...metadata,
		},
	};
}

export function createChatHubModuleSettings(
	overrides: Partial<ChatHubModuleSettings> = {},
): ChatHubModuleSettings {
	return {
		enabled: true,
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

/**
 * Simple conversation with one user prompt and one AI response
 */
export const SIMPLE_CONVERSATION: ChatHubConversationResponse = {
	session: createMockSession({
		id: 'existing-session-123',
		title: 'Test Conversation',
		lastMessageAt: new Date().toISOString(),
		provider: 'custom-agent',
		agentId: 'agent-123',
	}),
	conversation: {
		messages: {
			'msg-1': createMockMessageDto({
				id: 'msg-1',
				sessionId: 'existing-session-123',
				content: 'What is the weather today?',
			}),
			'msg-2': createMockMessageDto({
				id: 'msg-2',
				sessionId: 'existing-session-123',
				type: 'ai',
				name: 'Assistant',
				content: 'The weather is sunny today.',
				provider: 'custom-agent',
				agentId: 'agent-123',
				previousMessageId: 'msg-1',
			}),
		},
	},
};

/**
 * Conversation with file attachments for testing editing
 */
export const CONVERSATION_WITH_ATTACHMENTS: ChatHubConversationResponse = {
	session: createMockSession({
		id: 'existing-session-123',
		provider: 'custom-agent',
		agentId: 'agent-123',
	}),
	conversation: {
		messages: {
			'msg-1': createMockMessageDto({
				id: 'msg-1',
				sessionId: 'existing-session-123',
				content: 'Please analyze these files',
				attachments: [
					{ fileName: 'file1.txt', mimeType: 'text/plain' },
					{ fileName: 'file2.pdf', mimeType: 'application/pdf' },
					{ fileName: 'file3.jpg', mimeType: 'image/jpeg' },
				],
			}),
			'msg-2': createMockMessageDto({
				id: 'msg-2',
				sessionId: 'existing-session-123',
				type: 'ai',
				name: 'Assistant',
				content: 'Analysis complete',
				provider: 'custom-agent',
				agentId: 'agent-123',
				previousMessageId: 'msg-1',
			}),
		},
	},
};

/**
 * Multi-step AI conversation where AI sends multiple sequential responses
 * (e.g., when using tools). This simulates an AI agent performing a multi-step task.
 */
export const MULTI_STEP_AI_CONVERSATION: ChatHubConversationResponse = {
	session: createMockSession({
		id: 'existing-session-123',
		provider: 'custom-agent',
		agentId: 'agent-123',
	}),
	conversation: {
		messages: {
			'msg-1': createMockMessageDto({
				id: 'msg-1',
				sessionId: 'existing-session-123',
				content: 'Check latest news on the web',
			}),
			'msg-2': createMockMessageDto({
				id: 'msg-2',
				sessionId: 'existing-session-123',
				type: 'ai',
				name: 'Assistant',
				content: 'I will help you find latest news',
				provider: 'custom-agent',
				agentId: 'agent-123',
				previousMessageId: 'msg-1',
			}),
			'msg-3': createMockMessageDto({
				id: 'msg-3',
				sessionId: 'existing-session-123',
				type: 'ai',
				name: 'Assistant',
				content: 'Let me use web search tool',
				provider: 'custom-agent',
				agentId: 'agent-123',
				previousMessageId: 'msg-2',
			}),
			'msg-4': createMockMessageDto({
				id: 'msg-4',
				sessionId: 'existing-session-123',
				type: 'ai',
				name: 'Assistant',
				content: 'Here are latest news: Breaking news today...',
				provider: 'custom-agent',
				agentId: 'agent-123',
				previousMessageId: 'msg-3',
			}),
		},
	},
};
