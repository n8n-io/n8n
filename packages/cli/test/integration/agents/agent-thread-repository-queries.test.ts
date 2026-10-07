import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentMessageQueueRepository } from '@/modules/agents/repositories/agent-message-queue.repository';
import { AgentMessageRepository } from '@/modules/agents/repositories/agent-message.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentThreadGrantRepository } from '@/modules/agents/repositories/agent-thread-grant.repository';

import { createMember } from '../shared/db/users';

describe('Agent thread repository queries for system agents', () => {
	let threadRepo: AgentExecutionThreadRepository;
	let agentRepo: AgentRepository;
	let grantRepo: AgentThreadGrantRepository;
	let queueRepo: AgentMessageQueueRepository;
	let messageRepo: AgentMessageRepository;
	let executionRepo: AgentExecutionRepository;
	let projectId: string;
	let agentId: string;
	let otherAgentId: string;
	let ownerId: string;
	let otherUserId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		threadRepo = Container.get(AgentExecutionThreadRepository);
		agentRepo = Container.get(AgentRepository);
		grantRepo = Container.get(AgentThreadGrantRepository);
		queueRepo = Container.get(AgentMessageQueueRepository);
		messageRepo = Container.get(AgentMessageRepository);
		executionRepo = Container.get(AgentExecutionRepository);
		ownerId = (await createMember()).id;
		otherUserId = (await createMember()).id;
	});

	beforeEach(async () => {
		projectId = (await createTeamProject()).id;
		agentId = (await createAgent('Agent')).id;
		otherAgentId = (await createAgent('Other agent')).id;
	});

	afterEach(async () => {
		await queueRepo.delete({});
		await executionRepo.delete({});
		await threadRepo.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createAgent(name: string): Promise<Agent> {
		return await agentRepo.save(
			agentRepo.create({ id: uuid(), name, projectId, integrations: [], tools: {}, skills: {} }),
		);
	}

	async function createThread(
		overrides: Partial<AgentExecutionThread> = {},
		updatedAt?: string,
	): Promise<AgentExecutionThread> {
		const thread = await threadRepo.save(
			threadRepo.create({
				id: uuid(),
				agentId,
				agentName: 'Agent',
				projectId,
				accessScope: 'user',
				ownerId,
				...overrides,
			}),
		);
		if (updatedAt) {
			await threadRepo.update({ id: thread.id }, { updatedAt: new Date(updatedAt) });
			thread.updatedAt = new Date(updatedAt);
		}
		return thread;
	}

	const ids = (threads: AgentExecutionThread[]) => threads.map(({ id }) => id);

	describe('findOwnedByAgent', () => {
		it("returns the owner's top-level private sessions with the agent, newest first", async () => {
			const older = await createThread({}, '2024-01-01T00:00:00.000Z');
			const newer = await createThread({}, '2024-02-01T00:00:00.000Z');
			await createThread({ parentThreadId: newer.id });
			await createThread({ ownerId: otherUserId });
			await createThread({ accessScope: 'project', ownerId: null });
			await createThread({ agentId: otherAgentId });

			expect(ids(await threadRepo.findOwnedByAgent(agentId, ownerId))).toEqual([
				newer.id,
				older.id,
			]);
		});

		it('applies the limit and orders sessions with the same updatedAt by id', async () => {
			const created = [];
			for (let index = 0; index < 3; index++) {
				created.push(await createThread({}, '2024-01-01T00:00:00.000Z'));
			}
			const expected = ids(created).sort().reverse();

			expect(ids(await threadRepo.findOwnedByAgent(agentId, ownerId, { limit: 2 }))).toEqual(
				expected.slice(0, 2),
			);
		});
	});

	describe('findOwnedById', () => {
		it('returns a private session only for its owner and agent', async () => {
			const thread = await createThread();
			const shared = await createThread({ accessScope: 'project', ownerId: null });

			expect((await threadRepo.findOwnedById(agentId, ownerId, thread.id))?.id).toBe(thread.id);
			expect(await threadRepo.findOwnedById(agentId, otherUserId, thread.id)).toBeNull();
			expect(await threadRepo.findOwnedById(otherAgentId, ownerId, thread.id)).toBeNull();
			expect(await threadRepo.findOwnedById(agentId, ownerId, shared.id)).toBeNull();
			expect(await threadRepo.findOwnedById(agentId, ownerId, 'missing')).toBeNull();
		});
	});

	describe('updateOwned', () => {
		it('updates the title and the project of a session', async () => {
			const thread = await createThread({ title: 'Old title' });
			const otherProjectId = (await createTeamProject()).id;

			await threadRepo.updateOwned(thread.id, { title: 'New title' });
			expect(await threadRepo.findOneByOrFail({ id: thread.id })).toMatchObject({
				title: 'New title',
				projectId,
			});

			await threadRepo.updateOwned(thread.id, { projectId: otherProjectId });
			expect(await threadRepo.findOneByOrFail({ id: thread.id })).toMatchObject({
				title: 'New title',
				projectId: otherProjectId,
			});
		});

		it('does nothing when no change is given', async () => {
			const thread = await createThread({ title: 'Title' }, '2024-01-01T00:00:00.000Z');

			await expect(threadRepo.updateOwned(thread.id, {})).resolves.toBeUndefined();
			await expect(
				threadRepo.updateOwned(thread.id, { title: undefined }),
			).resolves.toBeUndefined();
			const stored = await threadRepo.findOneByOrFail({ id: thread.id });
			expect(stored.title).toBe('Title');
			expect(stored.updatedAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
		});
	});

	describe('findOwnedHistoryPage', () => {
		async function readAllPages(limit: number, search?: string) {
			const pages: string[][] = [];
			let before: { updatedAt: Date; id: string } | undefined;
			// Stop a broken keyset that repeats rows, so the test fails instead of hanging.
			while (pages.length < 20) {
				const page = await threadRepo.findOwnedHistoryPage(agentId, ownerId, limit, search, before);
				pages.push(ids(page.threads));
				const last = page.threads.at(-1);
				if (!page.hasMore || !last) break;
				before = { updatedAt: last.updatedAt, id: last.id };
			}
			return pages;
		}

		it("pages through the owner's top-level private sessions, newest first", async () => {
			const first = await createThread({}, '2024-03-01T00:00:00.000Z');
			const second = await createThread({}, '2024-02-01T00:00:00.000Z');
			const third = await createThread({}, '2024-01-01T00:00:00.000Z');
			await createThread({ parentThreadId: first.id }, '2024-04-01T00:00:00.000Z');
			await createThread({ ownerId: otherUserId }, '2024-04-01T00:00:00.000Z');
			await createThread({ accessScope: 'project', ownerId: null }, '2024-04-01T00:00:00.000Z');
			await createThread({ agentId: otherAgentId }, '2024-04-01T00:00:00.000Z');

			expect(await readAllPages(2)).toEqual([[first.id, second.id], [third.id]]);
		});

		it('reports no next page when the last page is exactly full', async () => {
			const first = await createThread({}, '2024-02-01T00:00:00.000Z');
			const second = await createThread({}, '2024-01-01T00:00:00.000Z');

			expect(await threadRepo.findOwnedHistoryPage(agentId, ownerId, 2)).toEqual({
				threads: [
					expect.objectContaining({ id: first.id }),
					expect.objectContaining({ id: second.id }),
				],
				hasMore: false,
			});
		});

		it('neither skips nor repeats sessions with the same updatedAt across pages', async () => {
			const newest = await createThread({}, '2024-02-01T00:00:00.000Z');
			const tied = [];
			for (let index = 0; index < 5; index++) {
				tied.push(await createThread({}, '2024-01-01T00:00:00.000Z'));
			}
			const oldest = await createThread({}, '2023-12-01T00:00:00.000Z');

			const pages = await readAllPages(2);

			expect(pages.flat()).toEqual([newest.id, ...ids(tied).sort().reverse(), oldest.id]);
			expect(pages.map((page) => page.length)).toEqual([2, 2, 2, 1]);
		});

		it('pages across a tie stored without milliseconds', async () => {
			const later = await createThread({}, '2024-01-01T00:00:01.500Z');
			const tied = [await createThread(), await createThread()];
			// SQLite can store timestamps without milliseconds. The keyset must still match them.
			for (const thread of tied) {
				await threadRepo
					.createQueryBuilder()
					.update()
					.set({ updatedAt: () => "'2024-01-01 00:00:00'" })
					.where('id = :id', { id: thread.id })
					.execute();
			}

			const pages = await readAllPages(1);

			expect(pages).toEqual([
				[later.id],
				...ids(tied)
					.sort()
					.reverse()
					.map((id) => [id]),
			]);
		});

		it('filters by title without case sensitivity and matches wildcards literally', async () => {
			const match = await createThread(
				{ title: 'Weekly Sales report' },
				'2024-02-01T00:00:00.000Z',
			);
			const literal = await createThread({ title: '100% done_now' }, '2024-01-01T00:00:00.000Z');
			await createThread({ title: 'Inventory' });
			await createThread({ title: '100 percent donexnow' });
			await createThread({ title: null });

			expect((await readAllPages(10, '  sales REPORT ')).flat()).toEqual([match.id]);
			expect((await readAllPages(10, '0% done_')).flat()).toEqual([literal.id]);
			expect((await readAllPages(10, '   ')).flat()).toHaveLength(5);
		});

		it('applies the search on every page', async () => {
			const first = await createThread({ title: 'Report A' }, '2024-03-01T00:00:00.000Z');
			await createThread({ title: 'Other' }, '2024-02-15T00:00:00.000Z');
			const second = await createThread({ title: 'Report B' }, '2024-02-01T00:00:00.000Z');

			expect(await readAllPages(1, 'report')).toEqual([[first.id], [second.id]]);
		});
	});

	describe('findByAgentUpdatedBefore', () => {
		it('returns sessions of the agent updated before the cutoff, oldest first', async () => {
			const oldest = await createThread({}, '2024-01-01T00:00:00.000Z');
			const tied = [
				await createThread({ ownerId: otherUserId }, '2024-01-02T00:00:00.000Z'),
				await createThread({ accessScope: 'project', ownerId: null }, '2024-01-02T00:00:00.000Z'),
			];
			await createThread({}, '2024-01-03T00:00:00.000Z');
			await createThread({ agentId: otherAgentId }, '2024-01-01T00:00:00.000Z');
			const cutoff = new Date('2024-01-03T00:00:00.000Z');

			expect(ids(await threadRepo.findByAgentUpdatedBefore(agentId, cutoff, 10))).toEqual([
				oldest.id,
				...ids(tied).sort(),
			]);
			expect(ids(await threadRepo.findByAgentUpdatedBefore(agentId, cutoff, 1))).toEqual([
				oldest.id,
			]);
		});
	});

	describe('AgentThreadGrantRepository.revoke', () => {
		it('removes one grant of one thread', async () => {
			const thread = await createThread();
			const other = await createThread();
			await grantRepo.grant(thread.id, 'tool-a');
			await grantRepo.grant(thread.id, 'tool-b');
			await grantRepo.grant(other.id, 'tool-a');

			await grantRepo.revoke(thread.id, 'tool-a');
			await grantRepo.revoke(thread.id, 'missing');

			expect(await grantRepo.findKeys(thread.id)).toEqual(new Set(['tool-b']));
			expect(await grantRepo.findKeys(other.id)).toEqual(new Set(['tool-a']));
		});
	});

	describe('AgentMessageQueueRepository.hasItems', () => {
		async function enqueue(threadId: string, hidden = false) {
			const message = await messageRepo.createInput(
				{
					threadId,
					resourceId: ownerId,
					content: { role: 'user', content: [{ type: 'text', text: 'Input' }] },
					origin: hidden ? { source: 'system', hidden: true } : { source: 'system' },
				},
				{},
			);
			return await queueRepo.enqueue(threadId, message.id, { kind: 'system' }, {});
		}

		it('is true while a queued or claimed item exists, hidden turns included', async () => {
			const thread = await createThread();
			const other = await createThread();
			expect(await queueRepo.hasItems(thread.id)).toBe(false);

			const item = await enqueue(thread.id, true);
			expect(await queueRepo.hasItems(thread.id)).toBe(true);
			expect(await queueRepo.hasItems(other.id)).toBe(false);

			const execution = await executionRepo.save(
				executionRepo.create({ id: uuid(), threadId: thread.id, status: 'running' }),
			);
			expect(await queueRepo.linkExecution(item.id, null, execution.id, {})).toBe(true);
			expect(await queueRepo.hasItems(thread.id)).toBe(true);

			await queueRepo.removeActive(thread.id, execution.id, {});
			expect(await queueRepo.hasItems(thread.id)).toBe(false);
		});
	});
});
