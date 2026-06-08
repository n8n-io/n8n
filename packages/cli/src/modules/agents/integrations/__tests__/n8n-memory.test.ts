import { hashEpisodicMemoryEvidence, type NewObservationLogEntry } from '@n8n/agents';
import { Equal, In, IsNull, LessThan, Like, MoreThan } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { AgentMemoryEntryCursorEntity } from '../../entities/agent-memory-entry-cursor.entity';
import { AgentMemoryEntryEntity } from '../../entities/agent-memory-entry.entity';
import type { AgentMemoryEntryLockEntity } from '../../entities/agent-memory-entry-lock.entity';
import { AgentMemoryEntrySourceEntity } from '../../entities/agent-memory-entry-source.entity';
import type { AgentMessageEntity } from '../../entities/agent-message.entity';
import { AgentObservationCursorEntity } from '../../entities/agent-observation-cursor.entity';
import { AgentObservationLockEntity } from '../../entities/agent-observation-lock.entity';
import { AgentObservationEntity } from '../../entities/agent-observation.entity';
import { AgentThreadEntity } from '../../entities/agent-thread.entity';
import type { AgentMessageRepository } from '../../repositories/agent-message.repository';
import type { AgentMemoryEntryCursorRepository } from '../../repositories/agent-memory-entry-cursor.repository';
import type { AgentMemoryEntryLockRepository } from '../../repositories/agent-memory-entry-lock.repository';
import type { AgentMemoryEntrySourceRepository } from '../../repositories/agent-memory-entry-source.repository';
import type { AgentMemoryEntryRepository } from '../../repositories/agent-memory-entry.repository';
import type { AgentObservationCursorRepository } from '../../repositories/agent-observation-cursor.repository';
import type { AgentObservationLockRepository } from '../../repositories/agent-observation-lock.repository';
import type { AgentObservationRepository } from '../../repositories/agent-observation.repository';
import type { AgentResourceRepository } from '../../repositories/agent-resource.repository';
import type { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import { N8nMemory } from '../n8n-memory';

const estimateObservationTokens = (text: string) => Math.ceil(text.length / 4);
type N8nMemoryImplementation = ReturnType<N8nMemory['getImplementation']>;

describe('N8nMemory', () => {
	let memory: N8nMemoryImplementation;
	let memoryService: N8nMemory;
	let messageRepository: jest.Mocked<AgentMessageRepository>;
	let threadRepository: jest.Mocked<AgentThreadRepository>;
	let resourceRepository: jest.Mocked<AgentResourceRepository>;
	let observationRepository: jest.Mocked<AgentObservationRepository>;
	let observationCursorRepository: jest.Mocked<AgentObservationCursorRepository>;
	let observationLockRepository: jest.Mocked<AgentObservationLockRepository>;
	let memoryEntryRepository: jest.Mocked<AgentMemoryEntryRepository>;
	let memoryEntryLockRepository: jest.Mocked<AgentMemoryEntryLockRepository>;
	let memoryEntrySourceRepository: jest.Mocked<AgentMemoryEntrySourceRepository>;
	let memoryEntryCursorRepository: jest.Mocked<AgentMemoryEntryCursorRepository>;
	let runInTransaction: jest.Mock;
	let transactionDelete: jest.Mock;
	let observationRunInTransaction: jest.Mock;
	let transactionObservationCreate: jest.Mock;
	let transactionObservationFind: jest.Mock;
	let transactionObservationSave: jest.Mock;
	let transactionObservationUpdate: jest.Mock;
	let memoryEntryRunInTransaction: jest.Mock;
	let transactionMemoryEntryCreate: jest.Mock;
	let transactionMemoryEntryFind: jest.Mock;
	let transactionMemoryEntryFindOneBy: jest.Mock;
	let transactionMemoryEntrySave: jest.Mock;
	let transactionMemoryEntryUpdate: jest.Mock;
	let transactionMemoryEntrySourceCreate: jest.Mock;
	let transactionMemoryEntrySourceFind: jest.Mock;
	let transactionMemoryEntrySourceFindOneBy: jest.Mock;
	let transactionMemoryEntrySourceSave: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();

		messageRepository = mock<AgentMessageRepository>();
		threadRepository = mock<AgentThreadRepository>();
		resourceRepository = mock<AgentResourceRepository>();
		observationRepository = mock<AgentObservationRepository>();
		observationCursorRepository = mock<AgentObservationCursorRepository>();
		observationLockRepository = mock<AgentObservationLockRepository>();
		memoryEntryRepository = mock<AgentMemoryEntryRepository>();
		memoryEntryLockRepository = mock<AgentMemoryEntryLockRepository>();
		memoryEntrySourceRepository = mock<AgentMemoryEntrySourceRepository>();
		memoryEntryCursorRepository = mock<AgentMemoryEntryCursorRepository>();
		resourceRepository.existsBy.mockResolvedValue(true);
		transactionDelete = jest.fn().mockResolvedValue({ affected: 1, raw: {} });
		transactionObservationCreate = jest.fn((input) => ({ ...input }) as AgentObservationEntity);
		transactionObservationFind = jest.fn().mockResolvedValue([]);
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
						find: transactionObservationFind,
						save: transactionObservationSave,
						update: transactionObservationUpdate,
					}),
				}),
		);
		Object.defineProperty(observationRepository, 'manager', {
			value: { transaction: observationRunInTransaction },
		});

		transactionMemoryEntryCreate = jest.fn((input) => ({ ...input }) as AgentMemoryEntryEntity);
		transactionMemoryEntryFind = jest.fn().mockResolvedValue([]);
		transactionMemoryEntryFindOneBy = jest.fn().mockResolvedValue(null);
		transactionMemoryEntrySave = jest.fn(async (input: AgentMemoryEntryEntity[]) =>
			input.map((entity, index) => ({
				...entity,
				id: `merged-memory-${index + 1}`,
				createdAt: entity.createdAt ?? new Date('2026-05-12T10:00:00Z'),
				updatedAt: entity.updatedAt ?? new Date('2026-05-12T10:00:00Z'),
			})),
		);
		transactionMemoryEntryUpdate = jest.fn().mockResolvedValue({ affected: 1, raw: {} });
		transactionMemoryEntrySourceCreate = jest.fn(
			(input) => ({ ...input }) as AgentMemoryEntrySourceEntity,
		);
		transactionMemoryEntrySourceFind = jest.fn().mockResolvedValue([]);
		transactionMemoryEntrySourceFindOneBy = jest.fn().mockResolvedValue(null);
		transactionMemoryEntrySourceSave = jest.fn(async (input: AgentMemoryEntrySourceEntity[]) =>
			input.map((entity, index) => ({
				...entity,
				id: `merged-source-${index + 1}`,
				createdAt: entity.createdAt ?? new Date('2026-05-12T10:00:00Z'),
				updatedAt: entity.updatedAt ?? new Date('2026-05-12T10:00:00Z'),
			})),
		);
		runInTransaction = jest.fn(
			async (
				callback: (trx: {
					delete: typeof transactionDelete;
					getRepository: jest.Mock;
				}) => Promise<void>,
			) => {
				await callback({
					delete: transactionDelete,
					getRepository: jest.fn((entity) => {
						if (entity === AgentMemoryEntryEntity) {
							return { update: transactionMemoryEntryUpdate };
						}
						return { find: transactionMemoryEntrySourceFind };
					}),
				});
			},
		);
		Object.defineProperty(threadRepository, 'manager', {
			value: { transaction: runInTransaction },
		});
		memoryEntryRunInTransaction = jest.fn(
			async (callback: (trx: { getRepository: jest.Mock }) => Promise<unknown>) =>
				await callback({
					getRepository: jest.fn((entity) => {
						if (entity === AgentMemoryEntryEntity) {
							return {
								create: transactionMemoryEntryCreate,
								find: transactionMemoryEntryFind,
								findOneBy: transactionMemoryEntryFindOneBy,
								save: transactionMemoryEntrySave,
								update: transactionMemoryEntryUpdate,
							};
						}
						return {
							create: transactionMemoryEntrySourceCreate,
							find: transactionMemoryEntrySourceFind,
							findOneBy: transactionMemoryEntrySourceFindOneBy,
							save: transactionMemoryEntrySourceSave,
						};
					}),
				}),
		);
		Object.defineProperty(memoryEntryRepository, 'manager', {
			value: { transaction: memoryEntryRunInTransaction },
		});

		memoryService = new N8nMemory(
			threadRepository,
			messageRepository,
			resourceRepository,
			observationRepository,
			observationCursorRepository,
			observationLockRepository,
			memoryEntryRepository,
			memoryEntryLockRepository,
			memoryEntrySourceRepository,
			memoryEntryCursorRepository,
		);
		memory = memoryService.getImplementation('agent-1');
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

	describe('getMessages — persisted JSON hydration', () => {
		it('returns createdAt as a Date when the content JSON stores it as an ISO string', async () => {
			const createdAt = new Date('2026-01-01T00:00:02.000Z');
			const entity = makeMessageEntity('m2', createdAt, 'middle');
			entity.content = {
				...entity.content,
				createdAt: createdAt.toISOString(),
			};
			messageRepository.find.mockResolvedValue([entity]);

			const [result] = await memory.getMessages('thread-1');

			expect(result.createdAt).toBeInstanceOf(Date);
			expect(result.createdAt.toISOString()).toBe(createdAt.toISOString());
		});
	});

	describe('getMessagesForObservationScope', () => {
		it('queries source messages by observation scope id', async () => {
			const createdAt = new Date('2026-01-01T00:00:02.000Z');
			messageRepository.find.mockResolvedValue([makeMessageEntity('m2', createdAt, 'middle')]);

			const result = await memory.getMessagesForObservationScope('thread-1');

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: [{ threadId: 'thread-1' }],
					order: { createdAt: 'ASC', id: 'ASC' },
				}),
			);
			expect(result.map((m) => m.id)).toEqual(['m2']);
		});

		it('does not filter source messages by resourceId', async () => {
			messageRepository.find.mockResolvedValue([]);

			await memory.getMessagesForObservationScope('thread-1');

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: [{ threadId: 'thread-1' }],
				}),
			);
		});

		it('applies the cursor keyset for observation scopes', async () => {
			const sinceCreatedAt = new Date('2026-01-01T00:00:01.000Z');
			messageRepository.find.mockResolvedValue([]);

			await memory.getMessagesForObservationScope('thread-1', {
				since: { sinceCreatedAt, sinceMessageId: 'm1' },
			});

			expect(messageRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: [
						{ threadId: 'thread-1', createdAt: MoreThan(sinceCreatedAt) },
						{
							threadId: 'thread-1',
							createdAt: Equal(sinceCreatedAt),
							id: MoreThan('m1'),
						},
					],
				}),
			);
		});

		it('returns createdAt as a Date when the content JSON stores it as an ISO string', async () => {
			const createdAt = new Date('2026-01-01T00:00:02.000Z');
			const entity = makeMessageEntity('m2', createdAt, 'middle');
			entity.content = {
				...entity.content,
				createdAt: createdAt.toISOString(),
			};
			messageRepository.find.mockResolvedValue([entity]);

			const [result] = await memory.getMessagesForObservationScope('thread-1');

			expect(result.createdAt).toBeInstanceOf(Date);
			expect(result.createdAt.toISOString()).toBe(createdAt.toISOString());
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

		it('merges metadata updates instead of replacing existing thread metadata', async () => {
			const currentMessageContext = {
				integrationConnectionId: 'slack:cred-1',
				platform: 'slack',
				target: { type: 'thread', threadId: 'thread-1' },
				updatedAt: '2026-05-18T10:00:00.000Z',
			};
			const existing = {
				id: 'thread-1',
				resourceId: 'original-user',
				title: null,
				metadata: JSON.stringify({ currentMessageContext }),
			} as unknown as AgentThreadEntity;
			threadRepository.findOneBy.mockResolvedValue(existing);
			threadRepository.save.mockImplementation(async (e) => e as AgentThreadEntity);
			resourceRepository.existsBy.mockResolvedValue(true);

			await memory.saveThread({
				id: 'thread-1',
				resourceId: 'different-user',
				title: undefined,
				metadata: { summary: 'Support thread' },
			});

			expect(threadRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({ metadata: expect.any(String) }),
			);
			const savedThread = threadRepository.save.mock.calls[0][0] as AgentThreadEntity;
			expect(JSON.parse(savedThread.metadata ?? '{}')).toEqual({
				currentMessageContext,
				summary: 'Support thread',
			});
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

			const observationScope = { agentId: 'agent-1', observationScopeId: 'thread-1' };
			expect(runInTransaction).toHaveBeenCalledWith(expect.any(Function));
			expect(transactionDelete).toHaveBeenNthCalledWith(
				1,
				AgentObservationEntity,
				observationScope,
			);
			expect(transactionDelete).toHaveBeenNthCalledWith(
				2,
				AgentObservationCursorEntity,
				observationScope,
			);
			expect(transactionDelete).toHaveBeenNthCalledWith(
				3,
				AgentObservationLockEntity,
				observationScope,
			);
			expect(transactionDelete).toHaveBeenNthCalledWith(
				4,
				AgentMemoryEntryCursorEntity,
				observationScope,
			);
			expect(transactionDelete).toHaveBeenNthCalledWith(5, AgentThreadEntity, { id: 'thread-1' });
			expect(observationRepository.delete).not.toHaveBeenCalled();
			expect(observationCursorRepository.delete).not.toHaveBeenCalled();
			expect(observationLockRepository.delete).not.toHaveBeenCalled();
			expect(threadRepository.delete).not.toHaveBeenCalled();
		});

		it('drops active episodic entries that lose their last source when deleting a thread', async () => {
			transactionMemoryEntrySourceFind
				.mockResolvedValueOnce([
					makeMemoryEntrySourceEntity({
						memoryEntryId: 'orphaned-memory',
						threadId: 'thread-1',
					}),
					makeMemoryEntrySourceEntity({
						memoryEntryId: 'shared-memory',
						threadId: 'thread-1',
					}),
				])
				.mockResolvedValueOnce([
					makeMemoryEntrySourceEntity({
						memoryEntryId: 'shared-memory',
						threadId: 'thread-2',
					}),
				]);

			await memory.deleteThread('thread-1');

			expect(transactionMemoryEntrySourceFind).toHaveBeenNthCalledWith(1, {
				select: { memoryEntryId: true },
				where: { agentId: 'agent-1', threadId: 'thread-1' },
			});
			expect(transactionDelete).toHaveBeenCalledWith(AgentMemoryEntrySourceEntity, {
				threadId: 'thread-1',
				agentId: 'agent-1',
			});
			expect(transactionMemoryEntrySourceFind).toHaveBeenNthCalledWith(2, {
				select: { memoryEntryId: true },
				where: { agentId: 'agent-1', memoryEntryId: In(['orphaned-memory', 'shared-memory']) },
			});
			expect(transactionMemoryEntryUpdate).toHaveBeenCalledWith(
				{ agentId: 'agent-1', id: In(['orphaned-memory']), status: 'active' },
				{ status: 'dropped', supersededBy: null },
			);
		});

		it('does not clean up episodic source rows owned by another agent', async () => {
			transactionMemoryEntrySourceFind.mockResolvedValueOnce([]);

			await memory.deleteThread('thread-1');

			expect(transactionMemoryEntrySourceFind).toHaveBeenCalledWith({
				select: { memoryEntryId: true },
				where: { agentId: 'agent-1', threadId: 'thread-1' },
			});
			expect(transactionDelete).not.toHaveBeenCalledWith(
				AgentMemoryEntrySourceEntity,
				expect.objectContaining({ threadId: 'thread-1' }),
			);
			expect(transactionMemoryEntryUpdate).not.toHaveBeenCalledWith(
				expect.objectContaining({ id: In(['other-agent-memory']) }),
				expect.anything(),
			);
		});

		it('deletes thread-scoped observation state by thread id prefix in one transaction', async () => {
			await memory.deleteThreadsByPrefix('test-agent-1');

			const observationScope = {
				agentId: 'agent-1',
				observationScopeId: Like('test-agent-1%'),
			};
			expect(runInTransaction).toHaveBeenCalledWith(expect.any(Function));
			expect(transactionDelete).toHaveBeenNthCalledWith(
				1,
				AgentObservationEntity,
				observationScope,
			);
			expect(transactionDelete).toHaveBeenNthCalledWith(
				2,
				AgentObservationCursorEntity,
				observationScope,
			);
			expect(transactionDelete).toHaveBeenNthCalledWith(
				3,
				AgentObservationLockEntity,
				observationScope,
			);
			expect(transactionDelete).toHaveBeenNthCalledWith(
				4,
				AgentMemoryEntryCursorEntity,
				observationScope,
			);
			expect(transactionDelete).toHaveBeenNthCalledWith(5, AgentThreadEntity, {
				id: Like('test-agent-1%'),
			});
			expect(observationRepository.delete).not.toHaveBeenCalled();
			expect(observationCursorRepository.delete).not.toHaveBeenCalled();
			expect(observationLockRepository.delete).not.toHaveBeenCalled();
			expect(threadRepository.delete).not.toHaveBeenCalled();
		});

		it('drops source-less episodic entries when deleting threads by prefix', async () => {
			transactionMemoryEntrySourceFind
				.mockResolvedValueOnce([
					makeMemoryEntrySourceEntity({
						memoryEntryId: 'prefix-orphaned-memory',
						threadId: 'test-agent-1:run-1',
					}),
				])
				.mockResolvedValueOnce([]);

			await memory.deleteThreadsByPrefix('test-agent-1');

			const threadId = Like('test-agent-1%');
			expect(transactionMemoryEntrySourceFind).toHaveBeenNthCalledWith(1, {
				select: { memoryEntryId: true },
				where: { agentId: 'agent-1', threadId },
			});
			expect(transactionDelete).toHaveBeenCalledWith(AgentMemoryEntrySourceEntity, {
				threadId,
				agentId: 'agent-1',
			});
			expect(transactionMemoryEntryUpdate).toHaveBeenCalledWith(
				{ agentId: 'agent-1', id: In(['prefix-orphaned-memory']), status: 'active' },
				{ status: 'dropped', supersededBy: null },
			);
		});
	});

	// ── Observation log ──────────────────────────────────────────────────

	function makeNewObservationLogEntry(
		overrides: Partial<NewObservationLogEntry> = {},
	): NewObservationLogEntry {
		return {
			observationScopeId: 't-1',
			marker: 'important',
			text: 'hello',
			createdAt: new Date('2026-05-05T00:00:00Z'),
			...overrides,
		};
	}

	function makeObservationEntity(
		overrides: Partial<AgentObservationEntity> = {},
	): AgentObservationEntity {
		return {
			id: 'obs-1',
			agentId: 'agent-1',
			observationScopeId: 't-1',
			marker: 'important',
			text: 'Observation',
			parentId: null,
			tokenCount: 1,
			status: 'active',
			supersededBy: null,
			createdAt: new Date('2026-05-05T00:00:00Z'),
			updatedAt: new Date('2026-05-05T00:00:00Z'),
			...overrides,
		} as AgentObservationEntity;
	}

	function makeMemoryEntryEntity(
		overrides: Partial<AgentMemoryEntryEntity> = {},
	): AgentMemoryEntryEntity {
		const createdAt = new Date('2026-05-05T00:00:00Z');
		return {
			id: 'memory-1',
			agentId: 'agent-1',
			resourceId: 'resource-1',
			content: 'User chose Postgres for the memory store.',
			contentHash: 'hash-1',
			status: 'active',
			supersededBy: null,
			embeddingModel: 'openai/text-embedding-3-small',
			embedding: [1, 0],
			metadata: null,
			lastSeenAt: createdAt,
			createdAt,
			updatedAt: createdAt,
			...overrides,
		} as AgentMemoryEntryEntity;
	}

	function makeMemoryEntrySourceEntity(
		overrides: Partial<AgentMemoryEntrySourceEntity> = {},
	): AgentMemoryEntrySourceEntity {
		const createdAt = new Date('2026-05-05T00:00:00Z');
		const evidenceText = overrides.evidenceText ?? 'User chose Postgres';
		return {
			id: 'source-1',
			agentId: 'agent-1',
			memoryEntryId: 'memory-1',
			observationId: 'obs-1',
			threadId: 'thread-1',
			evidenceHash: hashEpisodicMemoryEvidence(evidenceText),
			evidenceText,
			createdAt,
			updatedAt: createdAt,
			...overrides,
		} as AgentMemoryEntrySourceEntity;
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
				observationScopeId: 't-1',
				status: 'active',
				parentId: null,
				limit: 10,
				order: 'desc',
			});

			expect(observationRepository.find).toHaveBeenCalledWith({
				where: [
					{
						agentId: 'agent-1',
						observationScopeId: 't-1',
						status: 'active',
						parentId: IsNull(),
					},
				],
				order: { createdAt: 'DESC', id: 'DESC' },
				take: 10,
			});
		});

		it('active read filters out non-active rows', async () => {
			await memory.getActiveObservationLog({ observationScopeId: 't-1' });

			expect(observationRepository.find).toHaveBeenCalledWith({
				where: [{ agentId: 'agent-1', observationScopeId: 't-1', status: 'active' }],
				order: { createdAt: 'ASC', id: 'ASC' },
			});
		});

		it('maps persisted rows to observation log entries', async () => {
			observationRepository.find.mockResolvedValue([
				{
					id: 'obs-1',
					agentId: 'agent-1',
					observationScopeId: 't-1',
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

			const [row] = await memory.getObservationLog({ observationScopeId: 't-1' });
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
			transactionObservationFind.mockResolvedValue([
				makeObservationEntity({ id: 'drop-1', marker: 'info', text: 'Drop me' }),
				makeObservationEntity({ id: 'old-1', text: 'Old one' }),
				makeObservationEntity({ id: 'old-2', text: 'Old two' }),
			]);

			const result = await memory.applyObservationLogReflection(
				{ observationScopeId: 't-1' },
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
			expect(transactionObservationFind).toHaveBeenCalledWith({
				where: { agentId: 'agent-1', observationScopeId: 't-1', status: 'active' },
				order: { createdAt: 'ASC', id: 'ASC' },
			});
			expect(transactionObservationCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					observationScopeId: 't-1',
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
				{ agentId: 'agent-1', observationScopeId: 't-1', id: In(['drop-1']) },
				{ status: 'dropped', supersededBy: null },
			);
			expect(transactionObservationUpdate).toHaveBeenNthCalledWith(
				2,
				{ agentId: 'agent-1', observationScopeId: 't-1', id: In(['old-1', 'old-2']) },
				{ status: 'superseded', supersededBy: 'merged-1' },
			);
			expect(result).toMatchObject({
				droppedIds: ['drop-1'],
				supersededIds: ['old-1', 'old-2'],
				inserted: [{ id: 'merged-1', status: 'active' }],
			});
		});

		it('expands parent merges to active children inside the transaction', async () => {
			transactionObservationFind.mockResolvedValue([
				makeObservationEntity({ id: 'parent', text: 'Open case' }),
				makeObservationEntity({
					id: 'child',
					marker: 'completion',
					text: 'Case closed',
					parentId: 'parent',
				}),
			]);

			const result = await memory.applyObservationLogReflection(
				{ observationScopeId: 't-1' },
				{
					drop: ['child'],
					merge: [{ supersedes: ['parent'], marker: 'important', text: 'Case resolved' }],
				},
			);

			expect(transactionObservationUpdate).toHaveBeenCalledTimes(1);
			expect(transactionObservationUpdate).toHaveBeenCalledWith(
				{ agentId: 'agent-1', observationScopeId: 't-1', id: In(['parent', 'child']) },
				{ status: 'superseded', supersededBy: 'merged-1' },
			);
			expect(result).toMatchObject({
				droppedIds: [],
				supersededIds: ['parent', 'child'],
			});
		});
	});

	describe('cursors', () => {
		it('returns null when no cursor row exists', async () => {
			observationCursorRepository.findOneBy.mockResolvedValue(null);
			expect(await memory.getCursor('t-1')).toBeNull();
		});

		it('reads lastObservedAt and lastObservedMessageId', async () => {
			const lastObservedAt = new Date('2026-05-05T00:00:00.250Z');
			observationCursorRepository.findOneBy.mockResolvedValue({
				agentId: 'agent-1',
				observationScopeId: 't-1',
				lastObservedMessageId: 'm-7',
				lastObservedAt,
				createdAt: new Date(),
				updatedAt: new Date('2026-05-05T00:00:00Z'),
			} as AgentObservationCursorEntity);

			const cursor = await memory.getCursor('t-1');
			expect(cursor?.lastObservedAt.getTime()).toBe(lastObservedAt.getTime());
			expect(cursor?.lastObservedMessageId).toBe('m-7');
		});

		it('upserts on setCursor with cursor-advance fields keyed by agent and observation scope', async () => {
			const lastObservedAt = new Date('2026-05-05T00:00:00.500Z');
			await memory.setCursor({
				observationScopeId: 't-1',
				lastObservedMessageId: 'm-9',
				lastObservedAt,
				updatedAt: new Date('2026-05-05T00:00:00Z'),
			});

			expect(observationCursorRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					observationScopeId: 't-1',
					lastObservedMessageId: 'm-9',
					lastObservedAt,
				}),
				expect.objectContaining({ conflictPaths: ['agentId', 'observationScopeId'] }),
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
					agentId: 'agent-1',
					observationScopeId: 't-1',
					taskKind: 'observer',
					holderId: 'A',
					heldUntil: new Date(Date.now() + 60_000),
				} as AgentObservationLockEntity,
			});

			const handle = await memory.acquireObservationLogTaskLock('t-1', 'observer', {
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

			const handle = await memory.acquireObservationLogTaskLock('t-1', 'observer', {
				ttlMs: 60_000,
				holderId: 'A',
			});

			expect(handle).not.toBeNull();
			expect(observationLockRepository.findOneBy).not.toHaveBeenCalled();
		});

		it('stores the task kind for scoped observation-log task locks', async () => {
			const { updateQueryBuilder } = mockLockWrite({ updateAffected: 1 });

			const handle = await memory.acquireObservationLogTaskLock('t-1', 'reflector', {
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

			const handle = await memory.acquireObservationLogTaskLock('t-1', 'observer', {
				ttlMs: 60_000,
				holderId: 'B',
			});
			expect(handle).toBeNull();
			expect(observationLockRepository.save).not.toHaveBeenCalled();
		});

		it('reclaims the lock for a new holder once the prior one has expired', async () => {
			const { updateQueryBuilder } = mockLockWrite({ updateAffected: 1 });

			const handle = await memory.acquireObservationLogTaskLock('t-1', 'observer', {
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

			const handle = await memory.acquireObservationLogTaskLock('t-1', 'observer', {
				ttlMs: 60_000,
				holderId: 'A',
			});
			expect(handle).not.toBeNull();
			expect(observationLockRepository.save).not.toHaveBeenCalled();
		});

		it('release deletes only the matching holder', async () => {
			await memory.releaseObservationLogTaskLock({
				observationScopeId: 't-1',
				taskKind: 'observer',
				holderId: 'A',
				heldUntil: new Date(),
			});
			expect(observationLockRepository.delete).toHaveBeenCalledWith({
				agentId: 'agent-1',
				observationScopeId: 't-1',
				taskKind: 'observer',
				holderId: 'A',
			});
		});

		it('releases observation-log task locks by scope and holder', async () => {
			await memory.releaseObservationLogTaskLock({
				observationScopeId: 't-1',
				taskKind: 'reflector',
				holderId: 'A',
				heldUntil: new Date(),
			});
			expect(observationLockRepository.delete).toHaveBeenCalledWith({
				agentId: 'agent-1',
				observationScopeId: 't-1',
				taskKind: 'reflector',
				holderId: 'A',
			});
		});

		const mockEpisodicLockWrite = ({
			updateAffected,
			claimed,
		}: {
			updateAffected: number;
			claimed?: AgentMemoryEntryLockEntity | null;
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

			memoryEntryLockRepository.createQueryBuilder
				.mockReturnValueOnce(updateQueryBuilder as never)
				.mockReturnValueOnce(insertQueryBuilder as never);
			memoryEntryLockRepository.findOneBy.mockResolvedValue(claimed ?? null);

			return { updateQueryBuilder, insertQueryBuilder };
		};

		it('acquires episodic task locks by bound agent and resource', async () => {
			const { insertQueryBuilder } = mockEpisodicLockWrite({
				updateAffected: 0,
				claimed: {
					agentId: 'agent-1',
					resourceId: 'resource-1',
					holderId: 'A',
					heldUntil: new Date(Date.now() + 60_000),
				} as AgentMemoryEntryLockEntity,
			});

			const handle = await memory.episodic.taskLock?.acquire('resource-1', {
				ttlMs: 60_000,
				holderId: 'A',
			});

			expect(handle).toMatchObject({ resourceId: 'resource-1', holderId: 'A' });
			expect(insertQueryBuilder.values).toHaveBeenCalledWith(
				expect.objectContaining({ agentId: 'agent-1', resourceId: 'resource-1', holderId: 'A' }),
			);
			expect(observationLockRepository.createQueryBuilder).not.toHaveBeenCalled();
		});

		it('uses the bound agent id for episodic task lock isolation', async () => {
			const agentTwoMemory = memoryService.getImplementation('agent-2');
			const { updateQueryBuilder } = mockEpisodicLockWrite({ updateAffected: 1 });

			const handle = await agentTwoMemory.episodic.taskLock?.acquire('resource-1', {
				ttlMs: 60_000,
				holderId: 'B',
			});

			expect(handle).toMatchObject({ resourceId: 'resource-1', holderId: 'B' });
			expect(updateQueryBuilder.setParameters).toHaveBeenCalledWith(
				expect.objectContaining({ agentId: 'agent-2', resourceId: 'resource-1' }),
			);
		});

		it('refuses episodic task locks held by another live holder', async () => {
			mockEpisodicLockWrite({ updateAffected: 0 });

			const handle = await memory.episodic.taskLock?.acquire('resource-1', {
				ttlMs: 60_000,
				holderId: 'B',
			});

			expect(handle).toBeNull();
		});

		it('releases episodic task locks by bound agent, resource, and holder', async () => {
			await memory.episodic.taskLock?.release({
				resourceId: 'resource-1',
				holderId: 'A',
				heldUntil: new Date(),
			});

			expect(memoryEntryLockRepository.delete).toHaveBeenCalledWith({
				agentId: 'agent-1',
				resourceId: 'resource-1',
				holderId: 'A',
			});
		});
	});

	describe('episodic memory', () => {
		beforeEach(() => {
			memoryEntryRepository.create.mockImplementation(
				(input) => ({ ...input }) as AgentMemoryEntryEntity,
			);
			memoryEntrySourceRepository.create.mockImplementation(
				(input) => ({ ...input }) as AgentMemoryEntrySourceEntity,
			);
		});

		it('stores active source-backed entries with a content hash', async () => {
			transactionMemoryEntrySave.mockResolvedValueOnce([
				makeMemoryEntryEntity({
					id: 'memory-1',
					content: 'User chose Postgres for the memory store.',
				}),
			]);

			const result = await memory.episodic.saveEntryWithSources(
				{
					resourceId: 'resource-1',
					content: 'User chose Postgres for the memory store.',
					embedding: [1, 0],
					embeddingModel: 'openai/text-embedding-3-small',
				},
				[
					{
						observationId: 'obs-1',
						threadId: 'thread-1',
						evidenceText: 'User chose Postgres',
					},
				],
			);

			expect(transactionMemoryEntryCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					resourceId: 'resource-1',
					status: 'active',
					supersededBy: null,
					contentHash: expect.any(String),
				}),
			);
			expect(transactionMemoryEntrySourceSave).toHaveBeenCalledWith([
				expect.objectContaining({
					agentId: 'agent-1',
					memoryEntryId: 'memory-1',
					observationId: 'obs-1',
					evidenceHash: hashEpisodicMemoryEvidence('User chose Postgres'),
					evidenceText: 'User chose Postgres',
				}),
			]);
			expect(result).toMatchObject({
				id: 'memory-1',
				content: 'User chose Postgres for the memory store.',
				status: 'active',
				embedding: [1, 0],
			});
		});

		it('searches scoped active entries through hybrid ranking', async () => {
			memoryEntryRepository.find.mockResolvedValue([
				makeMemoryEntryEntity({
					id: 'memory-1',
					content: 'User chose Postgres for the memory store.',
					embedding: [1, 0],
				}),
				makeMemoryEntryEntity({
					id: 'memory-2',
					content: 'User investigated a webhook timeout.',
					embedding: [0, 1],
				}),
			]);

			const results = await memory.episodic.searchEntries(
				{ resourceId: 'resource-1' },
				'Postgres memory store',
				{ queryEmbedding: [1, 0], topK: 1 },
			);

			expect(memoryEntryRepository.find).toHaveBeenCalledWith({
				where: {
					agentId: 'agent-1',
					resourceId: 'resource-1',
					status: In(['active']),
				},
			});
			expect(results.map((result) => result.id)).toEqual(['memory-1']);
		});

		it('stores an episodic entry and its sources in one transaction', async () => {
			transactionMemoryEntrySave.mockResolvedValueOnce([
				makeMemoryEntryEntity({
					id: 'memory-atomic',
					content: 'User chose Postgres for durable memory storage.',
				}),
			]);
			transactionMemoryEntrySourceSave.mockResolvedValueOnce([
				makeMemoryEntrySourceEntity({
					id: 'source-atomic',
					memoryEntryId: 'memory-atomic',
					observationId: 'obs-atomic',
					evidenceText: 'User chose Postgres',
				}),
			]);

			const result = await memory.episodic.saveEntryWithSources(
				{
					resourceId: 'resource-1',
					content: 'User chose Postgres for durable memory storage.',
					embedding: [1, 0],
					embeddingModel: 'openai/text-embedding-3-small',
				},
				[
					{
						observationId: 'obs-atomic',
						threadId: 'thread-1',
						evidenceText: 'User chose Postgres',
					},
				],
			);

			expect(memoryEntryRunInTransaction).toHaveBeenCalledWith(expect.any(Function));
			expect(memoryEntryRepository.save).not.toHaveBeenCalled();
			expect(memoryEntrySourceRepository.save).not.toHaveBeenCalled();
			expect(transactionMemoryEntrySourceSave).toHaveBeenCalledWith([
				expect.objectContaining({
					agentId: 'agent-1',
					memoryEntryId: 'memory-atomic',
					observationId: 'obs-atomic',
					evidenceHash: hashEpisodicMemoryEvidence('User chose Postgres'),
					evidenceText: 'User chose Postgres',
				}),
			]);
			expect(result).toEqual(expect.objectContaining({ id: 'memory-atomic' }));
		});

		it('rolls back the episodic entry transaction when source persistence fails', async () => {
			transactionMemoryEntrySave.mockResolvedValueOnce([
				makeMemoryEntryEntity({
					id: 'memory-atomic',
					content: 'User chose Postgres for durable memory storage.',
				}),
			]);
			transactionMemoryEntrySourceSave.mockRejectedValueOnce(new Error('source write failed'));

			await expect(
				memory.episodic.saveEntryWithSources(
					{
						resourceId: 'resource-1',
						content: 'User chose Postgres for durable memory storage.',
					},
					[
						{
							observationId: 'obs-atomic',
							threadId: 'thread-1',
							evidenceText: 'User chose Postgres',
						},
					],
				),
			).rejects.toThrow('source write failed');

			expect(memoryEntryRunInTransaction).toHaveBeenCalledWith(expect.any(Function));
			expect(memoryEntryRepository.save).not.toHaveBeenCalled();
			expect(memoryEntrySourceRepository.save).not.toHaveBeenCalled();
		});

		it('reads source links for episodic entries', async () => {
			memoryEntrySourceRepository.find.mockResolvedValue([
				makeMemoryEntrySourceEntity({ memoryEntryId: 'memory-1' }),
			]);

			const sources = await memory.episodic.getEntrySources(['memory-1', 'memory-2']);

			expect(memoryEntrySourceRepository.find).toHaveBeenCalledWith({
				where: { agentId: 'agent-1', memoryEntryId: In(['memory-1', 'memory-2']) },
				order: { createdAt: 'ASC', id: 'ASC' },
			});
			expect(sources).toHaveLength(1);
			expect(sources[0].memoryEntryId).toBe('memory-1');
		});

		it('applies episodic reflection transactionally and copies source links to replacements', async () => {
			transactionMemoryEntryFind.mockResolvedValue([
				makeMemoryEntryEntity({ id: 'memory-1', content: 'User planned SQLite.' }),
				makeMemoryEntryEntity({ id: 'memory-2', content: 'User switched to Postgres.' }),
				makeMemoryEntryEntity({ id: 'noise', content: 'Agent queried memory and found nothing.' }),
			]);
			transactionMemoryEntrySourceFind
				.mockResolvedValueOnce([
					makeMemoryEntrySourceEntity({
						id: 'source-1',
						memoryEntryId: 'memory-1',
						observationId: 'obs-1',
						evidenceText: 'User planned SQLite',
					}),
					makeMemoryEntrySourceEntity({
						id: 'source-2',
						memoryEntryId: 'memory-2',
						observationId: 'obs-2',
						evidenceText: 'User switched to Postgres',
					}),
				])
				.mockResolvedValueOnce([]);

			const result = await memory.episodic.applyReflection(
				{ resourceId: 'resource-1' },
				{
					drop: ['noise'],
					merge: [
						{
							supersedes: ['memory-1', 'memory-2'],
							entry: {
								resourceId: 'resource-1',
								content: 'User switched memory store from SQLite to Postgres.',
								embedding: [1, 0],
								embeddingModel: 'openai/text-embedding-3-small',
							},
						},
					],
				},
			);

			expect(memoryEntryRunInTransaction).toHaveBeenCalledWith(expect.any(Function));
			expect(transactionMemoryEntryUpdate).toHaveBeenCalledWith(
				{ agentId: 'agent-1', resourceId: 'resource-1', id: In(['noise']), status: 'active' },
				{ status: 'dropped', supersededBy: null },
			);
			expect(transactionMemoryEntrySave).toHaveBeenCalledWith([
				expect.objectContaining({
					content: 'User switched memory store from SQLite to Postgres.',
					status: 'active',
					supersededBy: null,
				}),
			]);
			expect(transactionMemoryEntrySourceSave).toHaveBeenCalledWith([
				expect.objectContaining({
					agentId: 'agent-1',
					memoryEntryId: 'merged-memory-1',
					observationId: 'obs-1',
					evidenceHash: hashEpisodicMemoryEvidence('User planned SQLite'),
					evidenceText: 'User planned SQLite',
				}),
				expect.objectContaining({
					agentId: 'agent-1',
					memoryEntryId: 'merged-memory-1',
					observationId: 'obs-2',
					evidenceHash: hashEpisodicMemoryEvidence('User switched to Postgres'),
					evidenceText: 'User switched to Postgres',
				}),
			]);
			expect(transactionMemoryEntryUpdate).toHaveBeenCalledWith(
				{
					agentId: 'agent-1',
					resourceId: 'resource-1',
					id: In(['memory-1', 'memory-2']),
					status: 'active',
				},
				{ status: 'superseded', supersededBy: 'merged-memory-1' },
			);
			expect(result).toEqual({
				droppedIds: ['noise'],
				supersededIds: ['memory-1', 'memory-2'],
				inserted: [expect.objectContaining({ id: 'merged-memory-1' })],
			});
		});

		it('reuses an existing replacement entry when reflection content already exists', async () => {
			const replacementContent = 'User switched memory store from SQLite to Postgres.';
			const replacementHash = 'replacement-hash';
			transactionMemoryEntryFind
				.mockResolvedValueOnce([
					makeMemoryEntryEntity({ id: 'memory-1', content: 'User planned SQLite.' }),
					makeMemoryEntryEntity({ id: 'memory-2', content: 'User switched to Postgres.' }),
				])
				.mockResolvedValueOnce([
					makeMemoryEntryEntity({
						id: 'existing-replacement',
						content: replacementContent,
						contentHash: replacementHash,
						status: 'superseded',
					}),
				]);
			transactionMemoryEntrySourceFind
				.mockResolvedValueOnce([
					makeMemoryEntrySourceEntity({
						id: 'source-1',
						memoryEntryId: 'memory-1',
						observationId: 'obs-1',
						evidenceText: 'User planned SQLite',
					}),
					makeMemoryEntrySourceEntity({
						id: 'source-2',
						memoryEntryId: 'memory-2',
						observationId: 'obs-2',
						evidenceText: 'User switched to Postgres',
					}),
				])
				.mockResolvedValueOnce([]);

			const result = await memory.episodic.applyReflection(
				{ resourceId: 'resource-1' },
				{
					drop: [],
					merge: [
						{
							supersedes: ['memory-1', 'memory-2'],
							entry: {
								resourceId: 'resource-1',
								content: replacementContent,
								contentHash: replacementHash,
								embedding: [1, 0],
								embeddingModel: 'openai/text-embedding-3-small',
							},
						},
					],
				},
			);

			expect(transactionMemoryEntrySave).not.toHaveBeenCalled();
			expect(transactionMemoryEntryUpdate).toHaveBeenCalledWith(
				{ agentId: 'agent-1', resourceId: 'resource-1', id: 'existing-replacement' },
				expect.objectContaining({ status: 'active', supersededBy: null }),
			);
			expect(transactionMemoryEntrySourceSave).toHaveBeenCalledWith([
				expect.objectContaining({
					agentId: 'agent-1',
					memoryEntryId: 'existing-replacement',
					observationId: 'obs-1',
				}),
				expect.objectContaining({
					agentId: 'agent-1',
					memoryEntryId: 'existing-replacement',
					observationId: 'obs-2',
				}),
			]);
			expect(transactionMemoryEntryUpdate).toHaveBeenCalledWith(
				{
					agentId: 'agent-1',
					resourceId: 'resource-1',
					id: In(['memory-1', 'memory-2']),
					status: 'active',
				},
				{ status: 'superseded', supersededBy: 'existing-replacement' },
			);
			expect(result).toEqual({
				droppedIds: [],
				supersededIds: ['memory-1', 'memory-2'],
				inserted: [expect.objectContaining({ id: 'existing-replacement' })],
			});
		});

		const mockEpisodicCursorWrite = () => {
			const insertQueryBuilder = {
				insert: jest.fn().mockReturnThis(),
				into: jest.fn().mockReturnThis(),
				values: jest.fn().mockReturnThis(),
				orIgnore: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ raw: {}, generatedMaps: [], identifiers: [] }),
			};
			const updateQueryBuilder = {
				update: jest.fn().mockReturnThis(),
				set: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				setParameters: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ affected: 1 }),
			};

			memoryEntryCursorRepository.createQueryBuilder
				.mockReturnValueOnce(insertQueryBuilder as never)
				.mockReturnValueOnce(updateQueryBuilder as never);

			return { insertQueryBuilder, updateQueryBuilder };
		};

		it('only advances the episodic cursor by observation keyset', async () => {
			const lastIndexedObservationCreatedAt = new Date('2026-05-05T00:00:00Z');
			const { insertQueryBuilder, updateQueryBuilder } = mockEpisodicCursorWrite();

			await memory.episodic.setCursor({
				observationScopeId: 'thread-1',
				lastIndexedObservationId: 'obs-1',
				lastIndexedObservationCreatedAt,
			});

			expect(insertQueryBuilder.values).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					observationScopeId: 'thread-1',
					lastIndexedObservationId: 'obs-1',
					lastIndexedObservationCreatedAt,
				}),
			);
			expect(insertQueryBuilder.orIgnore).toHaveBeenCalled();
			expect(updateQueryBuilder.where).toHaveBeenCalledWith('"agentId" = :agentId');
			expect(updateQueryBuilder.andWhere).toHaveBeenCalledWith(
				'"observationScopeId" = :observationScopeId',
			);
			expect(updateQueryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining(
					'"lastIndexedObservationCreatedAt" < :lastIndexedObservationCreatedAt',
				),
			);
			expect(updateQueryBuilder.andWhere).toHaveBeenCalledWith(
				expect.stringContaining('"lastIndexedObservationId" < :lastIndexedObservationId'),
			);
			expect(updateQueryBuilder.setParameters).toHaveBeenCalledWith({
				agentId: 'agent-1',
				observationScopeId: 'thread-1',
				lastIndexedObservationId: 'obs-1',
				lastIndexedObservationCreatedAt,
			});
			expect(memoryEntryCursorRepository.upsert).not.toHaveBeenCalled();
		});

		it('reads episodic cursors as dates', async () => {
			const lastIndexedObservationCreatedAt = new Date('2026-05-05T00:00:00Z');
			memoryEntryCursorRepository.findOneBy.mockResolvedValue({
				agentId: 'agent-1',
				observationScopeId: 'thread-1',
				lastIndexedObservationId: 'obs-1',
				lastIndexedObservationCreatedAt,
				createdAt: new Date('2026-05-05T00:00:00Z'),
				updatedAt: new Date('2026-05-05T00:00:01Z'),
			} as AgentMemoryEntryCursorEntity);

			const cursor = await memory.episodic.getCursor({
				observationScopeId: 'thread-1',
			});

			expect(cursor?.lastIndexedObservationId).toBe('obs-1');
			expect(cursor?.lastIndexedObservationCreatedAt).toBe(lastIndexedObservationCreatedAt);
		});
	});
});
