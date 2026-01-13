import { testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createMember } from '@test-integration/db/users';
import {
	MEMORY_BUFFER_WINDOW_NODE_TYPE,
	Workflow,
	CHAT_TRIGGER_NODE_TYPE,
	type INode,
} from 'n8n-workflow';

import { ChatMemoryProxyService, isAllowedNode } from '../chat-memory-proxy.service';
import { ChatMemorySessionRepository } from '../chat-memory-session.repository';
import { ChatMemoryRepository } from '../chat-memory.repository';
import { ChatHubSessionRepository } from '../chat-session.repository';

beforeAll(async () => {
	await testModules.loadModules(['chat-hub']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['ChatMemory', 'ChatMemorySession', 'ChatHubSession', 'User']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('ChatMemoryProxyService', () => {
	let proxyService: ChatMemoryProxyService;
	let memoryRepository: ChatMemoryRepository;
	let memorySessionRepository: ChatMemorySessionRepository;
	let chatHubSessionRepository: ChatHubSessionRepository;
	let user: User;

	beforeAll(() => {
		proxyService = Container.get(ChatMemoryProxyService);
		memoryRepository = Container.get(ChatMemoryRepository);
		memorySessionRepository = Container.get(ChatMemorySessionRepository);
		chatHubSessionRepository = Container.get(ChatHubSessionRepository);
	});

	beforeEach(async () => {
		user = await createMember();
	});

	describe('isAllowedNode', () => {
		it('should return true for Memory Buffer Window node', () => {
			expect(isAllowedNode(MEMORY_BUFFER_WINDOW_NODE_TYPE)).toBe(true);
		});

		it('should return false for other node types', () => {
			expect(isAllowedNode('n8n-nodes-base.code')).toBe(false);
			expect(isAllowedNode('n8n-nodes-base.set')).toBe(false);
			expect(isAllowedNode('@n8n/n8n-nodes-langchain.agent')).toBe(false);
		});
	});

	describe('getChatMemoryProxy', () => {
		const createTestWorkflow = (overrides?: {
			name?: string;
			agentName?: string;
		}): Workflow => {
			const nodes: Record<string, INode> = {
				trigger: {
					id: 'chat-trigger-1',
					name: 'Chat Trigger',
					type: CHAT_TRIGGER_NODE_TYPE,
					typeVersion: 1.4,
					position: [0, 0],
					parameters: {
						...(overrides?.agentName && { agentName: overrides.agentName }),
					},
				},
				memory: {
					id: 'memory-1',
					name: 'Memory',
					type: MEMORY_BUFFER_WINDOW_NODE_TYPE,
					typeVersion: 1.3,
					position: [200, 0],
					parameters: {},
				},
			};

			return new Workflow({
				// Use undefined to avoid FK constraint on workflowId
				id: undefined as unknown as string,
				name: overrides?.name ?? 'Test Workflow',
				nodes: Object.values(nodes),
				connections: {},
				active: true,
				nodeTypes: {
					getByName: () => undefined,
					getByNameAndVersion: () => undefined,
					getKnownTypes: () => ({}),
				} as unknown as Workflow['nodeTypes'],
			});
		};

		const createMemoryNode = (): INode => ({
			id: 'memory-1',
			name: 'Memory',
			type: MEMORY_BUFFER_WINDOW_NODE_TYPE,
			typeVersion: 1.3,
			position: [200, 0],
			parameters: {},
		});

		it('should throw error for non-allowed node types', async () => {
			const workflow = createTestWorkflow();
			const invalidNode: INode = {
				id: 'code-1',
				name: 'Code',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			await expect(
				proxyService.getChatMemoryProxy(workflow, invalidNode, 'session-1', null, null),
			).rejects.toThrow('This proxy is only available for Chat Hub Memory nodes');
		});

		it('should create memory session when it does not exist', async () => {
			const workflow = createTestWorkflow({ name: 'My Agent' });
			const node = createMemoryNode();
			const sessionKey = `session-${crypto.randomUUID()}`;

			await proxyService.getChatMemoryProxy(workflow, node, sessionKey, null, null);

			const memorySession = await memorySessionRepository.getBySessionKey(sessionKey);
			expect(memorySession).not.toBeNull();
			expect(memorySession?.sessionKey).toBe(sessionKey);
			expect(memorySession?.chatHubSessionId).toBeNull();
		});

		it('should support arbitrary string session keys', async () => {
			const workflow = createTestWorkflow();
			const node = createMemoryNode();
			const customSessionKey = 'user:123:conversation:456';

			const proxy = await proxyService.getChatMemoryProxy(
				workflow,
				node,
				customSessionKey,
				null,
				null,
			);

			await proxy.addHumanMessage('Hello with custom key!');

			const entries = await memoryRepository.find({ where: { sessionKey: customSessionKey } });
			expect(entries).toHaveLength(1);
			expect(entries[0].sessionKey).toBe(customSessionKey);
		});

		describe('memory operations', () => {
			it('should add human message with expiresAt for anonymous session', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey = `session-${crypto.randomUUID()}`;

				const proxy = await proxyService.getChatMemoryProxy(workflow, node, sessionKey, null, null);

				await proxy.addHumanMessage('Hello, world!');

				const entries = await memoryRepository.find({ where: { sessionKey } });
				expect(entries).toHaveLength(1);
				expect(entries[0].role).toBe('human');
				expect(entries[0].content).toEqual({ content: 'Hello, world!' });
				expect(entries[0].expiresAt).not.toBeNull();
				// Should expire roughly 1 hour from now
				const expiresIn = entries[0].expiresAt!.getTime() - Date.now();
				expect(expiresIn).toBeGreaterThan(55 * 60 * 1000); // > 55 minutes
				expect(expiresIn).toBeLessThan(65 * 60 * 1000); // < 65 minutes
			});

			it('should add human message without expiresAt for Chat hub session', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey = crypto.randomUUID();

				const proxy = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					sessionKey,
					null,
					null,
					user.id,
				);

				await proxy.addHumanMessage('Hello, Chat hub!');

				const entries = await memoryRepository.find({ where: { sessionKey } });
				expect(entries).toHaveLength(1);
				expect(entries[0].expiresAt).toBeNull();
			});

			it('should add AI message with tool calls', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey = `session-${crypto.randomUUID()}`;

				const proxy = await proxyService.getChatMemoryProxy(workflow, node, sessionKey, null, null);

				const toolCalls = [{ id: 'call-1', name: 'search', args: { query: 'test' } }];
				await proxy.addAIMessage('Here is the result', toolCalls);

				const entries = await memoryRepository.find({ where: { sessionKey } });
				expect(entries).toHaveLength(1);
				expect(entries[0].role).toBe('ai');
				expect(entries[0].content).toEqual({ content: 'Here is the result', toolCalls });
			});

			it('should add tool message', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey = `session-${crypto.randomUUID()}`;

				const proxy = await proxyService.getChatMemoryProxy(workflow, node, sessionKey, null, null);

				await proxy.addToolMessage('call-1', 'search', { query: 'test' }, { results: ['a', 'b'] });

				const entries = await memoryRepository.find({ where: { sessionKey } });
				expect(entries).toHaveLength(1);
				expect(entries[0].role).toBe('tool');
				expect(entries[0].name).toBe('search');
				expect(entries[0].content).toEqual({
					toolCallId: 'call-1',
					toolName: 'search',
					toolInput: { query: 'test' },
					toolOutput: { results: ['a', 'b'] },
				});
			});

			it('should get memory entries for all turns when previousTurnIds is null', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey = `session-${crypto.randomUUID()}`;
				const turnId1 = crypto.randomUUID();
				const turnId2 = crypto.randomUUID();

				// Create memory session first (required for FK constraint)
				await memorySessionRepository.createSession({
					sessionKey,
					chatHubSessionId: null,
					workflowId: null,
				});

				// Create some memory entries
				await memoryRepository.createMemoryEntry({
					id: crypto.randomUUID(),
					sessionKey,
					turnId: turnId1,
					role: 'human',
					content: { content: 'First message' },
					name: 'User',
				});
				await memoryRepository.createMemoryEntry({
					id: crypto.randomUUID(),
					sessionKey,
					turnId: turnId2,
					role: 'ai',
					content: { content: 'Response' },
					name: 'AI',
				});

				const proxy = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					sessionKey,
					null,
					null, // No previousTurnIds - should get all
				);

				const memory = await proxy.getMemory();
				expect(memory).toHaveLength(2);
			});

			it('should get memory entries only for specified turnIds', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey = `session-${crypto.randomUUID()}`;
				const turnId1 = crypto.randomUUID();
				const turnId2 = crypto.randomUUID();
				const turnId3 = crypto.randomUUID();
				const turnIdCurrent = crypto.randomUUID();

				// Create memory session first (required for FK constraint)
				await memorySessionRepository.createSession({
					sessionKey,
					chatHubSessionId: null,
					workflowId: null,
				});

				// Create memory entries with different turnIds
				await memoryRepository.createMemoryEntry({
					id: crypto.randomUUID(),
					sessionKey,
					turnId: turnId1,
					role: 'human',
					content: { content: 'Turn 1 message' },
					name: 'User',
				});
				await memoryRepository.createMemoryEntry({
					id: crypto.randomUUID(),
					sessionKey,
					turnId: turnId2,
					role: 'human',
					content: { content: 'Turn 2 message' },
					name: 'User',
				});
				await memoryRepository.createMemoryEntry({
					id: crypto.randomUUID(),
					sessionKey,
					turnId: turnId3,
					role: 'human',
					content: { content: 'Turn 3 message' },
					name: 'User',
				});

				const proxy = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					sessionKey,
					turnIdCurrent,
					[turnId1, turnId3], // Only get turn-1 and turn-3
				);

				const memory = await proxy.getMemory();
				expect(memory).toHaveLength(2);
				// Don't assert order - timestamps may be identical causing non-deterministic ordering
				expect(memory.map((m) => m.content)).toEqual(
					expect.arrayContaining([{ content: 'Turn 1 message' }, { content: 'Turn 3 message' }]),
				);
			});

			it('should clear memory for the specific session', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey1 = `session-${crypto.randomUUID()}`;
				const sessionKey2 = `session-${crypto.randomUUID()}`;

				// Create two memory sessions
				await memorySessionRepository.createSession({
					sessionKey: sessionKey1,
					chatHubSessionId: null,
					workflowId: null,
				});

				await memorySessionRepository.createSession({
					sessionKey: sessionKey2,
					chatHubSessionId: null,
					workflowId: null,
				});

				// Create entries for two different sessions
				await memoryRepository.createMemoryEntry({
					id: crypto.randomUUID(),
					sessionKey: sessionKey1,
					turnId: null,
					role: 'human',
					content: { content: 'Node 1 message' },
					name: 'User',
				});
				await memoryRepository.createMemoryEntry({
					id: crypto.randomUUID(),
					sessionKey: sessionKey2,
					turnId: null,
					role: 'human',
					content: { content: 'Node 2 message' },
					name: 'User',
				});

				const proxy = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					sessionKey1,
					null,
					null,
				);

				await proxy.clearMemory();

				const remaining = await memoryRepository.find({ where: { sessionKey: sessionKey2 } });
				expect(remaining).toHaveLength(1);
				expect(remaining[0].content).toEqual({ content: 'Node 2 message' });
			});

			it('should link memory entries with turnId', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey = `session-${crypto.randomUUID()}`;
				const turnId = crypto.randomUUID();

				const proxy = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					sessionKey,
					turnId,
					null,
				);

				await proxy.addHumanMessage('Question');
				await proxy.addAIMessage('Answer', []);

				const entries = await memoryRepository.find({
					where: { sessionKey },
					order: { createdAt: 'ASC' },
				});
				expect(entries).toHaveLength(2);
				expect(entries[0].turnId).toBe(turnId);
				expect(entries[1].turnId).toBe(turnId);
			});

			it('should generate turnId when not provided', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey = `session-${crypto.randomUUID()}`;

				const proxy = await proxyService.getChatMemoryProxy(workflow, node, sessionKey, null, null);

				await proxy.addHumanMessage('Message 1');
				await proxy.addAIMessage('Response', []);

				const entries = await memoryRepository.find({ where: { sessionKey } });
				expect(entries).toHaveLength(2);
				// Both should have the same generated turnId
				expect(entries[0].turnId).toBe(entries[1].turnId);
				expect(entries[0].turnId).not.toBeNull();
			});
		});

		describe('getOwnerId', () => {
			it('should return ownerId when set', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey = crypto.randomUUID();

				const proxy = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					sessionKey,
					null,
					null,
					user.id,
				);

				expect(proxy.getOwnerId()).toBe(user.id);
			});

			it('should return undefined when ownerId not set', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey = `session-${crypto.randomUUID()}`;

				const proxy = await proxyService.getChatMemoryProxy(workflow, node, sessionKey, null, null);

				expect(proxy.getOwnerId()).toBeUndefined();
			});
		});

		describe('chat hub session linking', () => {
			it('should link memory session to chat hub session when it exists and ownerId matches', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const chatHubSessionId = crypto.randomUUID();

				// Create a chat hub session owned by the test user
				await chatHubSessionRepository.createChatSession({
					id: chatHubSessionId,
					ownerId: user.id,
					title: 'Test Session',
					lastMessageAt: new Date(),
				});

				// Use the chat hub session ID as the sessionKey (as happens in real chat hub executions)
				const proxy = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					chatHubSessionId, // sessionKey = chat hub session ID
					null,
					null,
					user.id, // ownerId = the user who owns the chat hub session
				);

				// Add a message to ensure the proxy works
				await proxy.addHumanMessage('Hello from chat hub!');

				// Verify the memory session is linked to the chat hub session
				const memorySession = await memorySessionRepository.getBySessionKey(chatHubSessionId);
				expect(memorySession).not.toBeNull();
				expect(memorySession?.chatHubSessionId).toBe(chatHubSessionId);
			});

			it('should not link memory session when ownerId does not match chat hub session owner', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const chatHubSessionId = crypto.randomUUID();
				const differentUserId = crypto.randomUUID();

				// Create a chat hub session owned by a different user
				const otherUser = await createMember();
				await chatHubSessionRepository.createChatSession({
					id: chatHubSessionId,
					ownerId: otherUser.id,
					title: 'Other User Session',
					lastMessageAt: new Date(),
				});

				// Try to use with a different ownerId - memory session created but not linked
				const proxy = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					chatHubSessionId,
					null,
					null,
					differentUserId, // Different user than the chat hub session owner
				);

				await proxy.addHumanMessage('Hello!');

				// Memory session should exist but NOT be linked to chat hub session
				const memorySession = await memorySessionRepository.getBySessionKey(chatHubSessionId);
				expect(memorySession).not.toBeNull();
				expect(memorySession?.chatHubSessionId).toBeNull();
			});

			it('should not link memory session when no ownerId is provided', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const chatHubSessionId = crypto.randomUUID();

				// Create a chat hub session
				await chatHubSessionRepository.createChatSession({
					id: chatHubSessionId,
					ownerId: user.id,
					title: 'Session Without Owner',
					lastMessageAt: new Date(),
				});

				// Call without ownerId (anonymous execution) - memory session created but not linked
				const proxy = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					chatHubSessionId,
					null,
					null,
					// No ownerId provided
				);

				await proxy.addHumanMessage('Anonymous message');

				// Memory session should exist but NOT be linked
				const memorySession = await memorySessionRepository.getBySessionKey(chatHubSessionId);
				expect(memorySession).not.toBeNull();
				expect(memorySession?.chatHubSessionId).toBeNull();
			});
		});

		describe('chat hub session access control', () => {
			it('should deny access to linked session when no ownerId is provided', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const chatHubSessionId = crypto.randomUUID();

				// Create a chat hub session owned by the test user
				await chatHubSessionRepository.createChatSession({
					id: chatHubSessionId,
					ownerId: user.id,
					title: 'Test Session',
					lastMessageAt: new Date(),
				});

				// First call with correct ownerId to create linked memory session
				await proxyService.getChatMemoryProxy(
					workflow,
					node,
					chatHubSessionId,
					null,
					null,
					user.id,
				);

				// Verify memory session is linked
				const memorySession = await memorySessionRepository.getBySessionKey(chatHubSessionId);
				expect(memorySession?.chatHubSessionId).toBe(chatHubSessionId);

				// Try to access without ownerId - should throw
				await expect(
					proxyService.getChatMemoryProxy(workflow, node, chatHubSessionId, null, null),
				).rejects.toThrow(
					'Access denied to this memory session, userId missing from execution context',
				);
			});

			it('should deny access to linked session when ownerId does not match', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const chatHubSessionId = crypto.randomUUID();

				// Create a chat hub session owned by the test user
				await chatHubSessionRepository.createChatSession({
					id: chatHubSessionId,
					ownerId: user.id,
					title: 'Test Session',
					lastMessageAt: new Date(),
				});

				// First call with correct ownerId to create linked memory session
				await proxyService.getChatMemoryProxy(
					workflow,
					node,
					chatHubSessionId,
					null,
					null,
					user.id,
				);

				// Try to access with different ownerId - should throw
				const differentUserId = crypto.randomUUID();
				await expect(
					proxyService.getChatMemoryProxy(
						workflow,
						node,
						chatHubSessionId,
						null,
						null,
						differentUserId,
					),
				).rejects.toThrow('Access denied to this memory session');
			});

			it('should allow access to linked session with correct ownerId', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const chatHubSessionId = crypto.randomUUID();

				// Create a chat hub session owned by the test user
				await chatHubSessionRepository.createChatSession({
					id: chatHubSessionId,
					ownerId: user.id,
					title: 'Test Session',
					lastMessageAt: new Date(),
				});

				// First call to create linked memory session
				const proxy1 = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					chatHubSessionId,
					null,
					null,
					user.id,
				);
				await proxy1.addHumanMessage('First message');

				// Second call with same ownerId - should succeed
				const proxy2 = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					chatHubSessionId,
					null,
					null,
					user.id,
				);
				await proxy2.addHumanMessage('Second message');

				// Verify both messages exist
				const entries = await memoryRepository.find({ where: { sessionKey: chatHubSessionId } });
				expect(entries).toHaveLength(2);
			});

			it('should allow access to unlinked session without ownerId', async () => {
				const workflow = createTestWorkflow();
				const node = createMemoryNode();
				const sessionKey = `standalone-${crypto.randomUUID()}`;

				// Create unlinked memory session (standalone memory usage)
				const proxy1 = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					sessionKey,
					null,
					null,
				);
				await proxy1.addHumanMessage('First message');

				// Verify session is not linked
				const memorySession = await memorySessionRepository.getBySessionKey(sessionKey);
				expect(memorySession?.chatHubSessionId).toBeNull();

				// Access again without ownerId - should succeed
				const proxy2 = await proxyService.getChatMemoryProxy(
					workflow,
					node,
					sessionKey,
					null,
					null,
				);
				await proxy2.addHumanMessage('Second message');

				// Verify both messages exist
				const entries = await memoryRepository.find({ where: { sessionKey } });
				expect(entries).toHaveLength(2);
			});
		});
	});
});
