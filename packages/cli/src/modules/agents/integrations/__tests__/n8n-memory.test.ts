import type { NewObservationLogEntry } from '@n8n/agents';
import { Equal, In, IsNull, LessThan, Like, MoreThan } from '@n8n/typeorm';
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

const estimateObservationTokens = (text: string) => Math.ceil(text.length / 4);

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
	let observationRunInTransaction: jest.Mock;
	let transactionObservationCreate: jest.Mock;
	let transactionObservationSave: jest.Mock;
	let transactionObservationUpdate: jest.Mock;

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

		transactionObservationCreate = jest.fn((input) => ({ ...input }) as AgentObservationEntity);
		transactionObservationSave = jest.fn(async (input: AgentObservationEntity[]) =>
			input.map((entity, index) => ({
				...entity,
				id: `merged-${index + 1}`,
				createdAt: entity.createdAt ?? new Date('2026-05-12T10:00:00Z'),
				updatedAt: entity.updatedAt ?? new Date('2026-05-12T10:00:00Z'),
			})),
		);
		transactionObservationUpdate = jest.fn().mockResolvedValue({ affected: 1, raw: {} });
		observationRunInTransaction = jest.fn(
			async (callback: (trx: { getRepository: jest.Mock }) => Promise<unknown>) =>
				await callback({
					getRepository: jest.fn().mockReturnValue({
						create: transactionObservationCreate,
						save: transactionObservationSave,
						update: transactionObservationUpdate,
					}),
				}),
		);
		Object.defineProperty(observationRepository, 'manager', {
			value: { transaction: observationRunInTransaction },
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

	// ── Observation log ──────────────────────────────────────────────────

	function makeNewObservationLogEntry(
		overrides: Partial<NewObservationLogEntry> = {},
	): NewObservationLogEntry {
		return {
			scopeKind: 'resource',
			scopeId: 't-1',
			marker: 'important',
			text: 'hello',
			createdAt: new Date('2026-05-05T00:00:00Z'),
			...overrides,
		};
	}

	describe('appendObservationLogEntries', () => {
		beforeEach(() => {
			observationRepository.create.mockImplementation(
				(input) => ({ ...input }) as AgentObservationEntity,
			);
		});

		it('returns [] for an empty input without touching the repo', async () => {
			const result = await memory.appendObservationLogEntries([]);
			expect(result).toEqual([]);
			expect(observationRepository.create).not.toHaveBeenCalled();
			expect(observationRepository.save).not.toHaveBeenCalled();
		});

		it('persists active marker rows with a default token count', async () => {
			(observationRepository.save as unknown as jest.Mock).mockImplementation(
				async (input: AgentObservationEntity | AgentObservationEntity[]) =>
					(Array.isArray(input) ? input : [input]).map((e, i) => ({
						...e,
						id: `obs-${i + 1}`,
						createdAt: e.createdAt ?? new Date('2026-05-05T00:00:00Z'),
						updatedAt: e.updatedAt ?? new Date('2026-05-05T00:00:00Z'),
					})),
			);

			const result = await memory.appendObservationLogEntries([
				makeNewObservationLogEntry(),
				makeNewObservationLogEntry({ marker: 'critical', text: 'remember this' }),
			]);

			expect(observationRepository.create).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					marker: 'important',
					text: 'hello',
					parentId: null,
					tokenCount: estimateObservationTokens('hello'),
					status: 'active',
					supersededBy: null,
				}),
			);
			expect(result.map((r) => r.id)).toEqual(['obs-1', 'obs-2']);
		});
	});

	describe('getObservationLog', () => {
		beforeEach(() => {
			observationRepository.find.mockResolvedValue([]);
		});

		it('passes filters through to find()', async () => {
			await memory.getObservationLog({
				scopeKind: 'resource',
				scopeId: 't-1',
				status: 'active',
				parentId: null,
				limit: 10,
				order: 'desc',
			});

			expect(observationRepository.find).toHaveBeenCalledWith({
				where: [
					{
						scopeKind: 'resource',
						scopeId: 't-1',
						status: 'active',
						parentId: IsNull(),
					},
				],
				order: { createdAt: 'DESC', id: 'DESC' },
				take: 10,
			});
		});

		it('active read filters out non-active rows', async () => {
			await memory.getActiveObservationLog({ scopeKind: 'resource', scopeId: 't-1' });

			expect(observationRepository.find).toHaveBeenCalledWith({
				where: [{ scopeKind: 'resource', scopeId: 't-1', status: 'active' }],
				order: { createdAt: 'ASC', id: 'ASC' },
			});
		});

		it('maps persisted rows to observation log entries', async () => {
			observationRepository.find.mockResolvedValue([
				{
					id: 'obs-1',
					scopeKind: 'resource',
					scopeId: 't-1',
					marker: 'important',
					text: 'hi',
					parentId: null,
					tokenCount: '7' as unknown as number,
					status: 'active',
					supersededBy: null,
					createdAt: new Date('2026-05-05T00:00:00Z'),
					updatedAt: new Date('2026-05-05T00:00:00Z'),
				} as AgentObservationEntity,
			]);

			const [row] = await memory.getObservationLog({ scopeKind: 'resource', scopeId: 't-1' });
			expect(row).toMatchObject({
				id: 'obs-1',
				marker: 'important',
				text: 'hi',
				tokenCount: 7,
				status: 'active',
			});
		});
	});

	describe('observation log status updates', () => {
		it('marks rows as dropped instead of deleting them', async () => {
			await memory.dropObservationLogEntries(['a', 'b']);

			expect(observationRepository.update).toHaveBeenCalledWith(
				{ id: In(['a', 'b']) },
				{ status: 'dropped', supersededBy: null },
			);
		});

		it('marks rows as superseded by a replacement row', async () => {
			await memory.supersedeObservationLogEntries(['a', 'b'], 'replacement');

			expect(observationRepository.update).toHaveBeenCalledWith(
				{ id: In(['a', 'b']) },
				{ status: 'superseded', supersededBy: 'replacement' },
			);
		});

		it('no-ops on empty update inputs', async () => {
			await memory.dropObservationLogEntries([]);
			await memory.supersedeObservationLogEntries([], 'replacement');
			expect(observationRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('applyObservationLogReflection', () => {
		it('inserts merged replacements and updates old rows in one transaction', async () => {
			const result = await memory.applyObservationLogReflection(
				{ scopeKind: 'thread', scopeId: 't-1' },
				{
					drop: ['drop-1'],
					merge: [
						{
							supersedes: ['old-1', 'old-2'],
							marker: 'important',
							text: 'Merged observation',
						},
					],
				},
			);

			expect(observationRunInTransaction).toHaveBeenCalledWith(expect.any(Function));
			expect(transactionObservationCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					scopeKind: 'thread',
					scopeId: 't-1',
					marker: 'important',
					text: 'Merged observation',
					parentId: null,
					tokenCount: estimateObservationTokens('Merged observation'),
					status: 'active',
					supersededBy: null,
				}),
			);
			expect(transactionObservationUpdate).toHaveBeenNthCalledWith(
				1,
				{ scopeKind: 'thread', scopeId: 't-1', id: In(['drop-1']) },
				{ status: 'dropped', supersededBy: null },
			);
			expect(transactionObservationUpdate).toHaveBeenNthCalledWith(
				2,
				{ scopeKind: 'thread', scopeId: 't-1', id: In(['old-1', 'old-2']) },
				{ status: 'superseded', supersededBy: 'merged-1' },
			);
			expect(result).toMatchObject({
				droppedIds: ['drop-1'],
				supersededIds: ['old-1', 'old-2'],
				inserted: [{ id: 'merged-1', status: 'active' }],
			});
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
					taskKind: 'observer',
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

		it('stores the task kind for scoped observation-log task locks', async () => {
			const { updateQueryBuilder } = mockLockWrite({ updateAffected: 1 });

			const handle = await memory.acquireObservationLogTaskLock('thread', 't-1', 'reflector', {
				ttlMs: 60_000,
				holderId: 'A',
			});

			expect(handle).toMatchObject({ taskKind: 'reflector', holderId: 'A' });
			expect(updateQueryBuilder.set).toHaveBeenCalledWith(
				expect.objectContaining({ taskKind: 'reflector', holderId: 'A' }),
			);
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
			expect(updateQueryBuilder.set).toHaveBeenCalledWith(
				expect.objectContaining({ taskKind: 'observer', holderId: 'B' }),
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
				taskKind: 'observer',
				holderId: 'A',
			});
		});

		it('releases observation-log task locks by scope and holder', async () => {
			await memory.releaseObservationLogTaskLock({
				scopeKind: 'resource',
				scopeId: 't-1',
				taskKind: 'reflector',
				holderId: 'A',
				heldUntil: new Date(),
			});
			expect(observationLockRepository.delete).toHaveBeenCalledWith({
				scopeKind: 'resource',
				scopeId: 't-1',
				taskKind: 'reflector',
				holderId: 'A',
			});
		});
	});
});
