import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { N8N_CHAT_PRODUCTION_SOURCE } from '@/modules/agents/utils/agent-thread-access';

import { createMember } from '../../shared/db/users';

// The cross-agent "my n8n Chat threads" list and its usage-count sibling:
// exercised separately from the rest of `AgentExecutionThreadRepository`'s
// heavier execution-recording tests.
describe('AgentExecutionThreadRepository n8n Chat queries', () => {
	let threadRepo: AgentExecutionThreadRepository;
	let executionRepo: AgentExecutionRepository;
	let agentRepo: AgentRepository;
	let agentHistoryRepo: AgentHistoryRepository;
	let projectId: string;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		threadRepo = Container.get(AgentExecutionThreadRepository);
		executionRepo = Container.get(AgentExecutionRepository);
		agentRepo = Container.get(AgentRepository);
		agentHistoryRepo = Container.get(AgentHistoryRepository);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		projectId = project.id;
		const agent = await agentRepo.save(
			agentRepo.create({
				id: uuid(),
				name: 'Test Agent',
				projectId,
				integrations: [],
				tools: {},
				skills: {},
			} as Partial<Agent>),
		);
		agentId = agent.id;
	});

	afterEach(async () => {
		await executionRepo.delete({});
		await threadRepo.delete({});
		await agentHistoryRepo.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createThread(
		overrides: Partial<AgentExecutionThread> = {},
	): Promise<AgentExecutionThread> {
		return await threadRepo.save(
			threadRepo.create({
				id: uuid(),
				agentId,
				agentName: 'Test Agent',
				projectId,
				accessScope: 'user',
				...overrides,
			}),
		);
	}

	async function createExecution(threadId: string, source: string | null): Promise<void> {
		await executionRepo.save(
			executionRepo.create({ id: uuid(), threadId, status: 'success', source }),
		);
	}

	describe('findN8nChatThreadsForOwner', () => {
		async function listFor(userId: string, agentIds: string[] = [agentId], limit = 20) {
			return await threadRepo.findN8nChatThreadsForOwner(userId, agentIds, limit);
		}

		it("returns only the owner's n8n Chat thread", async () => {
			const owner = await createMember();
			const other = await createMember();
			const ownThread = await createThread({ ownerId: owner.id });
			await createExecution(ownThread.id, N8N_CHAT_PRODUCTION_SOURCE);
			const otherThread = await createThread({ ownerId: other.id });
			await createExecution(otherThread.id, N8N_CHAT_PRODUCTION_SOURCE);

			const { threads } = await listFor(owner.id);

			expect(threads.map((thread) => thread.id)).toEqual([ownThread.id]);
		});

		it('excludes a shared project-scope session even when it is otherwise an n8n Chat thread', async () => {
			const owner = await createMember();
			const sharedThread = await createThread({ accessScope: 'project', ownerId: null });
			await createExecution(sharedThread.id, N8N_CHAT_PRODUCTION_SOURCE);

			const { threads } = await listFor(owner.id);

			expect(threads).toEqual([]);
		});

		it('excludes a thread with no n8n Chat execution', async () => {
			const owner = await createMember();
			const previewThread = await createThread({ ownerId: owner.id });
			await createExecution(previewThread.id, 'chat');
			await createThread({ ownerId: owner.id });

			const { threads } = await listFor(owner.id);

			expect(threads).toEqual([]);
		});

		it('excludes a delegated sub-thread (non top-level)', async () => {
			const owner = await createMember();
			const root = await createThread({ ownerId: owner.id });
			await createExecution(root.id, N8N_CHAT_PRODUCTION_SOURCE);
			const delegated = await createThread({ ownerId: owner.id, parentThreadId: root.id });
			await createExecution(delegated.id, N8N_CHAT_PRODUCTION_SOURCE);

			const { threads } = await listFor(owner.id);

			expect(threads.map((thread) => thread.id)).toEqual([root.id]);
		});

		it('excludes a thread whose agent is outside the given agent ids', async () => {
			const owner = await createMember();
			const otherAgent = await agentRepo.save(
				agentRepo.create({
					id: uuid(),
					name: 'Other Agent',
					projectId,
					integrations: {},
					tools: {},
					skills: {},
				} as Partial<Agent>),
			);
			const inScope = await createThread({ ownerId: owner.id });
			await createExecution(inScope.id, N8N_CHAT_PRODUCTION_SOURCE);
			const outOfScope = await createThread({ ownerId: owner.id, agentId: otherAgent.id });
			await createExecution(outOfScope.id, N8N_CHAT_PRODUCTION_SOURCE);

			// Mirrors a caller that already narrowed to the agents reachable over
			// n8n Chat (`AgentRepository.findChatReachableIds`), which excludes
			// `otherAgent`.
			const { threads } = await listFor(owner.id, [agentId]);

			expect(threads.map((thread) => thread.id)).toEqual([inScope.id]);
		});

		it('joins the agent and its published personalisation', async () => {
			const owner = await createMember();
			const versionId = uuid();
			await agentHistoryRepo.save({
				versionId,
				agentId,
				author: 'test',
				schema: {
					name: 'Test Agent',
					model: 'm',
					instructions: 'i',
					personalisation: { icon: 'bot', gradient: { from: '#000000', to: '#FFFFFF' } },
				},
				tools: null,
				skills: null,
			});
			await agentRepo.update({ id: agentId }, { activeVersionId: versionId });
			const thread = await createThread({ ownerId: owner.id });
			await createExecution(thread.id, N8N_CHAT_PRODUCTION_SOURCE);

			const { threads } = await listFor(owner.id);

			expect(threads[0].agent).toMatchObject({ id: agentId, name: 'Test Agent', projectId });
			expect(threads[0].agent.activeVersion?.schema?.personalisation).toEqual({
				icon: 'bot',
				gradient: { from: '#000000', to: '#FFFFFF' },
			});
		});

		it('pages newest-updated first with a cursor', async () => {
			const owner = await createMember();
			const older = await createThread({ ownerId: owner.id });
			await createExecution(older.id, N8N_CHAT_PRODUCTION_SOURCE);
			await threadRepo.update({ id: older.id }, { updatedAt: new Date('2024-01-01T00:00:00Z') });
			const newer = await createThread({ ownerId: owner.id });
			await createExecution(newer.id, N8N_CHAT_PRODUCTION_SOURCE);
			await threadRepo.update({ id: newer.id }, { updatedAt: new Date('2024-02-01T00:00:00Z') });

			const firstPage = await threadRepo.findN8nChatThreadsForOwner(owner.id, [agentId], 1);
			expect(firstPage.threads.map((thread) => thread.id)).toEqual([newer.id]);
			expect(firstPage.nextCursor).not.toBeNull();

			const secondPage = await threadRepo.findN8nChatThreadsForOwner(
				owner.id,
				[agentId],
				1,
				firstPage.nextCursor!,
			);
			expect(secondPage.threads.map((thread) => thread.id)).toEqual([older.id]);
			expect(secondPage.nextCursor).toBeNull();
		});

		it('returns an empty page without a query when no agent ids are given', async () => {
			const owner = await createMember();
			await expect(listFor(owner.id, [])).resolves.toEqual({ threads: [], nextCursor: null });
		});
	});

	describe('countN8nChatThreadsByAgent', () => {
		it("counts each agent's n8n Chat threads, grouped by agent", async () => {
			const owner = await createMember();
			const secondAgent = await agentRepo.save(
				agentRepo.create({
					id: uuid(),
					name: 'Second Agent',
					projectId,
					integrations: [],
					tools: {},
					skills: {},
				} as Partial<Agent>),
			);
			const lightThread = await createThread({ ownerId: owner.id });
			await createExecution(lightThread.id, N8N_CHAT_PRODUCTION_SOURCE);
			for (let i = 0; i < 2; i++) {
				const thread = await createThread({ ownerId: owner.id, agentId: secondAgent.id });
				await createExecution(thread.id, N8N_CHAT_PRODUCTION_SOURCE);
			}

			const counts = await threadRepo.countN8nChatThreadsByAgent(owner.id, [projectId]);

			expect(counts).toEqual(
				new Map([
					[agentId, 1],
					[secondAgent.id, 2],
				]),
			);
		});

		it("ignores another user's n8n Chat threads", async () => {
			const owner = await createMember();
			const other = await createMember();
			const ownThread = await createThread({ ownerId: owner.id });
			await createExecution(ownThread.id, N8N_CHAT_PRODUCTION_SOURCE);
			const otherThread = await createThread({ ownerId: other.id });
			await createExecution(otherThread.id, N8N_CHAT_PRODUCTION_SOURCE);

			const counts = await threadRepo.countN8nChatThreadsByAgent(owner.id, [projectId]);

			expect(counts).toEqual(new Map([[agentId, 1]]));
		});

		it('ignores a thread with no n8n Chat execution (e.g. preview)', async () => {
			const owner = await createMember();
			const previewThread = await createThread({ ownerId: owner.id });
			await createExecution(previewThread.id, 'chat');

			const counts = await threadRepo.countN8nChatThreadsByAgent(owner.id, [projectId]);

			expect(counts).toEqual(new Map());
		});

		it('ignores a shared project-scope thread', async () => {
			const owner = await createMember();
			const sharedThread = await createThread({ accessScope: 'project', ownerId: null });
			await createExecution(sharedThread.id, N8N_CHAT_PRODUCTION_SOURCE);

			const counts = await threadRepo.countN8nChatThreadsByAgent(owner.id, [projectId]);

			expect(counts).toEqual(new Map());
		});

		it('ignores a thread from a project outside the given scope', async () => {
			const owner = await createMember();
			const otherProject = await createTeamProject();
			const otherAgent = await agentRepo.save(
				agentRepo.create({
					id: uuid(),
					name: 'Other Agent',
					projectId: otherProject.id,
					integrations: {},
					tools: {},
					skills: {},
				} as Partial<Agent>),
			);
			const inScope = await createThread({ ownerId: owner.id });
			await createExecution(inScope.id, N8N_CHAT_PRODUCTION_SOURCE);
			const outOfScope = await createThread({
				ownerId: owner.id,
				agentId: otherAgent.id,
				projectId: otherProject.id,
			});
			await createExecution(outOfScope.id, N8N_CHAT_PRODUCTION_SOURCE);

			const counts = await threadRepo.countN8nChatThreadsByAgent(owner.id, [projectId]);

			expect(counts).toEqual(new Map([[agentId, 1]]));
		});

		it('returns an empty map without a query when the project scope is empty', async () => {
			const owner = await createMember();
			await expect(threadRepo.countN8nChatThreadsByAgent(owner.id, [])).resolves.toEqual(new Map());
		});
	});
});
