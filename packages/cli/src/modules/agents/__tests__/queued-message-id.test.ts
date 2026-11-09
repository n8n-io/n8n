import { mock } from 'vitest-mock-extended';

import type {
	QueuedIntegrationMessage,
	QueuedUserChatMessage,
} from '../types/agent-queued-message';
import { queuedMessageId } from '../utils/queued-message-id';

describe('queuedMessageId', () => {
	const preview: QueuedUserChatMessage = {
		kind: 'preview',
		userId: 'user-1',
		messageId: 'C4B02D7B-2088-41CE-9C6B-FAF8C7B83D8A',
		message: 'Hello',
		resourceId: 'draft-chat:user-1',
	};
	const integration = mock<QueuedIntegrationMessage>({
		kind: 'integration',
		platformThreadId: 'slack:channel:thread',
		messageContext: {
			platform: 'slack',
			integrationConnectionId: 'slack:credential',
			messageId: '1726748100.000042',
		},
	});

	it('keeps the acceptance ID contract stable across releases', () => {
		expect(queuedMessageId('agent-1', 'session-1', preview)).toBe(
			'14926758-36d7-5db0-a865-962afe3ad861',
		);
		expect(queuedMessageId('agent-1', 'session-1', integration)).toBe(
			'2e2ada63-7a78-5ddf-ab15-154a4b635e3e',
		);
		expect(
			queuedMessageId('agent-1', 'session-1', {
				...preview,
				messageId: preview.messageId!.toLowerCase(),
			}),
		).toBe('14926758-36d7-5db0-a865-962afe3ad861');
	});

	it('separates n8n Chat submissions from Preview submissions', () => {
		expect(queuedMessageId('agent-1', 'session-1', { ...preview, kind: 'n8n_chat' })).not.toBe(
			queuedMessageId('agent-1', 'session-1', preview),
		);
	});

	it('separates Preview agents, users, sessions, and submissions', () => {
		const ids = [
			queuedMessageId('agent-1', 'session-1', preview),
			queuedMessageId('agent-2', 'session-1', preview),
			queuedMessageId('agent-1', 'session-2', preview),
			queuedMessageId('agent-1', 'session-1', { ...preview, userId: 'user-2' }),
			queuedMessageId('agent-1', 'session-1', {
				...preview,
				messageId: 'b6c50392-01d7-4d9b-b331-42de11c261f8',
			}),
		];
		expect(new Set(ids).size).toBe(ids.length);
		expect(queuedMessageId('agent:one', 'session-1', { ...preview, userId: 'two' })).not.toBe(
			queuedMessageId('agent', 'session-1', { ...preview, userId: 'one:two' }),
		);
	});

	it('separates native integration scopes and preserves native identifier case', () => {
		const ids = [
			queuedMessageId('agent-1', 'session-1', integration),
			queuedMessageId('agent-2', 'session-1', integration),
			queuedMessageId('agent-1', 'session-1', {
				...integration,
				platformThreadId: 'Slack:channel:thread',
			}),
			...['platform', 'integrationConnectionId', 'messageId'].map((field) =>
				queuedMessageId('agent-1', 'session-1', {
					...integration,
					messageContext: { ...integration.messageContext, [field]: 'different' },
				}),
			),
		];
		expect(new Set(ids).size).toBe(ids.length);
		expect(
			queuedMessageId('agent-1', 'session-1', {
				...integration,
				messageContext: { ...integration.messageContext, messageId: 'Native-ID' },
			}),
		).not.toBe(
			queuedMessageId('agent-1', 'session-1', {
				...integration,
				messageContext: { ...integration.messageContext, messageId: 'native-id' },
			}),
		);
	});

	it('ignores delivery content and the resolved integration session and task binding', () => {
		expect(
			queuedMessageId('agent-1', 'session-1', { ...preview, message: 'changed', attachments: [] }),
		).toBe(queuedMessageId('agent-1', 'session-1', preview));
		expect(
			queuedMessageId('agent-1', 'rotated-session#2', {
				...integration,
				resourceId: 'different-resource',
				message: 'changed',
				attachments: [],
				contextConversation: { threadId: 'task-thread', resourceId: 'task-resource' },
			}),
		).toBe(queuedMessageId('agent-1', 'session-1', integration));
	});

	it('leaves messages without a native or client ID on the random-ID path', () => {
		expect(
			queuedMessageId('agent-1', 'session-1', { ...preview, messageId: undefined }),
		).toBeUndefined();
		for (const messageId of [undefined, '']) {
			expect(
				queuedMessageId('agent-1', 'session-1', {
					...integration,
					messageContext: { ...integration.messageContext, messageId },
				}),
			).toBeUndefined();
		}
	});
});
