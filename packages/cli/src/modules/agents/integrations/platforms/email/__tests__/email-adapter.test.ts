/* eslint-disable @typescript-eslint/unbound-method -- assertions intentionally inspect mocks */
import type { ChatInstance } from 'chat';
import { createHmac } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import type { AgentEmailServiceClient } from '../agent-email-service-client';
import { EmailAdapter, type AgentMailMessageReceived } from '../email-adapter';

describe('EmailAdapter', () => {
	const callbackSecret = `whsec_${Buffer.from('callback-secret').toString('base64')}`;
	const serviceClient = mock<AgentEmailServiceClient>();
	const chat = mock<ChatInstance>();
	let adapter: EmailAdapter;

	beforeEach(async () => {
		vi.resetAllMocks();
		const { Message } = await import('chat');
		adapter = new EmailAdapter({
			channelId: 'inbox-1',
			callbackSecret,
			serviceClient,
			Message,
		});
		await adapter.initialize(chat);
	});

	it('verifies and normalizes an inbound email', async () => {
		const event = inboundEvent();
		const request = signedRequest(event);

		const response = await adapter.handleWebhook(request);

		expect(response.status).toBe(200);
		expect(chat.processMessage).toHaveBeenCalledOnce();
		const [calledAdapter, threadId, factory] = chat.processMessage.mock.calls[0];
		expect(calledAdapter).toBe(adapter);
		expect(threadId).toBe(adapter.encodeThreadId({ inboxId: 'inbox-1', threadId: 'thread-1' }));
		const message = await (factory as () => Promise<ReturnType<EmailAdapter['parseMessage']>>)();
		expect(message).toMatchObject({
			id: '<message-1@example.com>',
			text: 'Hello agent',
			author: {
				userId: 'alice@example.com',
				fullName: 'Alice',
				email: 'alice@example.com',
			},
		});
	});

	it('rejects an invalid callback signature', async () => {
		const response = await adapter.handleWebhook(
			new Request('https://n8n.example/email', {
				method: 'POST',
				headers: {
					'x-n8n-email-id': 'event-1',
					'x-n8n-email-timestamp': Math.floor(Date.now() / 1000).toString(),
					'x-n8n-email-signature': 'v1,invalid',
				},
				body: JSON.stringify(inboundEvent()),
			}),
		);

		expect(response.status).toBe(401);
		expect(chat.processMessage).not.toHaveBeenCalled();
	});

	it('uses a stable inbox-and-thread mapping for follow-ups', () => {
		const first = adapter.parseMessage(inboundEvent());
		const followUp = adapter.parseMessage(
			inboundEvent({
				event_id: 'event-2',
				message: { message_id: '<message-2@example.com>', text: 'Follow up' },
			}),
		);

		expect(followUp.threadId).toBe(first.threadId);
		expect(followUp.author.userId).toBe(first.author.userId);
	});

	it('posts a buffered reply to the latest inbound message', async () => {
		await adapter.handleWebhook(signedRequest(inboundEvent()));
		const threadId = adapter.encodeThreadId({ inboxId: 'inbox-1', threadId: 'thread-1' });

		await adapter.postMessage(threadId, 'Agent response');

		expect(serviceClient.reply).toHaveBeenCalledWith(
			'inbox-1',
			'<message-1@example.com>',
			'Agent response',
		);
	});

	it('renders the Chat SDK AST used for buffered agent replies', async () => {
		await adapter.handleWebhook(signedRequest(inboundEvent()));
		const threadId = adapter.encodeThreadId({ inboxId: 'inbox-1', threadId: 'thread-1' });

		await adapter.postMessage(threadId, {
			ast: {
				type: 'root',
				children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Agent response' }] }],
			},
		});

		expect(serviceClient.reply).toHaveBeenCalledWith(
			'inbox-1',
			'<message-1@example.com>',
			'Agent response',
		);
	});

	function inboundEvent(
		overrides: {
			event_id?: string;
			message?: Partial<AgentMailMessageReceived['message']>;
		} = {},
	): AgentMailMessageReceived {
		return {
			event_id: overrides.event_id ?? 'event-1',
			event_type: 'message.received',
			message: {
				inbox_id: 'inbox-1',
				thread_id: 'thread-1',
				message_id: '<message-1@example.com>',
				from: 'Alice <alice@example.com>',
				subject: 'Question',
				text: 'Hello agent',
				...overrides.message,
			},
		};
	}

	function signedRequest(event: AgentMailMessageReceived): Request {
		const body = JSON.stringify(event);
		const id = event.event_id;
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const secret = Buffer.from(callbackSecret.slice('whsec_'.length), 'base64');
		const signature = createHmac('sha256', secret)
			.update(`${id}.${timestamp}.${body}`)
			.digest('base64');
		return new Request('https://n8n.example/email', {
			method: 'POST',
			headers: {
				'x-n8n-email-id': id,
				'x-n8n-email-timestamp': timestamp,
				'x-n8n-email-signature': `v1,${signature}`,
			},
			body,
		});
	}
});
