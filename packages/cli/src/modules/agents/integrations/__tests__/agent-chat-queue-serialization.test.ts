import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import { Container } from '@n8n/di';
import type { Adapter, Thread } from 'chat';
import { jsonParse, type Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CacheService } from '@/services/cache/cache.service';

import type { AgentChatAttachmentService } from '../../agent-chat-attachment.service';
import type { AgentMessageQueueService } from '../../agent-message-queue.service';
import type { IntegrationQueuePayload } from '../../agent-message-queue.types';
import { AgentChatBridge } from '../agent-chat-bridge';
import { AgentChatIntegration, ChatIntegrationRegistry } from '../agent-chat-integration';
import type { ComponentMapper } from '../component-mapper';
import { loadChatSdk, loadMemoryState } from '../esm-loader';
import type { IntegrationMessageContextService } from '../integration-message-context.service';

vi.mock('../esm-loader', () => ({
	loadChatSdk: async () => await import('chat'),
	loadMemoryState: async () => await import('@chat-adapter/state-memory'),
}));

class TestIntegration extends AgentChatIntegration {
	readonly type = 'slack';
	readonly credentialTypes = [];
	readonly displayLabel = 'Slack';
	readonly displayIcon = 'slack';
	readonly disableStreaming = true;
	async createAdapter() {
		return {};
	}
	async createBridgeExecutionContext({
		thread,
		integration,
	}: { thread: Thread<unknown, unknown>; integration: AgentIntegrationConfig }) {
		await thread.setState({ connection: integration.credentialId });
		return { platformAgentContext: {} };
	}
}

it('restores each saved message with its originating adapter and state', async () => {
	const { Chat, Message, parseMarkdown } = await loadChatSdk();
	const { createMemoryState } = await loadMemoryState();
	const registry = new ChatIntegrationRegistry();
	registry.register(new TestIntegration());
	Container.set(ChatIntegrationRegistry, registry);
	Container.set(CacheService, mock<CacheService>());
	const threadId = 'slack:channel:thread';
	const attachments = mock<AgentChatAttachmentService>();
	attachments.storeInbound.mockResolvedValue({
		id: 'file',
		fileName: 'note.txt',
		mimeType: 'text/plain',
		fileSizeBytes: 1,
	} as never);
	const contexts = mock<IntegrationMessageContextService>();
	contexts.getLatest.mockResolvedValue(null);
	contexts.resolveSession.mockResolvedValue(null);
	const queue = mock<AgentMessageQueueService>();
	const executor = {
		executeForChatPublished: vi.fn(async function* (): AsyncGenerator<StreamChunk> {
			yield { type: 'text-delta', id: 'text', delta: 'Reply' };
			yield { type: 'finish', finishReason: 'stop' };
		}),
		resumeForChat: vi.fn(async function* () {}),
	};
	const connections = [];
	for (const credentialId of ['first', 'second']) {
		const adapter = mock<Required<Adapter>>({ name: 'slack', persistThreadHistory: true });
		adapter.channelIdFromThreadId.mockReturnValue('slack:channel');
		adapter.fetchMessages.mockResolvedValue({ messages: [] });
		adapter.postMessage.mockResolvedValue({ id: 'reply', threadId, raw: {} });
		adapter.fetchSubject?.mockResolvedValue({
			type: 'channel',
			id: 'channel',
			title: credentialId,
			raw: {},
		});
		adapter.rehydrateAttachment?.mockImplementation((attachment) => ({
			...attachment,
			fetchData: async () => Buffer.from(credentialId),
		}));
		const chat = new Chat({
			userName: 'bot',
			adapters: { slack: adapter },
			state: createMemoryState(),
			concurrency: 'concurrent',
		});
		const bridge = new AgentChatBridge(
			chat,
			queue,
			'agent',
			executor,
			mock<ComponentMapper>(),
			mock<Logger>(),
			'project',
			{ type: 'slack', credentialId },
			contexts,
			attachments,
		);
		await chat.initialize();
		connections.push({ chat, bridge, adapter, credentialId });
	}

	try {
		for (const { chat, adapter, credentialId } of connections) {
			await chat.processMessage(
				adapter,
				threadId,
				new Message({
					id: credentialId,
					threadId,
					text: 'Hello',
					formatted: parseMarkdown('Hello'),
					isMention: true,
					author: {
						userId: credentialId,
						userName: credentialId,
						fullName: credentialId,
						isBot: false,
						isMe: false,
					},
					metadata: { dateSent: new Date(), edited: false },
					raw: { connection: credentialId },
					attachments: [
						{
							type: 'file',
							name: 'note.txt',
							mimeType: 'text/plain',
							fetchMetadata: { file: 'original' },
						},
					],
				}),
			);
		}
		expect(queue.enqueue).toHaveBeenCalledTimes(2);
		expect(executor.executeForChatPublished).not.toHaveBeenCalled();
		expect(contexts.setLatest).not.toHaveBeenCalled();
		expect(attachments.storeInbound).not.toHaveBeenCalled();
		const inputs = queue.enqueue.mock.calls.map(([input]) => input);

		for (let index = 0; index < connections.length; index++) {
			const { bridge, chat, adapter, credentialId } = connections[index];
			const input = inputs[index];
			const payload = jsonParse<IntegrationQueuePayload>(JSON.stringify(input.payload));
			expect(payload.credentialId).toBe(credentialId);
			await bridge.processQueuedInput(payload, input.threadId, {
				abortSignal: new AbortController().signal,
				onExecutionStarted: async () => {},
			});
			expect(adapter.postMessage).toHaveBeenCalledWith(threadId, { markdown: 'Reply' });
			expect(adapter.fetchSubject).toHaveBeenCalledWith({ connection: credentialId });
			expect(attachments.storeInbound).toHaveBeenLastCalledWith(
				expect.objectContaining({ data: Buffer.from(credentialId) }),
			);
			expect(contexts.setLatest).toHaveBeenLastCalledWith(
				input.threadId,
				credentialId,
				expect.objectContaining({
					integrationConnectionId: `slack:${credentialId}`,
					interactingUserId: credentialId,
				}),
			);
			expect(await chat.thread(threadId).state).toEqual({ connection: credentialId });
			const history = [];
			for await (const message of chat.thread(threadId).messages) history.push(message.id);
			expect(history).toContain('reply');
		}
	} finally {
		await Promise.all(connections.map(async ({ chat }) => await chat.shutdown()));
		Container.reset();
	}
});
