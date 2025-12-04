import type {} from '@n8n/api-types';
import type { ChatMessage } from '../chat.types';

export function createTestChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
	return {
		id: 'm0',
		type: 'ai',
		content: 'test message',
		status: 'success',
		sessionId: 's0',
		createdAt: new Date().toISOString(),
		model: 'm0',
		provider: 'anthropic',
		alternatives: [],
		attachments: [],
		responses: [],
		name: '',
		workflowId: null,
		agentId: null,
		executionId: null,
		updatedAt: new Date().toISOString(),
		previousMessageId: null,
		retryOfMessageId: null,
		revisionOfMessageId: null,
		...overrides,
	};
}
