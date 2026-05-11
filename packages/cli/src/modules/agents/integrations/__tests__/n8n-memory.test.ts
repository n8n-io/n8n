import { OBSERVATION_SCHEMA_VERSION, type NewObservation } from '@n8n/agents';
import { Equal, In, LessThan, LessThanOrEqual, Like, MoreThan } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import type { AgentMessageEntity } from '../../entities/agent-message.entity';
import { AgentObservationCursorEntity } from '../../entities/agent-observation-cursor.entity';
import { AgentObservationLockEntity } from '../../entities/agent-observation-lock.entity';
import { AgentObservationEntity } from '../../entities/agent-observation.entity';
import { AgentThreadEntity } from '../../entities/agent-thread.entity';
import type { AgentMessageRepository } from '../../repositories/agent-message.repository';
import type { AgentObservationCursorRepository } from '../../repositories/agent-observation-cursor.repository';
import type { AgentObservationLockRepository } from '../../repositories/agent-observation-lock.repository';
import type { AgentObservationRepository } from '../../repositories/agent-observation.repository';
import type { AgentResourceRepository } from '../../repositories/agent-resource.repository';
import type { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import { N8nMemory } from '../n8n-memory';

describe('N8nMemory', () => {
	let memory: N8nMemory;
	let messageRepository: jest.Mocked<AgentMessageRepository>;
	let threadRepository: jest.Mocked<AgentThreadRepository>;
	let resourceRepository: jest.Mocked<AgentResourceRepository>;
	let observationRepository: jest.Mocked<AgentObservationRepository>;
	let observationCursorRepository: jest.Mocked<AgentObservationCursorRepository>;
	let observationLockRepository: jest.Mocked<AgentObservationLockRepository>;
	let runInTransaction: jest.Mock;
	let transactionDelete: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();

		messageRepository = mock<AgentMessageRepository>();
		threadRepository = mock<AgentThreadRepository>();
		resourceRepository = mock<AgentResourceRepository>();
		observationRepository = mock<AgentObservationRepository>();
		observationCursorRepository = mock<AgentObservationCursorRepository>();
		observationLockRepository = mock<AgentObservationLockRepository>();
		transactionDelete = jest.fn().mockResolvedValue({ affected: 1, raw: {} });
		runInTransaction = jest.fn(
			async (callback: (trx: { delete: typeof transactionDelete }) => Promise<void>) => {
				await callback({ delete: transactionDelete });
			},
		);
		Object.defineProperty(threadRepository, 'manager', {
			value: { transaction: runInTransaction },
		});

		memory = new N8nMemory(
			threadRepository,
			messageRepository,
			resourceRepository,
			observationRepository,
			observationCursorRepository,
			observationLockRepository,
		);
	});

	function makeMessageEntity(id: string, createdAt: Date, text: string): AgentMessageEntity {
		return {
			id,
			threadId: 'thread-1',
			resourceId: 'user-1',
			role: 'user',
			type: null,
			content: {
				id,
				createdAt,
				role: 'user',
				content: [{ type: 'text', text }],
			},
			createdAt,
			updatedAt: createdAt,
		} as unknown as AgentMessageEntity;
	}

	describe('getMessages — resourceId filter', () => {
		beforeEach(() => {
			messageRepository.find.mockResolvedValue([]);
		});

		it('includes resourceId in the where clause when provided', async () => {
			await memory.getMessages('thread-1', { resourceId: 'user-1' });

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { threadId: 'thread-1', resourceId: 'user-1' },
				}),
			);
		});

		it('omits resourceId from the where clause when not provided', async () => {
			await memory.getMessages('thread-1');

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { threadId: 'thread-1' },
				}),
			);
		});

		it('preserves an empty-string resourceId in the filter instead of dropping it', async () => {
			// Guard against the previous `...(opts?.resourceId && ...)` bug: a
			// falsy userId must NOT widen the query to every user's messages
			// on a shared thread.
			await memory.getMessages('thread-1', { resourceId: '' });

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { threadId: 'thread-1', resourceId: '' },
				}),
			);
		});

		it('combines resourceId with the `before` filter', async () => {
			const before = new Date('2026-01-01');

			await memory.getMessages('thread-1', { resourceId: 'user-1', before });

			const call = messageRepository.find.mock.calls[0][0];
			expect(call?.where).toMatchObject({
				threadId: 'thread-1',
				resourceId: 'user-1',
				createdAt: LessThan(before),
			});
		});
	});

	describe('getMessages — limit window', () => {
		it('loads the newest limited messages and returns them chronologically', async () => {
			const middle = makeMessageEntity('m2', new Date('2026-01-01T00:00:02.000Z'), 'middle');
			const newest = makeMessageEntity('m3', new Date('2026-01-01T00:00:03.000Z'), 'newest');
			messageRepository.find.mockResolvedValue([newest, middle]);

			const result = await memory.getMessages('thread-1', { limit: 2 });

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { threadId: 'thread-1' },
					order: { createdAt: 'DESC' },
					take: 2,
				}),
			);
			expect(result.map((m) => m.id)).toEqual(['m2', 'm3']);
		});

		it('combines limit with before and resourceId while still asking for newest first', async () => {
			const before = new Date('2026-01-01T00:00:04.000Z');
			messageRepository.find.mockResolvedValue([
				makeMessageEntity('m3', new Date('2026-01-01T00:00:03.000Z'), 'newest'),
				makeMessageEntity('m2', new Date('2026-01-01T00:00:02.000Z'), 'middle'),
			]);

			const result = await memory.getMessages('thread-1', {
				before,
				limit: 2,
				resourceId: 'user-1',
			});

			const call = messageRepository.find.mock.calls[0][0];
			expect(call?.where).toMatchObject({
				threadId: 'thread-1',
				resourceId: 'user-1',
				createdAt: LessThan(before),
			});
			expect(call?.order).toEqual({ createdAt: 'DESC' });
			expect(call?.take).toBe(2);
			expect(result.map((m) => m.id)).toEqual(['m2', 'm3']);
		});
	});

	describe('getMessagesForScope', () => {
		it('queries thread-scoped messages by thread id', async () => {
			const createdAt = new Date('2026-01-01T00:00:02.000Z');
			messageRepository.find.mockResolvedValue([makeMessageEntity('m2', createdAt, 'middle')]);

			const result = await memory.getMessagesForScope('thread', 'thread-1');

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: [{ threadId: 'thread-1' }],
					order: { createdAt: 'ASC', id: 'ASC' },
				}),
			);
			expect(result.map((m) => m.id)).toEqual(['m2']);
		});

		it('applies the cursor keyset for thread scopes', async () => {
			const sinceCreatedAt = new Date('2026-01-01T00:00:01.000Z');
			messageRepository.find.mockResolvedValue([]);

			await memory.getMessagesForScope('thread', 'thread-1', {
				since: { sinceCreatedAt, sinceMessageId: 'm1' },
			});

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: [
						{ threadId: 'thread-1', createdAt: MoreThan(sinceCreatedAt) },
						{ threadId: 'thread-1', createdAt: Equal(sinceCreatedAt), id: MoreThan('m1') },
					],
				}),
			);
		});

		it('rejects non-thread scopes in v1', async () => {
			await expect(memory.getMessagesForScope('resource', 'agent-1:user-1')).rejects.toThrow(
				/not supported/,
			);
			expect(messageRepository.find).not.toHaveBeenCalled();
		});
	});

	describe('saveThread — existing row', () => {
		it('preserves the original resourceId instead of overwriting with the caller’s', async () => {
			// Shared threads (e.g. the test-chat thread keyed by agentId) are
			// written to by multiple users. The first writer owns the row;
			// subsequent saves must not re-stamp it with the current caller.
			const existing = {
				id: 'thread-1',
				resourceId: 'original-user',
				title: null,
				metadata: null,
			} as unknown as AgentThreadEntity;
			threadRepository.findOneBy.mockResolvedValue(existing);
			threadRepository.save.mockImplementation(async (e) => e as AgentThreadEntity);
			resourceRepository.existsBy.mockResolvedValue(true);

			await memory.saveThread({
				id: 'thread-1',
				resourceId: 'different-user',
				title: undefined,
				metadata: undefined,
			});

			expect(threadRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'thread-1', resourceId: 'original-user' }),
			);
		});

		it('still ensures the caller’s resource row exists (for message-level writes)', async () => {
			// resourceId on the thread is preserved, but messages saved afterwards
			// carry the current user's resourceId — that row must exist.
			const existing = {
				id: 'thread-1',
				resourceId: 'original-user',
				title: null,
				metadata: null,
			} as unknown as AgentThreadEntity;
			threadRepository.findOneBy.mockResolvedValue(existing);
			threadRepository.save.mockImplementation(async (e) => e as AgentThreadEntity);
			resourceRepository.existsBy.mockResolvedValue(false);

			await memory.saveThread({
				id: 'thread-1',
				resourceId: 'different-user',
				title: undefined,
				metadata: undefined,
			});

			expect(resourceRepository.existsBy).toHaveBeenCalledWith({ id: 'different-user' });
			expect(resourceRepository.save).toHaveBeenCalled();
		});
	});

	describe('deleteMessagesByThread', () => {
		it('deletes only the caller’s messages when resourceId is provided', async () => {
			await memory.deleteMessagesByThread('thread-1', 'user-1');

			expect(messageRepository.delete).toHaveBeenCalledWith({
				threadId: 'thread-1',
				resourceId: 'user-1',
			});
		});

		it('deletes every message on the thread when resourceId is omitted', async () => {
			await memory.deleteMessagesByThread('thread-1');

			expect(messageRepository.delete).toHaveBeenCalledWith({ threadId: 'thread-1' });
		});

		it('does not widen the delete to all users when resourceId is an empty string', async () => {
			// Same security invariant as getMessages: an accidental falsy userId
			// must never fall through to "delete everyone's messages".
			await memory.deleteMessagesByThread('thread-1', '');

			expect(messageRepository.delete).toHaveBeenCalledWith({
				threadId: 'thread-1',
				resourceId: '',
			});
		});
	});

	describe('deleteThread', () => {
		it('deletes thread-scoped observation state and the thread row in one transaction', async () => {
			await memory.deleteThread('thread-1');

			const scope = { scopeKind: 'thread' as const, scopeId: 'thread-1' };
			expect(runInTransaction).toHaveBeenCalledWith(expect.any(Function));
			expect(transactionDelete).toHaveBeenNthCalledWith(1, AgentObservationEntity, scope);
			expect(transactionDelete).toHaveBeenNthCalledWith(2, AgentObservationCursorEntity, scope);
			expect(transactionDelete).toHaveBeenNthCalledWith(3, AgentObservationLockEntity, scope);
			expect(transactionDelete).toHaveBeenNthCalledWith(4, AgentThreadEntity, { id: 'thread-1' });
			expect(observationRepository.delete).not.toHaveBeenCalled();
			expect(observationCursorRepository.delete).not.toHaveBeenCalled();
			expect(observationLockRepository.delete).not.toHaveBeenCalled();
			expect(threadRepository.delete).not.toHaveBeenCalled();
		});

		it('deletes thread-scoped observation state by thread id prefix in one transaction', async () => {
			await memory.deleteThreadsByPrefix('test-agent-1');

			const scope = { scopeKind: 'thread' as const, scopeId: Like('test-agent-1%') };
			expect(runInTransaction).toHaveBeenCalledWith(expect.any(Function));
			expect(transactionDelete).toHaveBeenNthCalledWith(1, AgentObservationEntity, scope);
			expect(transactionDelete).toHaveBeenNthCalledWith(2, AgentObservationCursorEntity, scope);
			expect(transactionDelete).toHaveBeenNthCalledWith(3, AgentObservationLockEntity, scope);
			expect(transactionDelete).toHaveBeenNthCalledWith(4, AgentThreadEntity, {
				id: Like('test-agent-1%'),
			});
			expect(observationRepository.delete).not.toHaveBeenCalled();
			expect(observationCursorRepository.delete).not.toHaveBeenCalled();
			expect(observationLockRepository.delete).not.toHaveBeenCalled();
			expect(threadRepository.delete).not.toHaveBeenCalled();
		});
	});

	describe('working memory — thread scope', () => {
		it('stores thread-scoped working memory on thread metadata', async () => {
			const existing = {
				id: 'thread-1',
				resourceId: 'user-1',
				title: null,
				metadata: JSON.stringify({ other: true }),
			} as unknown as AgentThreadEntity;
			threadRepository.findOneBy.mockResolvedValue(existing);
			threadRepository.save.mockImplementation(async (entity) => entity as AgentThreadEntity);

			await memory.saveWorkingMemory(
				{ threadId: 'thread-1', resourceId: 'user-1', scope: 'thread' },
				'# Thread memory',
			);

			expect(threadRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: JSON.stringify({ other: true, workingMemory: '# Thread memory' }),
				}),
			);
			expect(resourceRepository.save).not.toHaveBeenCalled();
		});

		it('creates the thread row when working memory is saved before messages', async () => {
			threadRepository.findOneBy.mockResolvedValue(null);
			threadRepository.create.mockImplementation((entity) => entity as AgentThreadEntity);
			threadRepository.save.mockImplementation(async (entity) => entity as AgentThreadEntity);
			resourceRepository.existsBy.mockResolvedValue(true);

			await memory.saveWorkingMemory(
				{ threadId: 'thread-1', resourceId: 'user-1', scope: 'thread' },
				'# Thread memory',
			);

			expect(resourceRepository.existsBy).toHaveBeenCalledWith({ id: 'user-1' });
			expect(threadRepository.create).toHaveBeenCalledWith({
				id: 'thread-1',
				resourceId: 'user-1',
				title: null,
				metadata: JSON.stringify({ workingMemory: '# Thread memory' }),
			});
			expect(threadRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'thread-1',
					resourceId: 'user-1',
					metadata: JSON.stringify({ workingMemory: '# Thread memory' }),
				}),
			);
		});

		it('isolates thread-scoped working memory by user-scoped test-chat thread id', async () => {
			const threads = new Map<string, AgentThreadEntity>([
				[
					'test-agent-1:user-1',
					{
						id: 'test-agent-1:user-1',
						metadata: JSON.stringify({ workingMemory: 'alice notes' }),
					} as unknown as AgentThreadEntity,
				],
				[
					'test-agent-1:user-2',
					{
						id: 'test-agent-1:user-2',
						metadata: JSON.stringify({ workingMemory: 'bob notes' }),
					} as unknown as AgentThreadEntity,
				],
			]);
			threadRepository.findOneBy.mockImplementation(
				async ({ id }: { id: string }) => threads.get(id) ?? null,
			);

			await expect(
				memory.getWorkingMemory({
					threadId: 'test-agent-1:user-1',
					resourceId: 'user-1',
					scope: 'thread',
				}),
			).resolves.toBe('alice notes');
			await expect(
				memory.getWorkingMemory({
					threadId: 'test-agent-1:user-2',
					resourceId: 'user-2',
					scope: 'thread',
				}),
			).resolves.toBe('bob notes');
		});
	});

	// ── Observational memory ─────────────────────────────────────────────

	function makeNewObs(overrides: Partial<NewObservation> = {}): NewObservation {
		return {
			scopeKind: 'resource',
			scopeId: 't-1',
			kind: 'observation',
			payload: { text: 'hello' },
			durationMs: null,
			schemaVersion: OBSERVATION_SCHEMA_VERSION,
			createdAt: new Date('2026-05-05T00:00:00Z'),
			...overrides,
		};
	}

	describe('appendObservations', () => {
		beforeEach(() => {
			observationRepository.create.mockImplementation(
				(input) => ({ ...input }) as AgentObservationEntity,
			);
		});

		it('returns [] for an empty input without touching the repo', async () => {
			const result = await memory.appendObservations([]);
			expect(result).toEqual([]);
			expect(observationRepository.findOne).not.toHaveBeenCalled();
			expect(observationRepository.save).not.toHaveBeenCalled();
		});

		it('persists rows without allocating a sequence number', async () => {
			(observationRepository.save as unknown as jest.Mock).mockImplementation(
				async (input: AgentObservationEntity | AgentObservationEntity[]) =>
					(Array.isArray(input) ? input : [input]).map((e, i) => ({
						...e,
						id: `obs-${i + 1}`,
					})),
			);

			const result = await memory.appendObservations([makeNewObs(), makeNewObs()]);

			expect(observationRepository.findOne).not.toHaveBeenCalled();
			expect(result.map((r) => r.id)).toEqual(['obs-1', 'obs-2']);
		});
	});

	describe('getObservations', () => {
		beforeEach(() => {
			observationRepository.find.mockResolvedValue([]);
		});

		it('passes filters through to find()', async () => {
			const sinceCreatedAt = new Date('2026-05-05T00:00:00Z');
			await memory.getObservations({
				scopeKind: 'resource',
				scopeId: 't-1',
				since: { sinceCreatedAt, sinceObservationId: 'obs-anchor' },
				kindIs: 'summary',
				schemaVersionAtMost: 1,
				limit: 10,
			});

			expect(observationRepository.find).toHaveBeenCalledWith({
				where: [
					{
						scopeKind: 'resource',
						scopeId: 't-1',
						kind: 'summary',
						schemaVersion: LessThanOrEqual(1),
						createdAt: MoreThan(sinceCreatedAt),
					},
					{
						scopeKind: 'resource',
						scopeId: 't-1',
						kind: 'summary',
						schemaVersion: LessThanOrEqual(1),
						createdAt: Equal(sinceCreatedAt),
						id: MoreThan('obs-anchor'),
					},
				],
				order: { createdAt: 'ASC', id: 'ASC' },
				take: 10,
			});
		});

		it('omits absent filters', async () => {
			await memory.getObservations({ scopeKind: 'resource', scopeId: 't-1' });

			expect(observationRepository.find).toHaveBeenCalledWith({
				where: [{ scopeKind: 'resource', scopeId: 't-1' }],
				order: { createdAt: 'ASC', id: 'ASC' },
			});
		});

		it('coerces bigint columns back to numbers on read', async () => {
			observationRepository.find.mockResolvedValue([
				{
					id: 'obs-1',
					scopeKind: 'resource',
					scopeId: 't-1',
					kind: 'observation',
					payload: { text: 'hi' },
					durationMs: '1000' as unknown as number | null,
					schemaVersion: '1' as unknown as number,
					createdAt: new Date('2026-05-05T00:00:00Z'),
					updatedAt: new Date('2026-05-05T00:00:00Z'),
				} as AgentObservationEntity,
			]);

			const [row] = await memory.getObservations({ scopeKind: 'resource', scopeId: 't-1' });
			expect(row.durationMs).toBe(1000);
			expect(row.schemaVersion).toBe(1);
		});
	});

	describe('deleteObservations', () => {
		it('issues a single delete with the given ids', async () => {
			await memory.deleteObservations(['a', 'b']);

			expect(observationRepository.delete).toHaveBeenCalledWith({ id: In(['a', 'b']) });
		});

		it('no-ops on empty input', async () => {
			await memory.deleteObservations([]);
			expect(observationRepository.delete).not.toHaveBeenCalled();
		});
	});

	describe('cursors', () => {
		it('returns null when no cursor row exists', async () => {
			observationCursorRepository.findOneBy.mockResolvedValue(null);
			expect(await memory.getCursor('thread', 't-1')).toBeNull();
		});

		it('reads lastObservedAt and lastObservedMessageId', async () => {
			const lastObservedAt = new Date('2026-05-05T00:00:00.250Z');
			observationCursorRepository.findOneBy.mockResolvedValue({
				scopeKind: 'thread',
				scopeId: 't-1',
				lastObservedMessageId: 'm-7',
				lastObservedAt,
				createdAt: new Date(),
				updatedAt: new Date('2026-05-05T00:00:00Z'),
			} as AgentObservationCursorEntity);

			const cursor = await memory.getCursor('thread', 't-1');
			expect(cursor?.lastObservedAt.getTime()).toBe(lastObservedAt.getTime());
			expect(cursor?.lastObservedMessageId).toBe('m-7');
		});

		it('upserts on setCursor with cursor-advance fields keyed by (scopeKind, scopeId)', async () => {
			const lastObservedAt = new Date('2026-05-05T00:00:00.500Z');
			await memory.setCursor({
				scopeKind: 'thread',
				scopeId: 't-1',
				lastObservedMessageId: 'm-9',
				lastObservedAt,
				updatedAt: new Date('2026-05-05T00:00:00Z'),
			});

			expect(observationCursorRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					scopeKind: 'thread',
					scopeId: 't-1',
					lastObservedMessageId: 'm-9',
					lastObservedAt,
				}),
				expect.objectContaining({ conflictPaths: ['scopeKind', 'scopeId'] }),
			);
			const call = observationCursorRepository.upsert.mock.calls[0][0] as Record<string, unknown>;
			expect(call).not.toHaveProperty('summary');
			expect(call).not.toHaveProperty('summaryUpdatedAt');
		});
	});

	describe('locks', () => {
		const mockLockWrite = ({
			updateAffected,
			claimed,
		}: {
			updateAffected: number;
			claimed?: AgentObservationLockEntity | null;
		}) => {
			const updateQueryBuilder = {
				update: jest.fn().mockReturnThis(),
				set: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ affected: updateAffected }),
			};
			const insertQueryBuilder = {
				insert: jest.fn().mockReturnThis(),
				into: jest.fn().mockReturnThis(),
				values: jest.fn().mockReturnThis(),
				orIgnore: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ raw: {}, generatedMaps: [], identifiers: [] }),
			};

			observationLockRepository.createQueryBuilder
				.mockReturnValueOnce(updateQueryBuilder as never)
				.mockReturnValueOnce(insertQueryBuilder as never);
			observationLockRepository.findOneBy.mockResolvedValue(claimed ?? null);

			return { updateQueryBuilder, insertQueryBuilder };
		};

		beforeEach(() => {
			observationLockRepository.create.mockImplementation(
				(input) => ({ ...input }) as AgentObservationLockEntity,
			);
			observationLockRepository.save.mockImplementation(
				async (input) => input as AgentObservationLockEntity,
			);
		});

		it('grants the lock when the row is missing', async () => {
			const { insertQueryBuilder } = mockLockWrite({
				updateAffected: 0,
				claimed: {
					scopeKind: 'thread',
					scopeId: 't-1',
					holderId: 'A',
					heldUntil: new Date(Date.now() + 60_000),
				} as AgentObservationLockEntity,
			});

			const handle = await memory.acquireObservationLock('thread', 't-1', {
				ttlMs: 60_000,
				holderId: 'A',
			});

			expect(handle).not.toBeNull();
			expect(handle?.holderId).toBe('A');
			expect(insertQueryBuilder.orIgnore).toHaveBeenCalled();
			expect(observationLockRepository.save).not.toHaveBeenCalled();
		});

		it('attempts a conditional write before reading the lock row', async () => {
			mockLockWrite({ updateAffected: 1 });

			const handle = await memory.acquireObservationLock('thread', 't-1', {
				ttlMs: 60_000,
				holderId: 'A',
			});

			expect(handle).not.toBeNull();
			expect(observationLockRepository.findOneBy).not.toHaveBeenCalled();
		});

		it('refuses a different holder while the lock is live', async () => {
			mockLockWrite({ updateAffected: 0 });

			const handle = await memory.acquireObservationLock('thread', 't-1', {
				ttlMs: 60_000,
				holderId: 'B',
			});
			expect(handle).toBeNull();
			expect(observationLockRepository.save).not.toHaveBeenCalled();
		});

		it('reclaims the lock for a new holder once the prior one has expired', async () => {
			const { updateQueryBuilder } = mockLockWrite({ updateAffected: 1 });

			const handle = await memory.acquireObservationLock('thread', 't-1', {
				ttlMs: 60_000,
				holderId: 'B',
			});
			expect(handle).not.toBeNull();
			expect(handle?.holderId).toBe('B');
			expect(updateQueryBuilder.andWhere).toHaveBeenCalledWith(
				'("holderId" = :holderId OR "heldUntil" <= :now)',
			);
			expect(observationLockRepository.save).not.toHaveBeenCalled();
		});

		it('lets the same holder refresh the TTL while still held', async () => {
			mockLockWrite({ updateAffected: 1 });

			const handle = await memory.acquireObservationLock('thread', 't-1', {
				ttlMs: 60_000,
				holderId: 'A',
			});
			expect(handle).not.toBeNull();
			expect(observationLockRepository.save).not.toHaveBeenCalled();
		});

		it('release deletes only the matching holder', async () => {
			await memory.releaseObservationLock({
				scopeKind: 'resource',
				scopeId: 't-1',
				holderId: 'A',
				heldUntil: new Date(),
			});
			expect(observationLockRepository.delete).toHaveBeenCalledWith({
				scopeKind: 'resource',
				scopeId: 't-1',
				holderId: 'A',
			});
		});
	});
});
