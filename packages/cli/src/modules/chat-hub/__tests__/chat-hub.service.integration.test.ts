import { testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createAdmin, createMember } from '@test-integration/db/users';

import { ChatHubService } from '../chat-hub.service';
import { ChatHubMessageRepository } from '../chat-message.repository';
import { ChatHubSessionRepository } from '../chat-session.repository';

beforeAll(async () => {
	await testModules.loadModules(['chat-hub']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['ChatHubMessage', 'ChatHubSession']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('chatHub', () => {
	let chatHubService: ChatHubService;
	let messagesRepository: ChatHubMessageRepository;
	let sessionsRepository: ChatHubSessionRepository;

	let admin: User;
	let member: User;

	beforeAll(() => {
		chatHubService = Container.get(ChatHubService);
		messagesRepository = Container.get(ChatHubMessageRepository);
		sessionsRepository = Container.get(ChatHubSessionRepository);
	});

	beforeEach(async () => {
		admin = await createAdmin();
		member = await createMember();
	});

	afterEach(async () => {
		await chatHubService.deleteAllSessions();
	});

	describe('getConversations', () => {
		it('should list empty conversations', async () => {
			const conversations = await chatHubService.getConversations(member.id);
			expect(conversations).toBeDefined();
			expect(conversations).toHaveLength(0);
		});

		it("should list user's own conversations in expected order", async () => {
			const session1 = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 1',
				lastMessageAt: new Date('2025-01-03T00:00:00Z'),
			});
			const session2 = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 2',
				lastMessageAt: new Date('2025-01-02T00:00:00Z'),
			});
			const session3 = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 3',
				lastMessageAt: new Date('2025-01-01T00:00:00Z'),
			});
			await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: admin.id,
				title: 'admin session',
				lastMessageAt: new Date('2025-01-01T00:00:00Z'),
			});

			const conversations = await chatHubService.getConversations(member.id);
			expect(conversations).toHaveLength(3);
			expect(conversations[0].id).toBe(session1.id);
			expect(conversations[1].id).toBe(session2.id);
			expect(conversations[2].id).toBe(session3.id);
		});
	});

	describe('getConversation', () => {
		it('should fail to get non-existing conversation', async () => {
			await expect(
				chatHubService.getConversation(member.id, '00000000-4040-4040-4040-000000000000'),
			).rejects.toThrow('Chat session not found');
		});

		it("should fail to get another user's conversation", async () => {
			const session = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: admin.id,
				title: 'admin session',
				lastMessageAt: new Date('2025-01-01T00:00:00Z'),
			});
			await expect(chatHubService.getConversation(member.id, session.id)).rejects.toThrow(
				'Chat session not found',
			);
		});

		it('should get conversation with no messages', async () => {
			const session = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 1',
				lastMessageAt: new Date('2025-01-03T00:00:00Z'),
			});
			const conversation = await chatHubService.getConversation(member.id, session.id);
			expect(conversation).toBeDefined();
			expect(conversation.session.id).toBe(session.id);
			expect(conversation.conversation.messages).toEqual({});
		});

		it('should get conversation with messages in expected order', async () => {
			const session = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 1',
				lastMessageAt: new Date('2025-01-03T00:00:00Z'),
			});
			const ids = [
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
			];

			const msg1 = await messagesRepository.createChatMessage({
				id: ids[0],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1',
				createdAt: new Date('2025-01-03T00:00:00Z'),
			});
			const msg2 = await messagesRepository.createChatMessage({
				id: ids[1],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2',
				previousMessageId: msg1.id,
				createdAt: new Date('2025-01-03T00:05:00Z'),
			});
			const msg3 = await messagesRepository.createChatMessage({
				id: ids[2],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3',
				previousMessageId: msg2.id,
				createdAt: new Date('2025-01-03T00:10:00Z'),
			});
			const msg4 = await messagesRepository.createChatMessage({
				id: ids[3],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4',
				previousMessageId: msg3.id,
				createdAt: new Date('2025-01-03T00:15:00Z'),
			});

			const response = await chatHubService.getConversation(member.id, session.id);
			expect(response.session.id).toBe(session.id);
			expect(response).toBeDefined();

			const {
				conversation: { messages },
			} = response;

			expect(Object.keys(messages)).toHaveLength(4);
			expect(messages[msg1.id].content).toBe('message 1');
			expect(messages[msg1.id].type).toBe('human');
			expect(messages[msg2.id].content).toBe('message 2');
			expect(messages[msg2.id].type).toBe('ai');
			expect(messages[msg3.id].content).toBe('message 3');
			expect(messages[msg3.id].type).toBe('human');
			expect(messages[msg4.id].content).toBe('message 4');
			expect(messages[msg4.id].type).toBe('ai');
		});

		it('should get conversation with a edit branch', async () => {
			const ids = [
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
			];

			const session = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 1',
				lastMessageAt: new Date('2025-01-03T00:00:00Z'),
			});
			const msg1 = await messagesRepository.createChatMessage({
				id: ids[0],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1',
				createdAt: new Date('2025-01-03T00:00:00Z'),
			});
			const msg2 = await messagesRepository.createChatMessage({
				id: ids[1],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2',
				previousMessageId: msg1.id,
				createdAt: new Date('2025-01-03T00:05:00Z'),
			});
			const msg3 = await messagesRepository.createChatMessage({
				id: ids[2],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3a',
				previousMessageId: msg2.id,
				createdAt: new Date('2025-01-03T00:10:00Z'),
			});
			const msg4 = await messagesRepository.createChatMessage({
				id: ids[3],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4a',
				previousMessageId: msg3.id,
				createdAt: new Date('2025-01-03T00:15:00Z'),
			});
			// Edit message 3 to create a branch
			const msg5 = await messagesRepository.createChatMessage({
				id: ids[4],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3b',
				previousMessageId: msg2.id,
				revisionOfMessageId: msg3.id,
				createdAt: new Date('2025-01-03T00:20:00Z'),
			});
			const msg6 = await messagesRepository.createChatMessage({
				id: ids[5],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4b',
				previousMessageId: msg5.id,
				createdAt: new Date('2025-01-03T00:25:00Z'),
			});

			const response = await chatHubService.getConversation(member.id, session.id);
			expect(response.session.id).toBe(session.id);
			expect(response).toBeDefined();

			const {
				conversation: { messages },
			} = response;

			expect(Object.keys(messages)).toHaveLength(6);
			expect(messages[msg1.id].content).toBe('message 1');
			expect(messages[msg2.id].content).toBe('message 2');
			expect(messages[msg3.id].content).toBe('message 3a');
			expect(messages[msg4.id].content).toBe('message 4a');
			expect(messages[msg5.id].content).toBe('message 3b');
			expect(messages[msg6.id].content).toBe('message 4b');
			expect(messages[msg5.id].previousMessageId).toBe(msg2.id);
		});

		it('should get conversation with a edit branch at first message', async () => {
			const ids = [
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
			];
			const session = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 1',
				lastMessageAt: new Date('2025-01-03T00:00:00Z'),
			});

			const msg1 = await messagesRepository.createChatMessage({
				id: ids[0],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1a',
				createdAt: new Date('2025-01-03T00:00:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[1],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2a',
				previousMessageId: msg1.id,
				createdAt: new Date('2025-01-03T00:05:00Z'),
			});
			// Edit message 1 to create a branch
			const msg3 = await messagesRepository.createChatMessage({
				id: ids[2],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1b',
				revisionOfMessageId: msg1.id,
				createdAt: new Date('2025-01-03T00:10:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[3],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2b',
				previousMessageId: msg3.id,
				createdAt: new Date('2025-01-03T00:15:00Z'),
			});

			const response = await chatHubService.getConversation(member.id, session.id);
			expect(response.session.id).toBe(session.id);
			expect(response).toBeDefined();

			const {
				conversation: { messages },
			} = response;

			expect(Object.keys(messages)).toHaveLength(4);
		});

		it('should get conversation with a retry branch at last message', async () => {
			const ids = [
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
			];

			const session = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 1',
				lastMessageAt: new Date('2025-01-03T00:00:00Z'),
			});
			const msg1 = await messagesRepository.createChatMessage({
				id: ids[0],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1',
				createdAt: new Date('2025-01-03T00:00:00Z'),
			});
			const msg2 = await messagesRepository.createChatMessage({
				id: ids[1],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2',
				previousMessageId: msg1.id,
				createdAt: new Date('2025-01-03T00:05:00Z'),
			});
			const msg3 = await messagesRepository.createChatMessage({
				id: ids[2],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3',
				previousMessageId: msg2.id,
				createdAt: new Date('2025-01-03T00:10:00Z'),
			});
			const msg4 = await messagesRepository.createChatMessage({
				id: ids[3],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4a',
				previousMessageId: msg3.id,
				createdAt: new Date('2025-01-03T00:15:00Z'),
			});
			// Retry message 4 to create a branch
			const msg5 = await messagesRepository.createChatMessage({
				id: ids[4],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4b',
				previousMessageId: msg3.id,
				retryOfMessageId: msg4.id,
				createdAt: new Date('2025-01-03T00:20:00Z'),
			});

			const response = await chatHubService.getConversation(member.id, session.id);
			expect(response).toBeDefined();
			expect(response.session.id).toBe(session.id);

			const {
				conversation: { messages },
			} = response;

			expect(Object.keys(messages)).toHaveLength(5);
			expect(messages[msg5.id].previousMessageId).toBe(msg3.id);
			expect(messages[msg5.id].retryOfMessageId).toBe(msg4.id);
		});

		it('should get a complex conversation with multiple branches', async () => {
			// This test creates a complex conversation with multiple edits and retries to ensure
			// the conversation tree is built correctly in all cases.

			// The structure created is as follows:
			// msg1 -> msg2 -> msg3a -> msg4a
			//              -> msg3b (edit of msg3a) -> msg4b
			// msg1b (edit of msg1) -> nothing
			// msg1 -> msg2r (retry of msg2) -> msg3d -> msg4c

			const ids = [
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
			];

			const session = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 1',
				lastMessageAt: new Date('2025-01-03T00:00:00Z'),
			});
			const msg1 = await messagesRepository.createChatMessage({
				id: ids[0],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1',
				createdAt: new Date('2025-01-03T00:00:00Z'),
			});
			const msg2 = await messagesRepository.createChatMessage({
				id: ids[1],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2a',
				previousMessageId: msg1.id,
				createdAt: new Date('2025-01-03T00:05:00Z'),
			});
			const msg3a = await messagesRepository.createChatMessage({
				id: ids[2],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3a',
				previousMessageId: msg2.id,
				createdAt: new Date('2025-01-03T00:10:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[3],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4a',
				previousMessageId: msg3a.id,
				createdAt: new Date('2025-01-03T00:15:00Z'),
			});
			const msg3b = await messagesRepository.createChatMessage({
				id: ids[4],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3b',
				revisionOfMessageId: msg3a.id,
				previousMessageId: msg2.id,
				createdAt: new Date('2025-01-03T00:20:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[5],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4b',
				previousMessageId: msg3b.id,
				createdAt: new Date('2025-01-03T00:25:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[6],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1b',
				revisionOfMessageId: msg1.id,
				createdAt: new Date('2025-01-03T00:30:00Z'),
			});
			const msg2r = await messagesRepository.createChatMessage({
				id: ids[7],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2b',
				previousMessageId: msg1.id,
				retryOfMessageId: msg2.id,
				createdAt: new Date('2025-01-03T00:35:00Z'),
			});
			const msg3d = await messagesRepository.createChatMessage({
				id: ids[8],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3d',
				previousMessageId: msg2r.id,
				createdAt: new Date('2025-01-03T00:40:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: crypto.randomUUID(),
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4c',
				previousMessageId: msg3d.id,
				createdAt: new Date('2025-01-03T00:45:00Z'),
			});

			const response = await chatHubService.getConversation(member.id, session.id);
			expect(response).toBeDefined();
			expect(response.session.id).toBe(session.id);

			const {
				conversation: { messages },
			} = response;

			expect(Object.keys(messages)).toHaveLength(10);

			expect(messages[msg2r.id].previousMessageId).toBe(msg1.id);
			expect(messages[msg2r.id].retryOfMessageId).toBe(msg2.id);
		});
	});
});
