import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentChatAttachment } from '@/modules/agents/entities/agent-chat-attachment.entity';
import { AgentChatAttachmentRepository } from '@/modules/agents/repositories/agent-chat-attachment.repository';
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
	let attachmentRepo: AgentChatAttachmentRepository;
	let attachmentTable: Repository<AgentChatAttachment>;
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
		attachmentRepo = Container.get(AgentChatAttachmentRepository);
		attachmentTable = Container.get(DataSource).getRepository(AgentChatAttachment);
		ownerId = (await createMember()).id;
		otherUserId = (await createMember()).id;
	});

	beforeEach(async () => {
		projectId = (await createTeamProject()).id;
		agentId = (await createAgent('Agent')).id;
		otherAgentId = (await createAgent('Other agent')).id;
	});

	afterEach(async () => {
		await attachmentTable.delete({});
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

	describe('findAccessibleById', () => {
		it.each(['project', 'user'] as const)('finds an accessible %s session', async (accessScope) => {
			const thread = await createThread({ accessScope });
			expect(
				await threadRepo.findAccessibleById(thread.id, projectId, agentId, ownerId),
			).toMatchObject({ id: thread.id });
		});

		it('finds a shared session for another project member', async () => {
			const thread = await createThread({ accessScope: 'project', ownerId: null });
			expect(
				await threadRepo.findAccessibleById(thread.id, projectId, agentId, otherUserId),
			).toMatchObject({ id: thread.id });
		});

		it.each(['project', 'user'] as const)(
			'finds an accessible %s child session',
			async (accessScope) => {
				const parent = await createThread({ accessScope });
				const child = await createThread({ accessScope, parentThreadId: parent.id });
				expect(
					await threadRepo.findAccessibleById(child.id, projectId, agentId, ownerId),
				).toMatchObject({ id: child.id });
				if (accessScope === 'user') {
					expect(
						await threadRepo.findAccessibleById(child.id, projectId, agentId, otherUserId),
					).toBeNull();
				}
			},
		);

		it('does not return sessions outside the requested scope', async () => {
			const thread = await createThread();
			const otherProject = await createTeamProject();
			for (const [requestedProject, requestedAgent, requestedUser] of [
				[otherProject.id, agentId, ownerId],
				[projectId, otherAgentId, ownerId],
				[projectId, agentId, otherUserId],
			]) {
				expect(
					await threadRepo.findAccessibleById(
						thread.id,
						requestedProject,
						requestedAgent,
						requestedUser,
					),
				).toBeNull();
			}
			await threadRepo.update(thread.id, { ownerId: null });
			expect(
				await threadRepo.findAccessibleById(thread.id, projectId, agentId, ownerId),
			).toBeNull();
			expect(
				await threadRepo.findAccessibleById('missing', projectId, agentId, ownerId),
			).toBeNull();
		});
	});

	describe('findOwnedById', () => {
		it('returns a top-level private session only for its owner and agent', async () => {
			const thread = await createThread();
			const shared = await createThread({ accessScope: 'project', ownerId: null });
			const child = await createThread({ parentThreadId: thread.id });

			expect((await threadRepo.findOwnedById(agentId, ownerId, thread.id))?.id).toBe(thread.id);
			expect(await threadRepo.findOwnedById(agentId, otherUserId, thread.id)).toBeNull();
			expect(await threadRepo.findOwnedById(otherAgentId, ownerId, thread.id)).toBeNull();
			expect(await threadRepo.findOwnedById(agentId, ownerId, shared.id)).toBeNull();
			expect(await threadRepo.findOwnedById(agentId, ownerId, child.id)).toBeNull();
			expect(await threadRepo.findOwnedById(agentId, ownerId, 'missing')).toBeNull();
		});
	});

	describe('renameOwned', () => {
		it('renames a session and keeps its project', async () => {
			const thread = await createThread({ title: 'Old title' });

			expect(await threadRepo.renameOwned(agentId, ownerId, thread.id, 'New title', {})).toBe(true);
			expect(await threadRepo.findOneByOrFail({ id: thread.id })).toMatchObject({
				title: 'New title',
				projectId,
			});
		});

		it('does not rename a session of another owner, another agent or a parent session', async () => {
			const parent = await createThread({ title: 'Parent' });
			const child = await createThread({ parentThreadId: parent.id, title: 'Child' });
			const shared = await createThread({ accessScope: 'project', ownerId: null, title: 'Shared' });
			const rename = async (agent: string, owner: string, threadId: string) =>
				await threadRepo.renameOwned(agent, owner, threadId, 'Changed', {});

			expect(await rename(agentId, otherUserId, parent.id)).toBe(false);
			expect(await rename(otherAgentId, ownerId, parent.id)).toBe(false);
			expect(await rename(agentId, ownerId, child.id)).toBe(false);
			expect(await rename(agentId, ownerId, shared.id)).toBe(false);
			expect(await rename(agentId, ownerId, 'missing')).toBe(false);
			const stored = await threadRepo.findBy({});
			expect(stored.map(({ title }) => title).sort()).toEqual(['Child', 'Parent', 'Shared']);
		});
	});

	describe('moveOwned', () => {
		it('moves a session to another project and keeps its title', async () => {
			const thread = await createThread({ title: 'Title' });
			const otherProjectId = (await createTeamProject()).id;

			expect(await threadRepo.moveOwned(agentId, ownerId, thread.id, otherProjectId, {})).toBe(
				true,
			);
			expect(await threadRepo.findOneByOrFail({ id: thread.id })).toMatchObject({
				title: 'Title',
				projectId: otherProjectId,
			});
		});

		it('moves the chat attachments of the session with it', async () => {
			const thread = await createThread();
			const other = await createThread();
			const otherProjectId = (await createTeamProject()).id;
			const attach = async (threadId: string) =>
				await attachmentTable.save(
					attachmentTable.create({
						agentId,
						projectId,
						threadId,
						createdByThreadId: threadId,
						binaryDataId: 'filesystem-v2:file',
						fileName: 'file.txt',
						mimeType: 'text/plain',
						fileSizeBytes: 1,
						source: 'chat',
					}),
				);
			const moved = await attach(thread.id);
			const kept = await attach(other.id);

			await threadRepo.moveOwned(agentId, ownerId, thread.id, otherProjectId, {});

			expect(
				await attachmentRepo.findByIdInThread(
					moved.id,
					{ projectId: otherProjectId, threadId: thread.id },
					{},
				),
			).toMatchObject({ id: moved.id });
			expect(await attachmentTable.findOneByOrFail({ id: kept.id })).toMatchObject({ projectId });
		});

		it('does not move a session of another owner, another agent or a parent session', async () => {
			const parent = await createThread();
			const child = await createThread({ parentThreadId: parent.id });
			const shared = await createThread({ accessScope: 'project', ownerId: null });
			const otherProjectId = (await createTeamProject()).id;
			const move = async (agent: string, owner: string, threadId: string) =>
				await threadRepo.moveOwned(agent, owner, threadId, otherProjectId, {});

			expect(await move(agentId, otherUserId, parent.id)).toBe(false);
			expect(await move(otherAgentId, ownerId, parent.id)).toBe(false);
			expect(await move(agentId, ownerId, child.id)).toBe(false);
			expect(await move(agentId, ownerId, shared.id)).toBe(false);
			expect(await move(agentId, ownerId, 'missing')).toBe(false);
			const stored = await threadRepo.findBy({});
			expect(stored.every((thread) => thread.projectId === projectId)).toBe(true);
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

		it('pages across a tie stored in two formats', async () => {
			const tied = [];
			for (let index = 0; index < 4; index++) tied.push(await createThread());
			// SQLite can store the same time with and without milliseconds.
			const formats = ["'2024-01-01 00:00:00'", "'2024-01-01 00:00:00.000'"];
			for (const [index, thread] of tied.entries()) {
				await threadRepo
					.createQueryBuilder()
					.update()
					.set({ updatedAt: () => formats[index % 2] })
					.where('id = :id', { id: thread.id })
					.execute();
			}

			expect((await readAllPages(1)).flat()).toEqual(ids(tied).sort().reverse());
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

	describe('findIdsByAgentId', () => {
		it('returns only the session ids of the agent', async () => {
			const threads = [await createThread(), await createThread({ ownerId: otherUserId })];
			await createThread({ agentId: otherAgentId });

			expect((await threadRepo.findIdsByAgentId(agentId)).sort()).toEqual(ids(threads).sort());
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
