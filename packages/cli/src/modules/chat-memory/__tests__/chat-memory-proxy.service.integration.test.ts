import { testDb, testModules, createWorkflow, createTeamProject } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import {
	MEMORY_BUFFER_WINDOW_NODE_TYPE,
	Workflow,
	CHAT_TRIGGER_NODE_TYPE,
	type INode,
} from 'n8n-workflow';

import { ChatMemoryProxyService, isAllowedNode } from '../chat-memory-proxy.service';
import { ChatMemorySessionRepository } from '../chat-memory-session.repository';
import { ChatMemoryRepository } from '../chat-memory.repository';

beforeAll(async () => {
	await testModules.loadModules(['chat-memory']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['ChatMemory', 'ChatMemorySession']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('ChatMemoryProxyService', () => {
	let proxyService: ChatMemoryProxyService;
	let memoryRepository: ChatMemoryRepository;
	let memorySessionRepository: ChatMemorySessionRepository;

	beforeAll(() => {
		proxyService = Container.get(ChatMemoryProxyService);
		memoryRepository = Container.get(ChatMemoryRepository);
		memorySessionRepository = Container.get(ChatMemorySessionRepository);
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
		let testProject: Awaited<ReturnType<typeof createTeamProject>>;

		const createTestWorkflowInDb = async (overrides?: {
			name?: string;
			agentName?: string;
		}) => {
			const nodes: INode[] = [
				{
					id: 'chat-trigger-1',
					name: 'Chat Trigger',
					type: CHAT_TRIGGER_NODE_TYPE,
					typeVersion: 1.4,
					position: [0, 0],
					parameters: {
						...(overrides?.agentName && { agentName: overrides.agentName }),
					},
				},
				{
					id: 'memory-1',
					name: 'Memory',
					type: MEMORY_BUFFER_WINDOW_NODE_TYPE,
					typeVersion: 1.3,
					position: [200, 0],
					parameters: {},
				},
			];

			const dbWorkflow = await createWorkflow(
				{ name: overrides?.name ?? 'Test Workflow', nodes },
				testProject,
			);

			return new Workflow({
				id: dbWorkflow.id,
				name: dbWorkflow.name,
				nodes,
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

		beforeAll(async () => {
			testProject = await createTeamProject('Memory Test Project');
		});

		it('should throw error for non-allowed node types', async () => {
			const workflow = await createTestWorkflowInDb();
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

		it('should create memory session with projectId resolved from workflow ownership', async () => {
			const workflow = await createTestWorkflowInDb({ name: 'My Agent' });
			const node = createMemoryNode();
			const sessionKey = `session-${crypto.randomUUID()}`;

			await proxyService.getChatMemoryProxy(workflow, node, sessionKey, null, null);

			const memorySession = await memorySessionRepository.getBySessionKey(sessionKey);
			expect(memorySession).not.toBeNull();
			expect(memorySession?.sessionKey).toBe(sessionKey);
			expect(memorySession?.projectId).toBe(testProject.id);
		});

		it('should support arbitrary string session keys', async () => {
			const workflow = await createTestWorkflowInDb();
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

		it('should not recreate session if it already exists', async () => {
			const workflow = await createTestWorkflowInDb();
			const node = createMemoryNode();
			const sessionKey = `session-${crypto.randomUUID()}`;

			// First call creates session
			const proxy1 = await proxyService.getChatMemoryProxy(workflow, node, sessionKey, null, null);
			await proxy1.addHumanMessage('First message');

			// Second call should reuse existing session
			const proxy2 = await proxyService.getChatMemoryProxy(workflow, node, sessionKey, null, null);
			await proxy2.addHumanMessage('Second message');

			const entries = await memoryRepository.find({ where: { sessionKey } });
			expect(entries).toHaveLength(2);
		});

		describe('memory operations', () => {
			it('should not set expiresAt on memory entries', async () => {
				const workflow = await createTestWorkflowInDb();
				const node = createMemoryNode();
				const sessionKey = `session-${crypto.randomUUID()}`;

				const proxy = await proxyService.getChatMemoryProxy(workflow, node, sessionKey, null, null);

				await proxy.addHumanMessage('Hello, world!');

				const entries = await memoryRepository.find({ where: { sessionKey } });
				expect(entries).toHaveLength(1);
				expect(entries[0].role).toBe('human');
				expect(entries[0].content).toEqual({ content: 'Hello, world!' });
				expect(entries[0].expiresAt).toBeNull();
			});

			it('should add AI message with tool calls', async () => {
				const workflow = await createTestWorkflowInDb();
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
				const workflow = await createTestWorkflowInDb();
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
				const workflow = await createTestWorkflowInDb();
				const node = createMemoryNode();
				const sessionKey = `session-${crypto.randomUUID()}`;
				const turnId1 = crypto.randomUUID();
				const turnId2 = crypto.randomUUID();

				// Create memory session first (required for FK constraint)
				await memorySessionRepository.createSession({
					sessionKey,
					projectId: testProject.id,
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
				const workflow = await createTestWorkflowInDb();
				const node = createMemoryNode();
				const sessionKey = `session-${crypto.randomUUID()}`;
				const turnId1 = crypto.randomUUID();
				const turnId2 = crypto.randomUUID();
				const turnId3 = crypto.randomUUID();
				const turnIdCurrent = crypto.randomUUID();

				// Create memory session first (required for FK constraint)
				await memorySessionRepository.createSession({
					sessionKey,
					projectId: testProject.id,
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
				const workflow = await createTestWorkflowInDb();
				const node = createMemoryNode();
				const sessionKey1 = `session-${crypto.randomUUID()}`;
				const sessionKey2 = `session-${crypto.randomUUID()}`;

				// Create two memory sessions
				await memorySessionRepository.createSession({
					sessionKey: sessionKey1,
					projectId: testProject.id,
					workflowId: null,
				});

				await memorySessionRepository.createSession({
					sessionKey: sessionKey2,
					projectId: testProject.id,
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
				const workflow = await createTestWorkflowInDb();
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
				const workflow = await createTestWorkflowInDb();
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
	});
});
