import { mockInstance, testDb, testModules, createActiveWorkflow } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createAdmin, createMember } from '@test-integration/db/users';
import { BinaryDataService } from 'n8n-core';
import { CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { ChatHubAgentRepository } from '../chat-hub-agent.repository';
import { ChatHubService } from '../chat-hub.service';
import { ChatHubMessageRepository } from '../chat-message.repository';
import { ChatHubSessionRepository } from '../chat-session.repository';

mockInstance(BinaryDataService);

beforeAll(async () => {
	await testModules.loadModules(['chat-hub']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['ChatHubMessage', 'ChatHubSession', 'ChatHubAgent']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('chatHub', () => {
	let chatHubService: ChatHubService;
	let messagesRepository: ChatHubMessageRepository;
	let sessionsRepository: ChatHubSessionRepository;
	let agentRepository: ChatHubAgentRepository;

	let admin: User;
	let member: User;

	beforeAll(() => {
		chatHubService = Container.get(ChatHubService);
		messagesRepository = Container.get(ChatHubMessageRepository);
		sessionsRepository = Container.get(ChatHubSessionRepository);
		agentRepository = Container.get(ChatHubAgentRepository);
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
			const conversations = await chatHubService.getConversations(member.id, 20);
			expect(conversations).toBeDefined();
			expect(conversations.data).toHaveLength(0);
		});

		it("should list user's own conversations in expected order", async () => {
			const session1 = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 1',
				lastMessageAt: new Date('2025-01-03T00:00:00Z'),
				tools: [],
			});
			const session2 = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 2',
				lastMessageAt: new Date('2025-01-02T00:00:00Z'),
				tools: [],
			});
			const session3 = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 3',
				lastMessageAt: new Date('2025-01-01T00:00:00Z'),
				tools: [],
			});
			await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: admin.id,
				title: 'admin session',
				lastMessageAt: new Date('2025-01-01T00:00:00Z'),
				tools: [],
			});

			const conversations = await chatHubService.getConversations(member.id, 20);
			expect(conversations.data).toHaveLength(3);
			expect(conversations.data[0].id).toBe(session1.id);
			expect(conversations.data[1].id).toBe(session2.id);
			expect(conversations.data[2].id).toBe(session3.id);
		});

		it('should return agentIcon for sessions with custom agents', async () => {
			const agent = await agentRepository.createAgent({
				id: crypto.randomUUID(),
				name: 'Test Agent',
				description: 'Test agent description',
				icon: { type: 'emoji', value: '🤖' },
				systemPrompt: 'You are a helpful assistant',
				ownerId: member.id,
				provider: 'openai',
				model: 'gpt-4',
				credentialId: null,
				tools: [],
			});

			await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session with agent',
				lastMessageAt: new Date('2025-01-01T00:00:00Z'),
				provider: 'custom-agent',
				agentId: agent.id,
				tools: [],
			});

			const conversations = await chatHubService.getConversations(member.id, 20);
			expect(conversations.data).toHaveLength(1);
			expect(conversations.data[0].agentIcon).toEqual({ type: 'emoji', value: '🤖' });
		});

		it('should return agentIcon for sessions with n8n workflow agents', async () => {
			const projectRepository = Container.get(ProjectRepository);

			// Get member's personal project
			const project = await projectRepository.getPersonalProjectForUserOrFail(member.id);

			// Update the project with an icon
			await projectRepository.update(project.id, {
				icon: { type: 'icon', value: 'workflow' },
			});

			// Create an active workflow with chat trigger
			const workflow = await createActiveWorkflow(
				{
					name: 'Chat Workflow',
					nodes: [
						{
							id: 'chat-trigger-1',
							name: 'Chat Trigger',
							type: CHAT_TRIGGER_NODE_TYPE,
							typeVersion: 1.4,
							position: [0, 0],
							parameters: {
								availableInChat: true,
							},
						},
					],
					connections: {},
				},
				member,
			);

			// Create a session with the workflow
			await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session with workflow',
				lastMessageAt: new Date('2025-01-01T00:00:00Z'),
				provider: 'n8n',
				workflowId: workflow.id,
				tools: [],
			});

			const conversations = await chatHubService.getConversations(member.id, 20);
			expect(conversations.data).toHaveLength(1);
			expect(conversations.data[0].agentIcon).toEqual({ type: 'icon', value: 'workflow' });
		});

		describe('pagination', () => {
			it('should return hasMore=false and nextCursor=null when all sessions fit in one page', async () => {
				await sessionsRepository.createChatSession({
					id: crypto.randomUUID(),
					ownerId: member.id,
					title: 'session 1',
					lastMessageAt: new Date('2025-01-01T00:00:00Z'),
					tools: [],
				});

				const conversations = await chatHubService.getConversations(member.id, 10);

				expect(conversations.data).toHaveLength(1);
				expect(conversations.hasMore).toBe(false);
				expect(conversations.nextCursor).toBeNull();
			});

			it('should fetch next page using cursor', async () => {
				const session1 = await sessionsRepository.createChatSession({
					id: crypto.randomUUID(),
					ownerId: member.id,
					title: 'session 1',
					lastMessageAt: new Date('2025-01-05T00:00:00Z'),
					tools: [],
				});

				const session2 = await sessionsRepository.createChatSession({
					id: crypto.randomUUID(),
					ownerId: member.id,
					title: 'session 2',
					lastMessageAt: new Date('2025-01-04T00:00:00Z'),
					tools: [],
				});

				const session3 = await sessionsRepository.createChatSession({
					id: crypto.randomUUID(),
					ownerId: member.id,
					title: 'session 3',
					lastMessageAt: new Date('2025-01-03T00:00:00Z'),
					tools: [],
				});

				const session4 = await sessionsRepository.createChatSession({
					id: crypto.randomUUID(),
					ownerId: member.id,
					title: 'session 4',
					lastMessageAt: new Date('2025-01-02T00:00:00Z'),
					tools: [],
				});

				// First page
				const page1 = await chatHubService.getConversations(member.id, 2);
				expect(page1.data).toHaveLength(2);
				expect(page1.data[0].id).toBe(session1.id);
				expect(page1.data[1].id).toBe(session2.id);
				expect(page1.hasMore).toBe(true);
				expect(page1.nextCursor).toBe(session2.id);

				// Second page using cursor
				const page2 = await chatHubService.getConversations(member.id, 2, page1.nextCursor!);
				expect(page2.data).toHaveLength(2);
				expect(page2.data[0].id).toBe(session3.id);
				expect(page2.data[1].id).toBe(session4.id);
				expect(page2.hasMore).toBe(false);
				expect(page2.nextCursor).toBeNull();
			});

			it('should handle sessions with same lastMessageAt using id for ordering', async () => {
				const sameDate = new Date('2025-01-01T00:00:00Z');

				const session1 = await sessionsRepository.createChatSession({
					id: '00000000-0000-0000-0000-000000000001',
					ownerId: member.id,
					title: 'Session 1',
					lastMessageAt: sameDate,
					tools: [],
				});

				const session2 = await sessionsRepository.createChatSession({
					id: '00000000-0000-0000-0000-000000000002',
					ownerId: member.id,
					title: 'Session 2',
					lastMessageAt: sameDate,
					tools: [],
				});

				const session3 = await sessionsRepository.createChatSession({
					id: '00000000-0000-0000-0000-000000000003',
					ownerId: member.id,
					title: 'Session 3',
					lastMessageAt: sameDate,
					tools: [],
				});

				// Fetch first page
				const page1 = await chatHubService.getConversations(member.id, 2);
				expect(page1.data).toHaveLength(2);
				expect(page1.data[0].id).toBe(session1.id);
				expect(page1.data[1].id).toBe(session2.id);
				expect(page1.hasMore).toBe(true);

				// Fetch second page
				const page2 = await chatHubService.getConversations(member.id, 2, page1.nextCursor!);
				expect(page2.data).toHaveLength(1);
				expect(page2.data[0].id).toBe(session3.id);
				expect(page2.hasMore).toBe(false);
			});

			it('should throw error when cursor session does not exist', async () => {
				await sessionsRepository.createChatSession({
					id: crypto.randomUUID(),
					ownerId: member.id,
					title: 'session 1',
					lastMessageAt: new Date('2025-01-01T00:00:00Z'),
					tools: [],
				});

				const nonExistentCursor = '00000000-0000-0000-0000-000000000000';

				await expect(
					chatHubService.getConversations(member.id, 10, nonExistentCursor),
				).rejects.toThrow('Cursor session not found');
			});

			it('should throw error when cursor session belongs to different user', async () => {
				await sessionsRepository.createChatSession({
					id: crypto.randomUUID(),
					ownerId: member.id,
					title: 'Member Session',
					lastMessageAt: new Date('2025-01-02T00:00:00Z'),
					tools: [],
				});

				const adminSession = await sessionsRepository.createChatSession({
					id: crypto.randomUUID(),
					ownerId: admin.id,
					title: 'Admin Session',
					lastMessageAt: new Date('2025-01-01T00:00:00Z'),
					tools: [],
				});

				await expect(
					chatHubService.getConversations(member.id, 10, adminSession.id),
				).rejects.toThrow('Cursor session not found');
			});

			it('should disallow sessions without lastMessageAt', async () => {
				await expect(
					sessionsRepository.createChatSession({
						id: crypto.randomUUID(),
						ownerId: member.id,
						title: 'Session with date',
						tools: [],
					}),
				).rejects.toThrow();
			});
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
				tools: [],
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
				tools: [],
			});
			const conversation = await chatHubService.getConversation(member.id, session.id);
			expect(conversation).toBeDefined();
			expect(conversation.session.id).toBe(session.id);
			expect(conversation.conversation.messages).toEqual({});
		});

		it('should return agentIcon for conversation with custom agent', async () => {
			const agent = await agentRepository.createAgent({
				id: crypto.randomUUID(),
				name: 'Test Agent',
				description: 'Test agent description',
				icon: { type: 'emoji', value: '🤖' },
				systemPrompt: 'You are a helpful assistant',
				ownerId: member.id,
				provider: 'openai',
				model: 'gpt-4',
				credentialId: null,
				tools: [],
			});

			const session = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session with agent',
				lastMessageAt: new Date('2025-01-01T00:00:00Z'),
				provider: 'custom-agent',
				agentId: agent.id,
				tools: [],
			});

			const conversation = await chatHubService.getConversation(member.id, session.id);
			expect(conversation).toBeDefined();
			expect(conversation.session.agentIcon).toEqual({ type: 'emoji', value: '🤖' });
		});

		it('should return agentIcon for conversation with n8n workflow agent', async () => {
			const projectRepository = Container.get(ProjectRepository);

			// Get member's personal project
			const project = await projectRepository.getPersonalProjectForUserOrFail(member.id);

			// Update the project with an icon
			await projectRepository.update(project.id, {
				icon: { type: 'icon', value: 'workflow' },
			});

			// Create an active workflow with chat trigger
			const workflow = await createActiveWorkflow(
				{
					name: 'Chat Workflow',
					nodes: [
						{
							id: 'chat-trigger-1',
							name: 'Chat Trigger',
							type: CHAT_TRIGGER_NODE_TYPE,
							typeVersion: 1.4,
							position: [0, 0],
							parameters: {
								availableInChat: true,
							},
						},
					],
					connections: {},
				},
				member,
			);

			// Create a session with the workflow
			const session = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session with workflow',
				lastMessageAt: new Date('2025-01-01T00:00:00Z'),
				provider: 'n8n',
				workflowId: workflow.id,
				tools: [],
			});

			const conversation = await chatHubService.getConversation(member.id, session.id);
			expect(conversation).toBeDefined();
			expect(conversation.session.agentIcon).toEqual({ type: 'icon', value: 'workflow' });
		});

		it('should get conversation with messages in expected order', async () => {
			const session = await sessionsRepository.createChatSession({
				id: crypto.randomUUID(),
				ownerId: member.id,
				title: 'session 1',
				lastMessageAt: new Date('2025-01-03T00:00:00Z'),
				tools: [],
			});
			const ids = [
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
				crypto.randomUUID(),
			];

			await messagesRepository.createChatMessage({
				id: ids[0],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1',
				createdAt: new Date('2025-01-03T00:00:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[1],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2',
				previousMessageId: ids[0],
				createdAt: new Date('2025-01-03T00:05:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[2],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3',
				previousMessageId: ids[1],
				createdAt: new Date('2025-01-03T00:10:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[3],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4',
				previousMessageId: ids[2],
				createdAt: new Date('2025-01-03T00:15:00Z'),
			});

			const response = await chatHubService.getConversation(member.id, session.id);
			expect(response.session.id).toBe(session.id);
			expect(response).toBeDefined();

			const {
				conversation: { messages },
			} = response;

			expect(Object.keys(messages)).toHaveLength(4);
			expect(messages[ids[0]].content).toBe('message 1');
			expect(messages[ids[0]].type).toBe('human');
			expect(messages[ids[1]].content).toBe('message 2');
			expect(messages[ids[1]].type).toBe('ai');
			expect(messages[ids[2]].content).toBe('message 3');
			expect(messages[ids[2]].type).toBe('human');
			expect(messages[ids[3]].content).toBe('message 4');
			expect(messages[ids[3]].type).toBe('ai');
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
				tools: [],
			});
			await messagesRepository.createChatMessage({
				id: ids[0],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1',
				createdAt: new Date('2025-01-03T00:00:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[1],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2',
				previousMessageId: ids[0],
				createdAt: new Date('2025-01-03T00:05:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[2],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3a',
				previousMessageId: ids[1],
				createdAt: new Date('2025-01-03T00:10:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[3],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4a',
				previousMessageId: ids[2],
				createdAt: new Date('2025-01-03T00:15:00Z'),
			});
			// Edit message 3 to create a branch
			await messagesRepository.createChatMessage({
				id: ids[4],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3b',
				previousMessageId: ids[1],
				revisionOfMessageId: ids[2],
				createdAt: new Date('2025-01-03T00:20:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[5],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4b',
				previousMessageId: ids[4],
				createdAt: new Date('2025-01-03T00:25:00Z'),
			});

			const response = await chatHubService.getConversation(member.id, session.id);
			expect(response.session.id).toBe(session.id);
			expect(response).toBeDefined();

			const {
				conversation: { messages },
			} = response;

			expect(Object.keys(messages)).toHaveLength(6);
			expect(messages[ids[0]].content).toBe('message 1');
			expect(messages[ids[1]].content).toBe('message 2');
			expect(messages[ids[2]].content).toBe('message 3a');
			expect(messages[ids[3]].content).toBe('message 4a');
			expect(messages[ids[4]].content).toBe('message 3b');
			expect(messages[ids[5]].content).toBe('message 4b');
			expect(messages[ids[4]].previousMessageId).toBe(ids[1]);
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
				tools: [],
			});

			await messagesRepository.createChatMessage({
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
				previousMessageId: ids[0],
				createdAt: new Date('2025-01-03T00:05:00Z'),
			});
			// Edit message 1 to create a branch
			await messagesRepository.createChatMessage({
				id: ids[2],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1b',
				revisionOfMessageId: ids[0],
				createdAt: new Date('2025-01-03T00:10:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[3],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2b',
				previousMessageId: ids[2],
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
				tools: [],
			});
			await messagesRepository.createChatMessage({
				id: ids[0],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1',
				createdAt: new Date('2025-01-03T00:00:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[1],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2',
				previousMessageId: ids[0],
				createdAt: new Date('2025-01-03T00:05:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[2],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3',
				previousMessageId: ids[1],
				createdAt: new Date('2025-01-03T00:10:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[3],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4a',
				previousMessageId: ids[2],
				createdAt: new Date('2025-01-03T00:15:00Z'),
			});
			// Retry message 4 to create a branch
			await messagesRepository.createChatMessage({
				id: ids[4],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4b',
				previousMessageId: ids[2],
				retryOfMessageId: ids[3],
				createdAt: new Date('2025-01-03T00:20:00Z'),
			});

			const response = await chatHubService.getConversation(member.id, session.id);
			expect(response).toBeDefined();
			expect(response.session.id).toBe(session.id);

			const {
				conversation: { messages },
			} = response;

			expect(Object.keys(messages)).toHaveLength(5);
			expect(messages[ids[4]].previousMessageId).toBe(ids[2]);
			expect(messages[ids[4]].retryOfMessageId).toBe(ids[3]);
		});

		it('should get a complex conversation with multiple branches', async () => {
			// This test creates a complex conversation with multiple edits and retries to ensure
			// the conversation tree is built correctly in all cases.
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
				tools: [],
			});
			await messagesRepository.createChatMessage({
				id: ids[0],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1',
				createdAt: new Date('2025-01-03T00:00:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[1],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2a',
				previousMessageId: ids[0],
				createdAt: new Date('2025-01-03T00:05:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[2],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3a',
				previousMessageId: ids[1],
				createdAt: new Date('2025-01-03T00:10:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[3],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4a',
				previousMessageId: ids[2],
				createdAt: new Date('2025-01-03T00:15:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[4],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3b',
				revisionOfMessageId: ids[2],
				previousMessageId: ids[1],
				createdAt: new Date('2025-01-03T00:20:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[5],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4b',
				previousMessageId: ids[4],
				createdAt: new Date('2025-01-03T00:25:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[6],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 1b',
				revisionOfMessageId: ids[0],
				createdAt: new Date('2025-01-03T00:30:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[7],
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 2b',
				previousMessageId: ids[0],
				retryOfMessageId: ids[1],
				createdAt: new Date('2025-01-03T00:35:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: ids[8],
				sessionId: session.id,
				name: 'Nathan',
				type: 'human',
				content: 'message 3d',
				previousMessageId: ids[7],
				createdAt: new Date('2025-01-03T00:40:00Z'),
			});
			await messagesRepository.createChatMessage({
				id: crypto.randomUUID(),
				sessionId: session.id,
				name: 'ChatGPT',
				type: 'ai',
				content: 'message 4c',
				previousMessageId: ids[8],
				createdAt: new Date('2025-01-03T00:45:00Z'),
			});

			const response = await chatHubService.getConversation(member.id, session.id);
			expect(response).toBeDefined();
			expect(response.session.id).toBe(session.id);

			const {
				conversation: { messages },
			} = response;

			expect(Object.keys(messages)).toHaveLength(10);

			expect(messages[ids[7]].previousMessageId).toBe(ids[0]);
			expect(messages[ids[7]].retryOfMessageId).toBe(ids[1]);
		});
	});
});
