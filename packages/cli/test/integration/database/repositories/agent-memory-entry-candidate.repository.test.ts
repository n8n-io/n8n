import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, EntityManager, type Repository } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentMemoryEntryCandidateEntity } from '@/modules/agents/entities/agent-memory-entry-candidate.entity';
import { AgentMessageEntity } from '@/modules/agents/entities/agent-message.entity';
import { AgentMemoryEntryCandidateRepository } from '@/modules/agents/repositories/agent-memory-entry-candidate.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentResourceRepository } from '@/modules/agents/repositories/agent-resource.repository';
import { AgentThreadRepository } from '@/modules/agents/repositories/agent-thread.repository';

describe('AgentMemoryEntryCandidateRepository', () => {
	let candidateRepository: AgentMemoryEntryCandidateRepository;
	let candidateTable: Repository<AgentMemoryEntryCandidateEntity>;
	let agentRepository: AgentRepository;
	let resourceRepository: AgentResourceRepository;
	let threadRepository: AgentThreadRepository;
	let agentId: string;
	let resourceId: string;
	let threadId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		candidateRepository = Container.get(AgentMemoryEntryCandidateRepository);
		candidateTable = Container.get(DataSource).getRepository(AgentMemoryEntryCandidateEntity);
		agentRepository = Container.get(AgentRepository);
		resourceRepository = Container.get(AgentResourceRepository);
		threadRepository = Container.get(AgentThreadRepository);
	}, 30_000);

	beforeEach(async () => {
		const project = await createTeamProject();
		const agent = agentRepository.create({
			id: uuid(),
			name: 'Test Agent',
			projectId: project.id,
			integrations: [],
			tools: {},
			skills: {},
		} as Partial<Agent>);
		await agentRepository.save(agent);
		agentId = agent.id;
		resourceId = uuid();
		threadId = uuid();
		await resourceRepository.insert({ id: resourceId, metadata: null });
		await threadRepository.insert({ id: threadId, resourceId, title: null, metadata: null });
	});

	afterEach(async () => {
		await candidateTable.delete({});
		await threadRepository.delete({});
		await resourceRepository.delete({});
		await agentRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function enqueue(
		toolCallId: string,
		overrides: Partial<{
			resourceId: string;
			threadId: string;
			runId: string;
			sourceMessageId: string;
		}>,
		ctx: OperationContext,
	) {
		return await candidateRepository.enqueueCandidate(
			{
				agentId,
				resourceId: overrides.resourceId ?? resourceId,
				threadId: overrides.threadId ?? threadId,
				sourceMessageId: overrides.sourceMessageId ?? null,
				runId: overrides.runId ?? 'run-1',
				toolCallId,
				content: `Durable memory for ${toolCallId}`,
				evidenceText: `Evidence for ${toolCallId}`,
				kind: 'fact',
			},
			ctx,
		);
	}

	it('enqueues replayed tool calls once and reads pending rows by resource in order', async () => {
		const first = await enqueue('call-1', {}, {});
		const replay = await enqueue('call-1', {}, {});
		const nextRun = await enqueue('call-1', { runId: 'run-2' }, {});
		const second = await enqueue('call-2', {}, {});

		const otherResourceId = uuid();
		const otherThreadId = uuid();
		await resourceRepository.insert({ id: otherResourceId, metadata: null });
		await threadRepository.insert({
			id: otherThreadId,
			resourceId: otherResourceId,
			title: null,
			metadata: null,
		});
		await enqueue('call-other', { resourceId: otherResourceId, threadId: otherThreadId }, {});
		await candidateTable.update(first.id, {
			createdAt: new Date('2026-05-12T10:00:00.000Z'),
		});
		await candidateTable.update(nextRun.id, {
			createdAt: new Date('2026-05-12T10:30:00.000Z'),
		});
		await candidateTable.update(second.id, {
			createdAt: new Date('2026-05-12T11:00:00.000Z'),
		});

		expect(replay.id).toBe(first.id);
		expect(first.id).toEqual(expect.any(String));
		expect(first.id).not.toBe('');
		await expect(
			candidateRepository.findPendingForResource(agentId, resourceId, 10, {}),
		).resolves.toEqual([
			expect.objectContaining({ id: first.id }),
			expect.objectContaining({ id: nextRun.id }),
			expect.objectContaining({ id: second.id }),
		]);
	});

	it('finds the candidates of tool calls in one thread', async () => {
		const otherThreadId = uuid();
		await threadRepository.insert({ id: otherThreadId, resourceId, title: null, metadata: null });
		const first = await enqueue('call-1', {}, {});
		const second = await enqueue('call-2', {}, {});
		await enqueue('call-3', {}, {});
		const otherThread = await enqueue('call-1', { threadId: otherThreadId, runId: 'run-2' }, {});
		expect(otherThread.id).not.toBe(first.id);

		const found = await candidateRepository.findByToolCalls(
			agentId,
			threadId,
			['call-1', 'call-2'],
			{},
		);

		expect(found.map(({ id }) => id).sort()).toEqual([first.id, second.id].sort());
		await expect(
			candidateRepository.findByToolCalls(uuid(), threadId, ['call-1'], {}),
		).resolves.toEqual([]);
	});

	it('returns an existing candidate after an insert conflict and commits further changes', async () => {
		const existing = await enqueue('call-1', {}, {});
		await candidateRepository.recordCandidateFailure(agentId, [existing.id], 1, {});
		const stored = await candidateTable.findOneByOrFail({ id: existing.id });

		await Container.get(TransactionRunner).run({}, async (ctx) => {
			// Model a lookup that ran before another transaction committed the same tool call.
			const lookup = vi.spyOn(EntityManager.prototype, 'findOneBy').mockResolvedValueOnce(null);
			try {
				const replay = await enqueue('call-1', { sourceMessageId: uuid() }, ctx);
				expect(replay).toEqual(stored);
			} finally {
				lookup.mockRestore();
			}

			const next = await enqueue('call-2', {}, ctx);
			await candidateRepository.markCandidatesCompleted(agentId, [next.id], ctx);
		});

		await expect(candidateTable.findOneByOrFail({ id: existing.id })).resolves.toEqual(stored);
		await expect(
			candidateTable.findOneByOrFail({ agentId, toolCallId: 'call-2' }),
		).resolves.toMatchObject({
			status: 'completed',
		});
		await expect(candidateTable.count()).resolves.toBe(2);
	});

	it('completes selected rows and stops retrying rows at the failure limit', async () => {
		const completed = await enqueue('call-complete', {}, {});
		const failed = await enqueue('call-fail', {}, {});

		await candidateRepository.markCandidatesCompleted(agentId, [completed.id], {});
		await Promise.all([
			candidateRepository.recordCandidateFailure(agentId, [completed.id, failed.id], 3, {}),
			candidateRepository.recordCandidateFailure(agentId, [completed.id, failed.id], 3, {}),
			candidateRepository.recordCandidateFailure(agentId, [completed.id, failed.id], 3, {}),
		]);

		await expect(candidateTable.findOneByOrFail({ id: completed.id })).resolves.toMatchObject({
			status: 'completed',
			attemptCount: 0,
		});
		await expect(candidateTable.findOneByOrFail({ id: failed.id })).resolves.toMatchObject({
			status: 'failed',
			attemptCount: 3,
		});
		await expect(
			candidateRepository.findPendingForResource(agentId, resourceId, 10, {}),
		).resolves.toEqual([]);
	});

	it('uses the transaction context for candidate changes and source message reads', async () => {
		const messageTable = Container.get(DataSource).getRepository(AgentMessageEntity);
		const message = await messageTable.save(
			messageTable.create({
				threadId,
				resourceId,
				role: 'user',
				content: { role: 'user', content: [{ type: 'text', text: 'Use three eggs.' }] },
				author: { id: 'user-1', name: 'Alice' },
				origin: { source: 'chat' },
			}),
		);
		const rollback = new Error('Roll back candidate changes');

		await expect(
			Container.get(TransactionRunner).run({}, async (ctx) => {
				const first = await enqueue('call-1', { sourceMessageId: message.id }, ctx);
				const replay = await enqueue('call-1', {}, ctx);
				expect(replay.id).toBe(first.id);
				await expect(
					candidateRepository.findPendingForResource(agentId, resourceId, 10, ctx),
				).resolves.toEqual([first]);
				await expect(
					candidateRepository.findSourceMessages(agentId, [first.id], ctx),
				).resolves.toEqual(
					new Map([[first.id, { author: message.author, origin: message.origin }]]),
				);

				await candidateRepository.recordCandidateFailure(agentId, [first.id], 1, ctx);
				await expect(
					candidateRepository.findByToolCalls(agentId, threadId, ['call-1'], ctx),
				).resolves.toEqual([
					expect.objectContaining({ id: first.id, status: 'failed', attemptCount: 1 }),
				]);
				const second = await enqueue('call-2', {}, ctx);
				await candidateRepository.markCandidatesCompleted(agentId, [second.id], ctx);
				await expect(
					candidateRepository.findByToolCalls(agentId, threadId, ['call-2'], ctx),
				).resolves.toEqual([expect.objectContaining({ id: second.id, status: 'completed' })]);
				throw rollback;
			}),
		).rejects.toThrow(rollback);

		await expect(candidateTable.count()).resolves.toBe(0);
	});
});
