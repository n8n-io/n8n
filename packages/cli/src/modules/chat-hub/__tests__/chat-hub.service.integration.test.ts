/* eslint-disable @typescript-eslint/naming-convention */
import type { ChatHubExecutionEnd, ChatHubStreamError } from '@n8n/api-types';
import { mockInstance, testDb, testModules, createActiveWorkflow } from '@n8n/backend-test-utils';
import type { User, CredentialsEntity } from '@n8n/db';
import { ExecutionRepository, SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { InstanceSettings, BinaryDataService, Cipher } from 'n8n-core';
import {
	CHAT_TRIGGER_NODE_TYPE,
	CHAT_NODE_TYPE,
	createRunExecutionData,
	NodeOperationError,
	type INode,
	type IRun,
} from 'n8n-workflow';

import { saveCredential } from '@test-integration/db/credentials';
import { createAdmin, createMember } from '@test-integration/db/users';
import { retryUntil } from '@test-integration/retry-until';

import { ActiveExecutions } from '../../../active-executions';
import { ChatExecutionManager } from '../../../chat/chat-execution-manager';
import { ExecutionPersistence } from '../../../executions/execution-persistence';
import { Push } from '../../../push';
import { WorkflowExecutionService } from '../../../workflows/workflow-execution.service';
import { ChatHubAgentRepository } from '../chat-hub-agent.repository';
import * as chatHubConstants from '../chat-hub.constants';
import { ChatHubService } from '../chat-hub.service';
import { ChatHubMessageRepository } from '../chat-message.repository';
import { ChatHubSessionRepository } from '../chat-session.repository';

mockInstance(BinaryDataService);
mockInstance(WorkflowExecutionService);
const mockPush = mockInstance(Push);
mockPush.sendToUsers.mockReturnValue(undefined);
const mockCipher = mockInstance(Cipher);
mockCipher.encrypt.mockReturnValue('encrypted-metadata');

beforeAll(async () => {
	await testModules.loadModules(['chat-hub']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate([
		'ChatHubMessage',
		'ChatHubSession',
		'ChatHubAgent',
		'ExecutionEntity',
		'WorkflowEntity',
		'SharedCredentials',
		'CredentialsEntity',
	]);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('chatHub', () => {
	let chatHubService: ChatHubService;
	let messagesRepository: ChatHubMessageRepository;
	let sessionsRepository: ChatHubSessionRepository;
	let agentRepository: ChatHubAgentRepository;
	let executionRepository: ExecutionRepository;
	let executionPersistence: ExecutionPersistence;
	let instanceSettings: InstanceSettings;
	let settingsRepository: SettingsRepository;

	let admin: User;
	let member: User;

	beforeAll(() => {
		chatHubService = Container.get(ChatHubService);
		messagesRepository = Container.get(ChatHubMessageRepository);
		sessionsRepository = Container.get(ChatHubSessionRepository);
		agentRepository = Container.get(ChatHubAgentRepository);
		executionRepository = Container.get(ExecutionRepository);
		executionPersistence = Container.get(ExecutionPersistence);
		instanceSettings = Container.get(InstanceSettings);
		settingsRepository = Container.get(SettingsRepository);
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
			const agentIcon = { type: 'icon', value: 'workflow' };

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
								agentIcon,
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
			expect(conversations.data[0].agentIcon).toEqual(agentIcon);
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
			const agentIcon = { type: 'icon', value: 'workflow' };

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
								agentIcon,
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
			expect(conversation.session.agentIcon).toEqual(agentIcon);
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

	describe('sendHumanMessage', () => {
		describe('Base LLM chats', () => {
			let anthropicCredential: CredentialsEntity;

			let sessionId: string;
			let messageId: string;

			let spyExecute: jest.SpyInstance<
				ReturnType<WorkflowExecutionService['executeChatWorkflow']>,
				Parameters<WorkflowExecutionService['executeChatWorkflow']>
			>;
			let finishRun = (_: IRun) => {};

			beforeEach(async () => {
				jest.spyOn(instanceSettings, 'isMultiMain', 'get').mockReturnValue(false);

				// Mock settings repository to allow anthropic provider
				jest.spyOn(settingsRepository, 'findByKey').mockResolvedValue(null);

				spyExecute = jest.spyOn(Container.get(WorkflowExecutionService), 'executeChatWorkflow');

				jest
					.spyOn(Container.get(ActiveExecutions), 'getPostExecutePromise')
					// eslint-disable-next-line @typescript-eslint/promise-function-async
					.mockImplementation(() => {
						return new Promise((r) => {
							finishRun = r;
						});
					});

				// Create an Anthropic credential for testing
				anthropicCredential = await saveCredential(
					{
						name: 'Test Anthropic Credential',
						type: 'anthropicApi',
						data: { apiKey: 'test-api-key' },
					},
					{ user: member, role: 'credential:owner' },
				);

				sessionId = crypto.randomUUID();
				messageId = crypto.randomUUID();
			});

			it('should respond and persist generated response chunks sent from workflow execution', async () => {
				// First call: main message execution with stream
				spyExecute.mockImplementationOnce(async (_user, workflowData, executionData, stream) => {
					const executionId = await executionPersistence.create({
						finished: false,
						mode: 'chat',
						status: 'running',
						workflowId: workflowData.id,
						data: executionData,
						workflowData,
					});

					setTimeout(() => stream!.write('{"type":"begin","metadata":{}}\n'));
					setTimeout(() =>
						stream!.write('{"type":"item","content":"How are you?","metadata":{}}\n'),
					);
					setTimeout(() => stream!.write('{"type":"end","metadata":{}}\n'));
					setTimeout(() => stream!.end());
					setTimeout(async () => {
						await executionRepository.updateExistingExecution(executionId, { status: 'success' });
					});
					setTimeout(() => finishRun({} as IRun));

					return { executionId };
				});

				// Second call: title generation (don't care in this test)
				spyExecute.mockRejectedValue(Error());

				await chatHubService.sendHumanMessage(
					member,
					{
						userId: member.id,
						sessionId,
						messageId,
						message: 'Test message',
						model: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
						credentials: {
							anthropicApi: { id: anthropicCredential.id, name: anthropicCredential.name },
						},
						previousMessageId: null,
						tools: [],
						attachments: [],
					},
					{
						authToken: 'authtoken',
						method: 'POST',
						endpoint: '/api/chat/message',
					},
				);

				const messages = await retryUntil(async () => {
					const messages = await messagesRepository.getManyBySessionId(sessionId);
					expect(messages[1]?.status).toBe('success');
					return messages;
				});

				expect(messages[0]?.sessionId).toBe(sessionId);
				expect(messages[0]?.id).toBe(messageId);
				expect(messages[0]?.type).toBe('human');
				expect(messages[0]?.status).toBe('success');
				expect(messages[0]?.content).toBe('Test message');
				expect(messages[0]?.previousMessageId).toBeNull();

				expect(messages[1]?.sessionId).toBe(sessionId);
				expect(messages[1]?.type).toBe('ai');
				expect(messages[1]?.status).toBe('success');
				expect(messages[1]?.content).toBe('How are you?');
				expect(messages[1]?.previousMessageId).toBe(messageId);
			});

			it('should respond and persist an error chunk sent from workflow execution', async () => {
				// First call: main message execution with stream
				spyExecute.mockImplementationOnce(async (_user, workflowData, executionData, stream) => {
					const executionId = await executionPersistence.create({
						finished: false,
						mode: 'chat',
						status: 'running',
						workflowId: workflowData.id,
						data: executionData,
						workflowData,
					});

					setTimeout(() => stream!.write('{"type":"begin","metadata":{}}\n'));
					setTimeout(() => stream!.write('{"type":"error","content":"chunk error","metadata":{}}'));
					setTimeout(() => stream!.end());
					setTimeout(async () => {
						await executionRepository.updateExistingExecution(executionId, { status: 'error' });
					});
					setTimeout(() => finishRun({} as IRun));

					return { executionId };
				});

				// Second call: title generation (don't care in this test)
				spyExecute.mockRejectedValue(Error());

				await chatHubService.sendHumanMessage(
					member,
					{
						userId: member.id,
						sessionId,
						messageId,
						message: 'Test message',
						model: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
						credentials: {
							anthropicApi: { id: anthropicCredential.id, name: anthropicCredential.name },
						},
						previousMessageId: null,
						tools: [],
						attachments: [],
					},
					{
						authToken: 'authtoken',
						method: 'POST',
						endpoint: '/api/chat/message',
					},
				);

				const messages = await retryUntil(async () => {
					const messages = await messagesRepository.getManyBySessionId(sessionId);
					expect(messages[1]?.status).toBe('error');
					return messages;
				});

				expect(messages[0]?.sessionId).toBe(sessionId);
				expect(messages[0]?.id).toBe(messageId);
				expect(messages[0]?.type).toBe('human');
				expect(messages[0]?.status).toBe('success');
				expect(messages[0]?.content).toBe('Test message');
				expect(messages[0]?.previousMessageId).toBeNull();

				expect(messages[1]?.sessionId).toBe(sessionId);
				expect(messages[1]?.type).toBe('ai');
				expect(messages[1]?.status).toBe('error');
				expect(messages[1]?.content).toBe('chunk error');
				expect(messages[1]?.previousMessageId).toBe(messageId);
			});

			it('should respond and persist an error set in the workflow execution', async () => {
				// First call: main message execution with stream
				spyExecute.mockImplementationOnce(async (_user, workflowData, executionData, stream) => {
					const executionId = await executionPersistence.create({
						finished: false,
						mode: 'chat',
						status: 'running',
						workflowId: workflowData.id,
						data: executionData,
						workflowData,
					});

					setTimeout(() => stream!.write('{"type":"begin","metadata":{}}\n'));
					setTimeout(() => stream!.write('{"type":"error","metadata":{}}\n'));

					// Simulate an extra message after error that caused CHA-97
					setTimeout(() => stream!.write('{"type":"begin","metadata":{}}\n'));
					setTimeout(() => stream!.write('{"type":"end","metadata":{}}\n'));

					setTimeout(() => stream!.end());
					setTimeout(async () => {
						await executionRepository.updateExistingExecution(executionId, {
							status: 'error',
							data: createRunExecutionData({
								resultData: {
									runData: {},
									error: new NodeOperationError(mock<INode>(), 'wf error'),
								},
							}),
						});
					});
					setTimeout(() => finishRun({} as IRun));
					return { executionId };
				});

				// Second call: title generation (don't care in this test)
				spyExecute.mockRejectedValue(Error());

				await chatHubService.sendHumanMessage(
					member,
					{
						userId: member.id,
						sessionId,
						messageId,
						message: 'Test message',
						model: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
						credentials: {
							anthropicApi: { id: anthropicCredential.id, name: anthropicCredential.name },
						},
						previousMessageId: null,
						tools: [],
						attachments: [],
					},
					{
						authToken: 'authtoken',
						method: 'POST',
						endpoint: '/api/chat/message',
					},
				);

				const messages = await retryUntil(async () => {
					const messages = await messagesRepository.getManyBySessionId(sessionId);
					expect(messages[1]?.status).toBe('error');
					return messages;
				});

				expect(messages[0]?.sessionId).toBe(sessionId);
				expect(messages[0]?.id).toBe(messageId);
				expect(messages[0]?.type).toBe('human');
				expect(messages[0]?.status).toBe('success');
				expect(messages[0]?.content).toBe('Test message');
				expect(messages[0]?.previousMessageId).toBeNull();

				expect(messages[1]?.sessionId).toBe(sessionId);
				expect(messages[1]?.type).toBe('ai');
				expect(messages[1]?.status).toBe('error');
				expect(messages[1]?.content).toBe('wf error');
				expect(messages[1]?.previousMessageId).toBe(messageId);
			});

			it('should handle early errors before streaming starts by saving error message and notifying frontend', async () => {
				// Mock executeChatWorkflow to throw immediately before any streaming starts
				spyExecute.mockRejectedValueOnce(new Error('Early execution failure'));

				// Clear previous push calls
				mockPush.sendToUsers.mockClear();

				await chatHubService.sendHumanMessage(
					member,
					{
						userId: member.id,
						sessionId,
						messageId,
						message: 'Test message',
						model: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
						credentials: {
							anthropicApi: { id: anthropicCredential.id, name: anthropicCredential.name },
						},
						previousMessageId: null,
						tools: [],
						attachments: [],
					},
					{
						authToken: 'authtoken',
						method: 'POST',
						endpoint: '/api/chat/message',
					},
				);

				// Wait for the error to be processed
				const messages = await retryUntil(async () => {
					const messages = await messagesRepository.getManyBySessionId(sessionId);
					expect(messages.length).toBeGreaterThanOrEqual(2);
					expect(messages[1]?.status).toBe('error');
					return messages;
				});

				// Verify human message was saved
				expect(messages[0]?.sessionId).toBe(sessionId);
				expect(messages[0]?.id).toBe(messageId);
				expect(messages[0]?.type).toBe('human');
				expect(messages[0]?.status).toBe('success');
				expect(messages[0]?.content).toBe('Test message');

				// Verify error AI message was saved with proper linking
				expect(messages[1]?.sessionId).toBe(sessionId);
				expect(messages[1]?.type).toBe('ai');
				expect(messages[1]?.status).toBe('error');
				expect(messages[1]?.content).toBe('Early execution failure');
				expect(messages[1]?.previousMessageId).toBe(messageId);

				// Verify frontend was notified via push
				const pushCalls = mockPush.sendToUsers.mock.calls;
				const errorEvent = pushCalls.find(
					(call) => call[0]?.type === 'chatHubStreamError' && call[1]?.includes(member.id),
				) as [ChatHubStreamError, string[]] | undefined;
				expect(errorEvent).toBeDefined();
				expect(errorEvent![0].data.error).toBe('Early execution failure');
				expect(errorEvent![0].data.sessionId).toBe(sessionId);

				// Verify execution end was sent with error status
				const endEvent = pushCalls.find(
					(call) =>
						call[0]?.type === 'chatHubExecutionEnd' &&
						call[0]?.data?.status === 'error' &&
						call[1]?.includes(member.id),
				) as [ChatHubExecutionEnd, string[]] | undefined;
				expect(endEvent).toBeDefined();
				expect(endEvent![0].data.sessionId).toBe(sessionId);
			});
		});

		describe('n8n workflow agents', () => {
			let sessionId: string;
			let messageId: string;

			let spyExecute: jest.SpyInstance<
				ReturnType<WorkflowExecutionService['executeChatWorkflow']>,
				Parameters<WorkflowExecutionService['executeChatWorkflow']>
			>;
			let finishRun = (_: IRun) => {};

			beforeEach(() => {
				jest.spyOn(instanceSettings, 'isMultiMain', 'get').mockReturnValue(false);

				// Mock settings repository
				jest.spyOn(settingsRepository, 'findByKey').mockResolvedValue(null);

				spyExecute = jest.spyOn(Container.get(WorkflowExecutionService), 'executeChatWorkflow');

				jest
					.spyOn(Container.get(ActiveExecutions), 'getPostExecutePromise')
					// eslint-disable-next-line @typescript-eslint/promise-function-async
					.mockImplementation(() => {
						return new Promise((r) => {
							finishRun = r;
						});
					});

				sessionId = crypto.randomUUID();
				messageId = crypto.randomUUID();
			});

			describe('"When Last Node Finishes" response mode', () => {
				it('should respond with "lastNode" response mode and extract output from json', async () => {
					// Create an active workflow with chat trigger configured for lastNode response mode
					const workflow = await createActiveWorkflow(
						{
							name: 'Last Node Chat Workflow',
							nodes: [
								{
									id: 'chat-trigger-1',
									name: 'Chat Trigger',
									type: CHAT_TRIGGER_NODE_TYPE,
									typeVersion: 1.4,
									position: [0, 0],
									parameters: {
										availableInChat: true,
										options: {
											responseMode: 'lastNode',
										},
									},
								},
								{
									id: 'agent-1',
									name: 'AI Agent',
									type: '@n8n/n8n-nodes-langchain.agent',
									typeVersion: 2.2,
									position: [200, 0],
									parameters: {},
								},
							],
							connections: {
								'Chat Trigger': {
									main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
								},
							},
						},
						member,
					);

					// Mock the execution to return lastNode output
					spyExecute.mockImplementationOnce(async (_user, workflowData, executionData) => {
						const executionId = await executionPersistence.create({
							finished: false,
							mode: 'webhook',
							status: 'running',
							workflowId: workflowData.id,
							data: executionData,
							workflowData,
						});

						// Update execution with successful result
						setTimeout(async () => {
							await executionRepository.updateExistingExecution(executionId, {
								status: 'success',
								data: createRunExecutionData({
									resultData: {
										runData: {
											'AI Agent': [
												{
													startTime: Date.now(),
													executionTime: 100,
													executionIndex: 0,
													executionStatus: 'success',
													source: [],
													data: {
														main: [
															[
																{
																	json: { output: 'Hello from last node!' },
																},
															],
														],
													},
												},
											],
										},
										lastNodeExecuted: 'AI Agent',
									},
								}),
							});
							finishRun({} as IRun);
						});

						return { executionId };
					});

					await chatHubService.sendHumanMessage(
						member,
						{
							userId: member.id,
							sessionId,
							messageId,
							message: 'Test message',
							model: { provider: 'n8n', workflowId: workflow.id },
							credentials: {},
							previousMessageId: null,
							tools: [],
							attachments: [],
						},
						{
							authToken: 'authtoken',
							method: 'POST',
							endpoint: '/api/chat/message',
						},
					);

					const messages = await retryUntil(async () => {
						const messages = await messagesRepository.getManyBySessionId(sessionId);
						expect(messages.length).toBeGreaterThanOrEqual(2);
						expect(messages[1]?.status).toBe('success');
						return messages;
					});

					// Verify human message
					expect(messages[0]?.type).toBe('human');
					expect(messages[0]?.content).toBe('Test message');

					// Verify AI message with lastNode output
					expect(messages[1]?.type).toBe('ai');
					expect(messages[1]?.status).toBe('success');
					expect(messages[1]?.content).toBe('Hello from last node!');
				});

				it('should respond with "lastNode" response mode and handle errors', async () => {
					// Create an active workflow with chat trigger configured for lastNode response mode
					const workflow = await createActiveWorkflow(
						{
							name: 'Last Node Error Workflow',
							nodes: [
								{
									id: 'chat-trigger-1',
									name: 'Chat Trigger',
									type: CHAT_TRIGGER_NODE_TYPE,
									typeVersion: 1.4,
									position: [0, 0],
									parameters: {
										availableInChat: true,
										options: {
											responseMode: 'lastNode',
										},
									},
								},
								{
									id: 'agent-1',
									name: 'AI Agent',
									type: '@n8n/n8n-nodes-langchain.agent',
									typeVersion: 2.2,
									position: [200, 0],
									parameters: {},
								},
							],
							connections: {
								'Chat Trigger': {
									main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
								},
							},
						},
						member,
					);

					// Mock the execution to return an error
					spyExecute.mockImplementationOnce(async (_user, workflowData, executionData) => {
						const executionId = await executionPersistence.create({
							finished: false,
							mode: 'webhook',
							status: 'running',
							workflowId: workflowData.id,
							data: executionData,
							workflowData,
						});

						// Update execution with error result - ensure execution is updated BEFORE finishRun
						setTimeout(async () => {
							await executionRepository.updateExistingExecution(executionId, {
								status: 'error',
								data: createRunExecutionData({
									resultData: {
										runData: {},
										error: new NodeOperationError(mock<INode>(), 'Workflow execution failed'),
									},
								}),
							});
							finishRun({} as IRun);
						});

						return { executionId };
					});

					await chatHubService.sendHumanMessage(
						member,
						{
							userId: member.id,
							sessionId,
							messageId,
							message: 'Test message',
							model: { provider: 'n8n', workflowId: workflow.id },
							credentials: {},
							previousMessageId: null,
							tools: [],
							attachments: [],
						},
						{
							authToken: 'authtoken',
							method: 'POST',
							endpoint: '/api/chat/message',
						},
					);

					const messages = await retryUntil(async () => {
						const messages = await messagesRepository.getManyBySessionId(sessionId);
						expect(messages.length).toBeGreaterThanOrEqual(2);
						expect(messages[1]?.status).toBe('error');
						return messages;
					});

					// Verify AI message has error status
					expect(messages[1]?.type).toBe('ai');
					expect(messages[1]?.status).toBe('error');
					expect(messages[1]?.content).toBe('Workflow execution failed');
				});

				it('should extract text field when output is not present in "lastNode" mode', async () => {
					// Create an active workflow
					const workflow = await createActiveWorkflow(
						{
							name: 'Text Field Chat Workflow',
							nodes: [
								{
									id: 'chat-trigger-1',
									name: 'Chat Trigger',
									type: CHAT_TRIGGER_NODE_TYPE,
									typeVersion: 1.4,
									position: [0, 0],
									parameters: {
										availableInChat: true,
										options: {
											responseMode: 'lastNode',
										},
									},
								},
								{
									id: 'code-1',
									name: 'Code Node',
									type: 'n8n-nodes-base.code',
									typeVersion: 1,
									position: [200, 0],
									parameters: {},
								},
							],
							connections: {
								'Chat Trigger': {
									main: [[{ node: 'Code Node', type: 'main', index: 0 }]],
								},
							},
						},
						member,
					);

					// Mock the execution to return text field instead of output
					spyExecute.mockImplementationOnce(async (_user, workflowData, executionData) => {
						const executionId = await executionPersistence.create({
							finished: false,
							mode: 'webhook',
							status: 'running',
							workflowId: workflowData.id,
							data: executionData,
							workflowData,
						});

						setTimeout(async () => {
							await executionRepository.updateExistingExecution(executionId, {
								status: 'success',
								data: createRunExecutionData({
									resultData: {
										runData: {
											'Code Node': [
												{
													startTime: Date.now(),
													executionTime: 100,
													executionIndex: 0,
													executionStatus: 'success',
													source: [],
													data: {
														main: [
															[
																{
																	json: { text: 'Response from text field!' },
																},
															],
														],
													},
												},
											],
										},
										lastNodeExecuted: 'Code Node',
									},
								}),
							});
							finishRun({} as IRun);
						});

						return { executionId };
					});

					await chatHubService.sendHumanMessage(
						member,
						{
							userId: member.id,
							sessionId,
							messageId,
							message: 'Test message',
							model: { provider: 'n8n', workflowId: workflow.id },
							credentials: {},
							previousMessageId: null,
							tools: [],
							attachments: [],
						},
						{
							authToken: 'authtoken',
							method: 'POST',
							endpoint: '/api/chat/message',
						},
					);

					const messages = await retryUntil(async () => {
						const messages = await messagesRepository.getManyBySessionId(sessionId);
						expect(messages.length).toBeGreaterThanOrEqual(2);
						expect(messages[1]?.status).toBe('success');
						return messages;
					});

					// Verify AI message extracts text field
					expect(messages[1]?.content).toBe('Response from text field!');
				});
			});

			describe('"Using Response Nodes" response mode', () => {
				it('should respond with "responseNodes" response mode and resume immediately when waitUserReply is false', async () => {
					// Create an active workflow with Respond to Chat node that doesn't wait for user reply
					const workflow = await createActiveWorkflow(
						{
							name: 'Auto Resume Chat Workflow',
							nodes: [
								{
									id: 'chat-trigger-1',
									name: 'Chat Trigger',
									type: CHAT_TRIGGER_NODE_TYPE,
									typeVersion: 1.4,
									position: [0, 0],
									parameters: {
										availableInChat: true,
										options: {
											responseMode: 'responseNodes',
										},
									},
								},
								{
									id: 'respond-1',
									name: 'Respond to Chat',
									type: CHAT_NODE_TYPE,
									typeVersion: 1,
									position: [200, 0],
									parameters: {
										message: 'Intermediate message',
										waitUserReply: false, // Key: causes shouldResumeImmediately to return true
									},
								},
							],
							connections: {
								'Chat Trigger': {
									main: [[{ node: 'Respond to Chat', type: 'main', index: 0 }]],
								},
							},
						},
						member,
					);

					let capturedExecutionId: string;

					// Mock initial execution - returns waiting status
					spyExecute.mockImplementationOnce(async (_user, workflowData, executionData) => {
						const executionId = await executionPersistence.create({
							finished: false,
							mode: 'webhook',
							status: 'running',
							workflowId: workflowData.id,
							data: executionData,
							workflowData,
						});
						capturedExecutionId = executionId;

						setTimeout(async () => {
							await executionRepository.updateExistingExecution(executionId, {
								status: 'waiting',
								data: createRunExecutionData({
									resultData: {
										runData: {
											'Respond to Chat': [
												{
													startTime: Date.now(),
													executionTime: 100,
													executionIndex: 0,
													executionStatus: 'success',
													source: [],
													data: {
														main: [
															[
																{
																	json: {},
																	sendMessage: 'Intermediate message',
																},
															],
														],
													},
												},
											],
										},
										lastNodeExecuted: 'Respond to Chat',
									},
								}),
							});
							finishRun({} as IRun);
						});

						return { executionId };
					});

					// Mock ChatExecutionManager.runWorkflow for the resume - updates to success
					const executionManager = Container.get(ChatExecutionManager);
					jest.spyOn(executionManager, 'runWorkflow').mockImplementationOnce(async () => {
						setTimeout(async () => {
							await executionRepository.updateExistingExecution(capturedExecutionId, {
								status: 'success',
								data: createRunExecutionData({
									resultData: {
										runData: {
											'Respond to Chat': [
												{
													startTime: Date.now(),
													executionTime: 100,
													executionIndex: 0,
													executionStatus: 'success',
													source: [],
													data: {
														main: [
															[
																{
																	json: {},
																	sendMessage: 'Final message',
																},
															],
														],
													},
												},
											],
										},
										lastNodeExecuted: 'Respond to Chat',
									},
								}),
							});
							finishRun({} as IRun);
						});
					});

					await chatHubService.sendHumanMessage(
						member,
						{
							userId: member.id,
							sessionId,
							messageId,
							message: 'Test message',
							model: { provider: 'n8n', workflowId: workflow.id },
							credentials: {},
							previousMessageId: null,
							tools: [],
							attachments: [],
						},
						{
							authToken: 'authtoken',
							method: 'POST',
							endpoint: '/api/chat/message',
						},
					);

					const messages = await retryUntil(async () => {
						const messages = await messagesRepository.getManyBySessionId(sessionId);
						// Should have 3 messages: human, AI (intermediate marked success), AI (final)
						expect(messages.length).toBeGreaterThanOrEqual(3);
						return messages;
					});

					// All AI messages should have status 'success' (auto-resumed and completed)
					const aiMessages = messages.filter((m) => m.type === 'ai');
					expect(aiMessages.length).toBeGreaterThanOrEqual(2);
					expect(aiMessages[aiMessages.length - 1]?.status).toBe('success');
				});

				it('should respond with "responseNodes" response mode and wait for user when waitUserReply is true', async () => {
					// Create an active workflow with Respond to Chat node that waits for user reply
					const workflow = await createActiveWorkflow(
						{
							name: 'Wait Chat Workflow',
							nodes: [
								{
									id: 'chat-trigger-1',
									name: 'Chat Trigger',
									type: CHAT_TRIGGER_NODE_TYPE,
									typeVersion: 1.4,
									position: [0, 0],
									parameters: {
										availableInChat: true,
										options: {
											responseMode: 'responseNodes',
										},
									},
								},
								{
									id: 'respond-1',
									name: 'Respond to Chat',
									type: CHAT_NODE_TYPE,
									typeVersion: 1,
									position: [200, 0],
									parameters: {
										message: 'Please provide input',
										waitUserReply: true, // Key: causes shouldResumeImmediately to return false
									},
								},
							],
							connections: {
								'Chat Trigger': {
									main: [[{ node: 'Respond to Chat', type: 'main', index: 0 }]],
								},
							},
						},
						member,
					);

					// Mock execution - returns waiting status
					spyExecute.mockImplementationOnce(async (_user, workflowData, executionData) => {
						const executionId = await executionPersistence.create({
							finished: false,
							mode: 'webhook',
							status: 'running',
							workflowId: workflowData.id,
							data: executionData,
							workflowData,
						});

						setTimeout(async () => {
							await executionRepository.updateExistingExecution(executionId, {
								status: 'waiting',
								data: createRunExecutionData({
									resultData: {
										runData: {
											'Respond to Chat': [
												{
													startTime: Date.now(),
													executionTime: 100,
													executionIndex: 0,
													executionStatus: 'success',
													source: [],
													data: {
														main: [
															[
																{
																	json: {},
																	sendMessage: 'Please provide input',
																},
															],
														],
													},
												},
											],
										},
										lastNodeExecuted: 'Respond to Chat',
									},
								}),
							});
							finishRun({} as IRun);
						});

						return { executionId };
					});

					await chatHubService.sendHumanMessage(
						member,
						{
							userId: member.id,
							sessionId,
							messageId,
							message: 'Test message',
							model: { provider: 'n8n', workflowId: workflow.id },
							credentials: {},
							previousMessageId: null,
							tools: [],
							attachments: [],
						},
						{
							authToken: 'authtoken',
							method: 'POST',
							endpoint: '/api/chat/message',
						},
					);

					const messages = await retryUntil(async () => {
						const messages = await messagesRepository.getManyBySessionId(sessionId);
						expect(messages.length).toBeGreaterThanOrEqual(2);
						expect(messages[1]?.status).toBe('waiting'); // Should stay waiting
						return messages;
					});

					// AI message should have status 'waiting' (no auto-resume)
					expect(messages[1]?.type).toBe('ai');
					expect(messages[1]?.status).toBe('waiting');
					expect(messages[1]?.content).toBe('Please provide input');
				});

				it('should resume waiting execution when user sends a follow-up message', async () => {
					// Create an active workflow with Respond to Chat node that waits for user reply
					const workflow = await createActiveWorkflow(
						{
							name: 'Resume Chat Workflow',
							nodes: [
								{
									id: 'chat-trigger-1',
									name: 'Chat Trigger',
									type: CHAT_TRIGGER_NODE_TYPE,
									typeVersion: 1.4,
									position: [0, 0],
									parameters: {
										availableInChat: true,
										options: {
											responseMode: 'responseNodes',
										},
									},
								},
								{
									id: 'respond-1',
									name: 'Respond to Chat',
									type: CHAT_NODE_TYPE,
									typeVersion: 1,
									position: [200, 0],
									parameters: {
										message: 'What is your name?',
										waitUserReply: true,
									},
								},
							],
							connections: {
								'Chat Trigger': {
									main: [[{ node: 'Respond to Chat', type: 'main', index: 0 }]],
								},
							},
						},
						member,
					);

					let capturedExecutionId: string;

					// First message: workflow goes into waiting state
					spyExecute.mockImplementationOnce(async (_user, workflowData, executionData) => {
						const executionId = await executionPersistence.create({
							finished: false,
							mode: 'webhook',
							status: 'running',
							workflowId: workflowData.id,
							data: executionData,
							workflowData,
						});
						capturedExecutionId = executionId;

						setTimeout(async () => {
							await executionRepository.updateExistingExecution(executionId, {
								status: 'waiting',
								data: createRunExecutionData({
									resultData: {
										runData: {
											'Respond to Chat': [
												{
													startTime: Date.now(),
													executionTime: 100,
													executionIndex: 0,
													executionStatus: 'success',
													source: [],
													data: {
														main: [
															[
																{
																	json: {},
																	sendMessage: 'What is your name?',
																},
															],
														],
													},
												},
											],
										},
										lastNodeExecuted: 'Respond to Chat',
									},
								}),
							});
							finishRun({} as IRun);
						});

						return { executionId };
					});

					// Send first message
					await chatHubService.sendHumanMessage(
						member,
						{
							userId: member.id,
							sessionId,
							messageId,
							message: 'Hello',
							model: { provider: 'n8n', workflowId: workflow.id },
							credentials: {},
							previousMessageId: null,
							tools: [],
							attachments: [],
						},
						{
							authToken: 'authtoken',
							method: 'POST',
							endpoint: '/api/chat/message',
						},
					);

					// Wait for the first message to be processed and AI to be in waiting state
					const initialMessages = await retryUntil(async () => {
						const messages = await messagesRepository.getManyBySessionId(sessionId);
						expect(messages.length).toBeGreaterThanOrEqual(2);
						expect(messages[1]?.status).toBe('waiting');
						return messages;
					});

					const waitingMessageId = initialMessages[1].id;

					// Mock ChatExecutionManager.runWorkflow for the resume
					const executionManager = Container.get(ChatExecutionManager);
					const runWorkflowSpy = jest
						.spyOn(executionManager, 'runWorkflow')
						.mockImplementationOnce(async () => {
							setTimeout(async () => {
								await executionRepository.updateExistingExecution(capturedExecutionId, {
									status: 'success',
									data: createRunExecutionData({
										resultData: {
											runData: {
												'Respond to Chat': [
													{
														startTime: Date.now(),
														executionTime: 100,
														executionIndex: 0,
														executionStatus: 'success',
														source: [],
														data: {
															main: [
																[
																	{
																		json: {},
																		sendMessage: 'Nice to meet you, Alice!',
																	},
																],
															],
														},
													},
												],
											},
											lastNodeExecuted: 'Respond to Chat',
										},
									}),
								});
								finishRun({} as IRun);
							});
						});

					// Send second message (HITL) - this should resume the waiting execution
					const secondMessageId = crypto.randomUUID();
					await chatHubService.sendHumanMessage(
						member,
						{
							userId: member.id,
							sessionId,
							messageId: secondMessageId,
							message: 'My name is Alice',
							model: { provider: 'n8n', workflowId: workflow.id },
							credentials: {},
							previousMessageId: waitingMessageId, // Reference the waiting message
							tools: [],
							attachments: [],
						},
						{
							authToken: 'authtoken',
							method: 'POST',
							endpoint: '/api/chat/message',
						},
					);

					// Wait for the resumed execution to complete
					const finalMessages = await retryUntil(async () => {
						const messages = await messagesRepository.getManyBySessionId(sessionId);
						// Should have: human1, ai1 (waiting->success), human2, ai2 (success)
						expect(messages.length).toBeGreaterThanOrEqual(4);
						// The last AI message should be successful
						const aiMessages = messages.filter((m) => m.type === 'ai');
						expect(aiMessages[aiMessages.length - 1]?.status).toBe('success');
						return messages;
					});

					// Verify the execution was resumed via runWorkflow, not started fresh
					// The key assertion is that runWorkflow was called with the correct execution and message
					expect(runWorkflowSpy).toHaveBeenCalledWith(
						expect.objectContaining({ id: capturedExecutionId! }),
						expect.objectContaining({
							action: 'sendMessage',
							chatInput: 'My name is Alice',
							sessionId,
						}),
					);

					// Verify message structure
					const humanMessages = finalMessages.filter((m) => m.type === 'human');
					const aiMessages = finalMessages.filter((m) => m.type === 'ai');

					expect(humanMessages).toHaveLength(2);
					expect(humanMessages[0]?.content).toBe('Hello');
					expect(humanMessages[1]?.content).toBe('My name is Alice');

					expect(aiMessages.length).toBeGreaterThanOrEqual(2);
					// First AI message should now be marked as success (was waiting)
					expect(aiMessages[0]?.status).toBe('success');
					// Last AI message should be the response after resume
					expect(aiMessages[aiMessages.length - 1]?.status).toBe('success');
					expect(aiMessages[aiMessages.length - 1]?.content).toBe('Nice to meet you, Alice!');
				});
			});

			describe('"Using \'Respond to Webhook\' Node" response mode', () => {
				it('should throw error when "responseNode" mode is used', async () => {
					// Create an active workflow with chat trigger configured for responseNode mode
					// (which is not supported for chat hub)
					const workflow = await createActiveWorkflow(
						{
							name: 'Response Node Chat Workflow',
							nodes: [
								{
									id: 'chat-trigger-1',
									name: 'Chat Trigger',
									type: CHAT_TRIGGER_NODE_TYPE,
									typeVersion: 1.4,
									position: [0, 0],
									parameters: {
										availableInChat: true,
										options: {
											responseMode: 'responseNode',
										},
									},
								},
							],
							connections: {},
						},
						member,
					);

					await expect(
						chatHubService.sendHumanMessage(
							member,
							{
								userId: member.id,
								sessionId,
								messageId,
								message: 'Test message',
								model: { provider: 'n8n', workflowId: workflow.id },
								credentials: {},
								previousMessageId: null,
								tools: [],
								attachments: [],
							},
							{
								authToken: 'authtoken',
								method: 'POST',
								endpoint: '/api/chat/message',
							},
						),
					).rejects.toThrow('Chat Trigger node response mode must be set to');
				});
			});

			describe('multi-main mode execution waiting', () => {
				const TEST_POLL_INTERVAL = 50;
				const originalPollInterval = chatHubConstants.EXECUTION_POLL_INTERVAL;

				beforeEach(() => {
					Object.defineProperty(chatHubConstants, 'EXECUTION_POLL_INTERVAL', {
						value: TEST_POLL_INTERVAL,
						writable: true,
						configurable: true,
					});
				});

				afterEach(() => {
					Object.defineProperty(chatHubConstants, 'EXECUTION_POLL_INTERVAL', {
						value: originalPollInterval,
						writable: true,
						configurable: true,
					});
				});

				it('should poll and complete when execution finishes with "waiting" status', async () => {
					jest.spyOn(instanceSettings, 'isMultiMain', 'get').mockReturnValue(true);

					// Spy on findSingleExecution to verify polling occurs
					const findSingleExecutionSpy = jest.spyOn(executionRepository, 'findSingleExecution');

					const workflow = await createActiveWorkflow(
						{
							name: 'Multi-Main Wait Workflow',
							nodes: [
								{
									id: 'chat-trigger-1',
									name: 'Chat Trigger',
									type: CHAT_TRIGGER_NODE_TYPE,
									typeVersion: 1.4,
									position: [0, 0],
									parameters: {
										availableInChat: true,
										options: {
											responseMode: 'responseNodes',
										},
									},
								},
								{
									id: 'respond-1',
									name: 'Respond to Chat',
									type: CHAT_NODE_TYPE,
									typeVersion: 1,
									position: [200, 0],
									parameters: {
										message: 'Waiting for your input',
										waitUserReply: true,
									},
								},
							],
							connections: {
								'Chat Trigger': {
									main: [[{ node: 'Respond to Chat', type: 'main', index: 0 }]],
								},
							},
						},
						member,
					);

					spyExecute.mockImplementationOnce(async (_user, workflowData, executionData) => {
						const executionId = await executionPersistence.create({
							finished: false,
							mode: 'webhook',
							status: 'running',
							workflowId: workflowData.id,
							data: executionData,
							workflowData,
						});

						// Update execution status to 'waiting' after multiple poll intervals
						setTimeout(async () => {
							await executionRepository.updateExistingExecution(executionId, {
								status: 'waiting',
								data: createRunExecutionData({
									resultData: {
										runData: {
											'Respond to Chat': [
												{
													startTime: Date.now(),
													executionTime: 100,
													executionIndex: 0,
													executionStatus: 'success',
													source: [],
													data: {
														main: [
															[
																{
																	json: {},
																	sendMessage: 'Waiting for your input',
																},
															],
														],
													},
												},
											],
										},
										lastNodeExecuted: 'Respond to Chat',
									},
								}),
							});
						}, TEST_POLL_INTERVAL * 3);

						return { executionId };
					});

					await chatHubService.sendHumanMessage(
						member,
						{
							userId: member.id,
							sessionId,
							messageId,
							message: 'Test message',
							model: { provider: 'n8n', workflowId: workflow.id },
							credentials: {},
							previousMessageId: null,
							tools: [],
							attachments: [],
						},
						{
							authToken: 'authtoken',
							method: 'POST',
							endpoint: '/api/chat/message',
						},
					);

					const messages = await retryUntil(async () => {
						const messages = await messagesRepository.getManyBySessionId(sessionId);
						expect(messages.length).toBeGreaterThanOrEqual(2);
						expect(messages[1]?.status).toBe('waiting');
						return messages;
					});

					expect(messages[0]?.type).toBe('human');
					expect(messages[0]?.content).toBe('Test message');

					expect(messages[1]?.type).toBe('ai');
					expect(messages[1]?.status).toBe('waiting');
					expect(messages[1]?.content).toBe('Waiting for your input');

					// Ensure polling happened
					expect(findSingleExecutionSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

					findSingleExecutionSpy.mockRestore();
				});

				it('should poll and complete when execution finishes with "success" status', async () => {
					jest.spyOn(instanceSettings, 'isMultiMain', 'get').mockReturnValue(true);

					const findSingleExecutionSpy = jest.spyOn(executionRepository, 'findSingleExecution');

					const workflow = await createActiveWorkflow(
						{
							name: 'Multi-Main Success Workflow',
							nodes: [
								{
									id: 'chat-trigger-1',
									name: 'Chat Trigger',
									type: CHAT_TRIGGER_NODE_TYPE,
									typeVersion: 1.4,
									position: [0, 0],
									parameters: {
										availableInChat: true,
										options: {
											responseMode: 'lastNode',
										},
									},
								},
								{
									id: 'agent-1',
									name: 'AI Agent',
									type: '@n8n/n8n-nodes-langchain.agent',
									typeVersion: 2.2,
									position: [200, 0],
									parameters: {},
								},
							],
							connections: {
								'Chat Trigger': {
									main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
								},
							},
						},
						member,
					);

					spyExecute.mockImplementationOnce(async (_user, workflowData, executionData) => {
						const executionId = await executionPersistence.create({
							finished: false,
							mode: 'webhook',
							status: 'running',
							workflowId: workflowData.id,
							data: executionData,
							workflowData,
						});

						// Update execution status to 'success' after multiple poll intervals
						setTimeout(async () => {
							await executionRepository.updateExistingExecution(executionId, {
								status: 'success',
								data: createRunExecutionData({
									resultData: {
										runData: {
											'AI Agent': [
												{
													startTime: Date.now(),
													executionTime: 100,
													executionIndex: 0,
													executionStatus: 'success',
													source: [],
													data: {
														main: [
															[
																{
																	json: { output: 'Hello from multi-main!' },
																},
															],
														],
													},
												},
											],
										},
										lastNodeExecuted: 'AI Agent',
									},
								}),
							});
						}, TEST_POLL_INTERVAL * 3);

						return { executionId };
					});

					await chatHubService.sendHumanMessage(
						member,
						{
							userId: member.id,
							sessionId,
							messageId,
							message: 'Test message',
							model: { provider: 'n8n', workflowId: workflow.id },
							credentials: {},
							previousMessageId: null,
							tools: [],
							attachments: [],
						},
						{
							authToken: 'authtoken',
							method: 'POST',
							endpoint: '/api/chat/message',
						},
					);

					const messages = await retryUntil(async () => {
						const messages = await messagesRepository.getManyBySessionId(sessionId);
						expect(messages.length).toBeGreaterThanOrEqual(2);
						expect(messages[1]?.status).toBe('success');
						return messages;
					});

					expect(messages[0]?.type).toBe('human');
					expect(messages[0]?.content).toBe('Test message');

					expect(messages[1]?.type).toBe('ai');
					expect(messages[1]?.status).toBe('success');
					expect(messages[1]?.content).toBe('Hello from multi-main!');

					// Ensure polling happened
					expect(findSingleExecutionSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

					findSingleExecutionSpy.mockRestore();
				});

				it('should poll and complete when execution finishes with "error" status', async () => {
					jest.spyOn(instanceSettings, 'isMultiMain', 'get').mockReturnValue(true);

					const findSingleExecutionSpy = jest.spyOn(executionRepository, 'findSingleExecution');

					const workflow = await createActiveWorkflow(
						{
							name: 'Multi-Main Error Workflow',
							nodes: [
								{
									id: 'chat-trigger-1',
									name: 'Chat Trigger',
									type: CHAT_TRIGGER_NODE_TYPE,
									typeVersion: 1.4,
									position: [0, 0],
									parameters: {
										availableInChat: true,
										options: {
											responseMode: 'lastNode',
										},
									},
								},
								{
									id: 'agent-1',
									name: 'AI Agent',
									type: '@n8n/n8n-nodes-langchain.agent',
									typeVersion: 2.2,
									position: [200, 0],
									parameters: {},
								},
							],
							connections: {
								'Chat Trigger': {
									main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
								},
							},
						},
						member,
					);

					spyExecute.mockImplementationOnce(async (_user, workflowData, executionData) => {
						const executionId = await executionPersistence.create({
							finished: false,
							mode: 'webhook',
							status: 'running',
							workflowId: workflowData.id,
							data: executionData,
							workflowData,
						});

						// Update execution status to 'error' after multiple poll intervals
						setTimeout(async () => {
							await executionRepository.updateExistingExecution(executionId, {
								status: 'error',
								data: createRunExecutionData({
									resultData: {
										runData: {},
										error: new NodeOperationError(mock<INode>(), 'Multi-main execution failed'),
									},
								}),
							});
						}, TEST_POLL_INTERVAL * 3);

						return { executionId };
					});

					await chatHubService.sendHumanMessage(
						member,
						{
							userId: member.id,
							sessionId,
							messageId,
							message: 'Test message',
							model: { provider: 'n8n', workflowId: workflow.id },
							credentials: {},
							previousMessageId: null,
							tools: [],
							attachments: [],
						},
						{
							authToken: 'authtoken',
							method: 'POST',
							endpoint: '/api/chat/message',
						},
					);

					const messages = await retryUntil(async () => {
						const messages = await messagesRepository.getManyBySessionId(sessionId);
						expect(messages.length).toBeGreaterThanOrEqual(2);
						expect(messages[1]?.status).toBe('error');
						return messages;
					});

					expect(messages[0]?.type).toBe('human');
					expect(messages[0]?.content).toBe('Test message');

					expect(messages[1]?.type).toBe('ai');
					expect(messages[1]?.status).toBe('error');
					expect(messages[1]?.content).toBe('Multi-main execution failed');

					// Ensure polling happened
					expect(findSingleExecutionSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

					findSingleExecutionSpy.mockRestore();
				});

				it('should handle poll error by saving error to message when finding execution throws', async () => {
					jest.spyOn(instanceSettings, 'isMultiMain', 'get').mockReturnValue(true);

					const findSingleExecution = executionRepository.findSingleExecution.bind(
						executionRepository,
					) as typeof executionRepository.findSingleExecution;

					// Subsequent calls during polling throw
					const findSingleExecutionSpy = jest
						.spyOn(executionRepository, 'findSingleExecution')
						.mockImplementationOnce(findSingleExecution)
						.mockRejectedValue(new Error('Database error'));

					const workflow = await createActiveWorkflow(
						{
							name: 'Test Workflow',
							nodes: [
								{
									id: 'chat-trigger-1',
									name: 'Chat Trigger',
									type: CHAT_TRIGGER_NODE_TYPE,
									typeVersion: 1.4,
									position: [0, 0],
									parameters: {
										availableInChat: true,
										options: {
											responseMode: 'lastNode',
										},
									},
								},
								{
									id: 'agent-1',
									name: 'AI Agent',
									type: '@n8n/n8n-nodes-langchain.agent',
									typeVersion: 2.2,
									position: [200, 0],
									parameters: {},
								},
							],
							connections: {
								'Chat Trigger': {
									main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
								},
							},
						},
						member,
					);

					spyExecute.mockImplementationOnce(async (_user, workflowData, executionData) => {
						const executionId = await executionPersistence.create({
							finished: false,
							mode: 'webhook',
							status: 'running',
							workflowId: workflowData.id,
							data: executionData,
							workflowData,
						});

						return { executionId };
					});

					await chatHubService.sendHumanMessage(
						member,
						{
							userId: member.id,
							sessionId,
							messageId,
							message: 'Test message',
							model: { provider: 'n8n', workflowId: workflow.id },
							credentials: {},
							previousMessageId: null,
							tools: [],
							attachments: [],
						},
						{
							authToken: 'authtoken',
							method: 'POST',
							endpoint: '/api/chat/message',
						},
					);

					// Wait for the error to be processed
					const messages = await retryUntil(async () => {
						const messages = await messagesRepository.getManyBySessionId(sessionId);
						expect(messages.length).toBeGreaterThanOrEqual(2);
						expect(messages[1]?.status).toBe('error');
						return messages;
					});

					expect(messages[0]?.type).toBe('human');
					expect(messages[0]?.content).toBe('Test message');

					expect(messages[1]?.type).toBe('ai');
					expect(messages[1]?.status).toBe('error');
					expect(messages[1]?.content).toBe('Database error');

					// Ensure polling was attempted
					expect(findSingleExecutionSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

					findSingleExecutionSpy.mockRestore();
				});
			});
		});
	});
});
