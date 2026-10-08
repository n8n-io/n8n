import { hashEpisodicMemoryEvidence, type NewObservationLogEntry } from '@n8n/agents';
import type { OperationContext, Transaction } from '@n8n/db';
import { In, IsNull, Like } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AgentMemoryEntryCandidateEntity } from '../../entities/agent-memory-entry-candidate.entity';
import type { AgentMemoryEntryLockEntity } from '../../entities/agent-memory-entry-lock.entity';
import { AgentMemoryEntrySourceEntity } from '../../entities/agent-memory-entry-source.entity';
import { AgentMemoryEntryEntity } from '../../entities/agent-memory-entry.entity';
import type { AgentMessageEntity } from '../../entities/agent-message.entity';
import { AgentObservationCursorEntity } from '../../entities/agent-observation-cursor.entity';
import { AgentObservationLockEntity } from '../../entities/agent-observation-lock.entity';
import { AgentObservationEntity } from '../../entities/agent-observation.entity';
import { AgentThreadEntity } from '../../entities/agent-thread.entity';
import type { AgentMemoryEntryCandidateRepository } from '../../repositories/agent-memory-entry-candidate.repository';
import type { AgentMemoryEntryLockRepository } from '../../repositories/agent-memory-entry-lock.repository';
import type { AgentMemoryEntrySourceRepository } from '../../repositories/agent-memory-entry-source.repository';
import type { AgentMemoryEntryRepository } from '../../repositories/agent-memory-entry.repository';
import type { AgentMessageRepository } from '../../repositories/agent-message.repository';
import type { AgentObservationCursorRepository } from '../../repositories/agent-observation-cursor.repository';
import type { AgentObservationLockRepository } from '../../repositories/agent-observation-lock.repository';
import type { AgentObservationRepository } from '../../repositories/agent-observation.repository';
import { AgentResourceRepository } from '../../repositories/agent-resource.repository';
import type { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import { N8nMemory } from '../n8n-memory';

type N8nMemoryImplementation = ReturnType<N8nMemory['getImplementation']>;

describe('N8nMemory', () => {
	let memory: N8nMemoryImplementation;
	let memoryService: N8nMemory;
	let messageRepository: Mocked<AgentMessageRepository>;
	let threadRepository: Mocked<AgentThreadRepository>;
	let resourceRepository: Mocked<AgentResourceRepository>;
	let resourceInsertQueryBuilder: {
		insert: Mock;
		into: Mock;
		values: Mock;
		orIgnore: Mock;
		execute: Mock;
	};
	let observationRepository: Mocked<AgentObservationRepository>;
	let observationCursorRepository: Mocked<AgentObservationCursorRepository>;
	let observationLockRepository: Mocked<AgentObservationLockRepository>;
	let memoryEntryRepository: Mocked<AgentMemoryEntryRepository>;
	let memoryEntryCandidateRepository: Mocked<AgentMemoryEntryCandidateRepository>;
	let memoryEntryLockRepository: Mocked<AgentMemoryEntryLockRepository>;
	let memoryEntrySourceRepository: Mocked<AgentMemoryEntrySourceRepository>;
	let runInTransaction: Mock;
	let transactionDelete: Mock;
	let observationRunInTransaction: Mock;
	let transactionObservationCreate: Mock;
	let transactionObservationFind: Mock;
	let transactionObservationSave: Mock;
	let transactionObservationUpdate: Mock;
	let memoryEntryRunInTransaction: Mock;
	let transactionMemoryEntryCreate: Mock;
	let transactionMemoryEntryFind: Mock;
	let transactionMemoryEntryFindOneBy: Mock;
	let transactionMemoryEntrySave: Mock;
	let transactionMemoryEntryUpdate: Mock;
	let transactionMemoryEntrySourceCreate: Mock;
	let transactionMemoryEntrySourceFind: Mock;
	let transactionMemoryEntrySourceFindOneBy: Mock;
	let transactionMemoryEntrySourceSave: Mock;

	beforeEach(() => {
		vi.clearAllMocks();

		messageRepository = mock<AgentMessageRepository>();
		threadRepository = mock<AgentThreadRepository>();
		resourceRepository = mock<AgentResourceRepository>();
		observationRepository = mock<AgentObservationRepository>();
		observationCursorRepository = mock<AgentObservationCursorRepository>();
		observationLockRepository = mock<AgentObservationLockRepository>();
		memoryEntryRepository = mock<AgentMemoryEntryRepository>();
		memoryEntryCandidateRepository = mock<AgentMemoryEntryCandidateRepository>();
		memoryEntryLockRepository = mock<AgentMemoryEntryLockRepository>();
		memoryEntrySourceRepository = mock<AgentMemoryEntrySourceRepository>();
		resourceInsertQueryBuilder = {
			insert: vi.fn().mockReturnThis(),
			into: vi.fn().mockReturnThis(),
			values: vi.fn().mockReturnThis(),
			orIgnore: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue({ raw: {}, generatedMaps: [], identifiers: [] }),
		};
		resourceRepository.createQueryBuilder.mockReturnValue(resourceInsertQueryBuilder as never);
		resourceRepository.ensureExists.mockImplementation(
			AgentResourceRepository.prototype.ensureExists.bind(resourceRepository),
		);
		transactionDelete = vi.fn().mockResolvedValue({ affected: 1, raw: {} });
		transactionObservationCreate = vi.fn((input) => ({ ...input }) as AgentObservationEntity);
		transactionObservationFind = vi.fn().mockResolvedValue([]);
		transactionObservationSave = vi.fn(async (input: AgentObservationEntity[]) =>
			input.map((entity, index) => ({
				...entity,
				id: `merged-${index + 1}`,
				createdAt: entity.createdAt ?? new Date('2026-05-12T10:00:00Z'),
				updatedAt: entity.updatedAt ?? new Date('2026-05-12T10:00:00Z'),
			})),
		);
		transactionObservationUpdate = vi.fn().mockResolvedValue({ affected: 1, raw: {} });
		observationRunInTransaction = vi.fn(
			async (callback: (trx: { getRepository: Mock }) => Promise<unknown>) =>
				await callback({
					getRepository: vi.fn().mockReturnValue({
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

		transactionMemoryEntryCreate = vi.fn((input) => ({ ...input }) as AgentMemoryEntryEntity);
		transactionMemoryEntryFind = vi.fn().mockResolvedValue([]);
		transactionMemoryEntryFindOneBy = vi.fn().mockResolvedValue(null);
		transactionMemoryEntrySave = vi.fn(async (input: AgentMemoryEntryEntity[]) =>
			input.map((entity, index) => ({
				...entity,
				id: `merged-memory-${index + 1}`,
				createdAt: entity.createdAt ?? new Date('2026-05-12T10:00:00Z'),
				updatedAt: entity.updatedAt ?? new Date('2026-05-12T10:00:00Z'),
			})),
		);
		transactionMemoryEntryUpdate = vi.fn().mockResolvedValue({ affected: 1, raw: {} });
		transactionMemoryEntrySourceCreate = vi.fn(
			(input) => ({ ...input }) as AgentMemoryEntrySourceEntity,
		);
		transactionMemoryEntrySourceFind = vi.fn().mockResolvedValue([]);
		transactionMemoryEntrySourceFindOneBy = vi.fn().mockResolvedValue(null);
		transactionMemoryEntrySourceSave = vi.fn(async (input: AgentMemoryEntrySourceEntity[]) =>
			input.map((entity, index) => ({
				...entity,
				id: `merged-source-${index + 1}`,
				createdAt: entity.createdAt ?? new Date('2026-05-12T10:00:00Z'),
				updatedAt: entity.updatedAt ?? new Date('2026-05-12T10:00:00Z'),
			})),
		);
		runInTransaction = vi.fn(
			async (
				callback: (trx: {
					delete: typeof transactionDelete;
					getRepository: Mock;
				}) => Promise<void>,
			) => {
				await callback({
					delete: transactionDelete,
					getRepository: vi.fn((entity) => {
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
		threadRepository.runInTransaction.mockImplementation(
			async (ctx, callback) =>
				await runInTransaction(
					async (trx: { delete: typeof transactionDelete; getRepository: Mock }) =>
						await callback(trx as never, ctx),
				),
		);
		memoryEntryRunInTransaction = vi.fn(
			async (callback: (trx: { getRepository: Mock }) => Promise<unknown>) =>
				await callback({
					getRepository: vi.fn((entity) => {
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
			memoryEntryCandidateRepository,
			memoryEntryLockRepository,
			memoryEntrySourceRepository,
		);
		memory = memoryService.getImplementation('agent-1');
	});

	it.each([
		['user-1', 'user-1'],
		['integration:slack:U_ALICE', undefined],
		[undefined, undefined],
		['', ''],
	])('loads the correct message scope for resource %s', async (resourceId, expectedResource) => {
		messageRepository.findRuntimeMessages.mockResolvedValue([]);
		const before = new Date('2026-01-01');
		await memory.getMessages('thread-1', { resourceId, before, limit: 2 });
		expect(messageRepository.findRuntimeMessages).toHaveBeenCalledWith(
			{ threadId: 'thread-1', resourceId: expectedResource },
			{ resourceId, before, limit: 2 },
		);
	});

	it('hydrates model content and ordering from message columns for both runtime readers', async () => {
		const createdAt = new Date('2026-01-01T00:00:01Z');
		const modelContextAt = new Date('2026-01-01T00:00:02Z');
		const original = {
			role: 'user' as const,
			content: [{ type: 'text' as const, text: 'original' }],
		};
		const projected = {
			role: 'user' as const,
			content: [{ type: 'text' as const, text: 'enriched' }],
		};
		const legacy = Object.assign(mock<AgentMessageEntity>(), {
			id: 'legacy',
			createdAt,
			modelContextAt: null,
			modelContent: null,
			content: Object.assign({}, original, { createdAt: createdAt.toISOString() }),
		});
		const current = Object.assign(mock<AgentMessageEntity>(), {
			id: 'current',
			createdAt,
			modelContextAt,
			content: original,
			modelContent: projected,
		});
		messageRepository.findRuntimeMessages.mockResolvedValue([legacy, current]);
		const expected = [
			{ ...original, id: 'legacy', createdAt },
			{ ...projected, id: 'current', createdAt: modelContextAt },
		];
		expect(await memory.getMessages('thread-1')).toEqual(expected);
		const since = { sinceCreatedAt: createdAt, sinceMessageId: 'older' };
		expect(await memory.getMessagesForObservationScope('thread-1', { since })).toEqual(expected);
		expect(messageRepository.findRuntimeMessages).toHaveBeenLastCalledWith(
			{ threadId: 'thread-1' },
			{ since },
		);
	});

	it('passes execution ownership to message persistence when host metadata is present', async () => {
		const messages = [
			{ id: 'm-1', createdAt: new Date(), role: 'assistant' as const, content: [] },
		];
		await memory.saveMessages({
			threadId: 'thread-1',
			resourceId: 'user-1',
			messages,
			hostMetadata: { n8nExecutionId: 'execution-1' },
		});
		expect(messageRepository.saveRuntimeMessages).toHaveBeenCalledWith({
			threadId: 'thread-1',
			resourceId: 'user-1',
			messages,
			executionId: 'execution-1',
		});
	});

	describe('saveThread — existing row', () => {
		/** Applies the update to `existing` the way the locked repository write does. */
		function lockedRow(existing: Partial<AgentThreadEntity>) {
			const row = { id: 'thread-1', resourceId: 'original-user', ...existing } as AgentThreadEntity;
			threadRepository.patchThread.mockImplementation(async (threadId, update) => {
				if (threadId !== row.id) return null;
				const patch = update(row);
				if (!patch) return row;
				if (patch.title !== undefined) row.title = patch.title;
				if (patch.metadata !== undefined) row.metadata = patch.metadata;
				return row;
			});
			return row;
		}

		it('preserves the original resourceId instead of overwriting with the caller’s', async () => {
			// Shared threads (e.g. the test-chat thread keyed by agentId) are
			// written to by multiple users. The first writer owns the row;
			// subsequent saves must not re-stamp it with the current caller.
			const row = lockedRow({ title: null, metadata: null });

			const saved = await memory.saveThread({
				id: 'thread-1',
				resourceId: 'different-user',
				title: 'Renamed',
				metadata: undefined,
			});

			expect(row.resourceId).toBe('original-user');
			expect(saved.resourceId).toBe('original-user');
			expect(threadRepository.save).not.toHaveBeenCalled();
		});

		it('still ensures the caller’s resource row exists (for message-level writes)', async () => {
			// resourceId on the thread is preserved, but messages saved afterwards
			// carry the current user's resourceId — that row must exist.
			lockedRow({ title: null, metadata: null });

			await memory.saveThread({
				id: 'thread-1',
				resourceId: 'different-user',
				title: undefined,
				metadata: undefined,
			});

			expect(resourceInsertQueryBuilder.values).toHaveBeenCalledWith({
				id: 'different-user',
				metadata: null,
			});
			expect(resourceInsertQueryBuilder.orIgnore).toHaveBeenCalled();
		});

		it('merges metadata updates into the locked row instead of replacing it', async () => {
			const currentMessageContext = {
				integrationConnectionId: 'slack:cred-1',
				platform: 'slack',
				target: { type: 'thread', threadId: 'thread-1' },
				updatedAt: '2026-05-18T10:00:00.000Z',
			};
			const row = lockedRow({ title: null, metadata: JSON.stringify({ currentMessageContext }) });

			await memory.saveThread({
				id: 'thread-1',
				resourceId: 'different-user',
				title: undefined,
				metadata: { summary: 'Support thread' },
			});

			expect(JSON.parse(row.metadata ?? '{}')).toEqual({
				currentMessageContext,
				summary: 'Support thread',
			});
		});

		it('writes nothing when the save carries no title or metadata', async () => {
			lockedRow({ title: 'Chat', metadata: null });

			await memory.saveThread({ id: 'thread-1', resourceId: 'original-user' });

			const update = threadRepository.patchThread.mock.calls[0][1];
			expect(update({ title: 'Chat', metadata: '{"a":1}' } as AgentThreadEntity)).toBeNull();
		});
	});

	describe('saveThread — new row', () => {
		it('creates the thread when no row exists', async () => {
			threadRepository.patchThread.mockResolvedValue(null);
			threadRepository.create.mockImplementation((e) => e as AgentThreadEntity);
			threadRepository.save.mockImplementation(async (e) => e as AgentThreadEntity);

			await memory.saveThread({
				id: 'thread-1',
				resourceId: 'user-1',
				title: 'Chat',
				metadata: { keep: 1 },
			});

			expect(threadRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'thread-1',
					resourceId: 'user-1',
					title: 'Chat',
					metadata: JSON.stringify({ keep: 1 }),
				}),
			);
		});
	});

	describe('patchThread', () => {
		let writes: number;

		/** A row store behind the repository double that counts writes. */
		function seedThread(metadata: Record<string, unknown> | null) {
			writes = 0;
			const row = {
				id: 'thread-1',
				resourceId: 'user-1',
				title: 'Chat',
				metadata: metadata ? JSON.stringify(metadata) : null,
			} as AgentThreadEntity;
			threadRepository.patchThread.mockImplementation(async (threadId, update) => {
				if (threadId !== row.id) return null;
				const patch = update(row);
				if (!patch) return { ...row };
				if (patch.title !== undefined) row.title = patch.title;
				if (patch.metadata !== undefined) row.metadata = patch.metadata;
				writes++;
				return { ...row } as AgentThreadEntity;
			});
			return row;
		}

		it('replaces the metadata, so a patch can remove keys', async () => {
			const row = seedThread({ keep: 1, drop: 2 });

			const updated = await memory.patchThread({
				threadId: 'thread-1',
				update: ({ metadata }) => {
					const { drop: _drop, ...rest } = metadata ?? {};
					return { title: 'Renamed', metadata: { ...rest, added: true } };
				},
			});

			expect(jsonParse(row.metadata ?? '{}')).toEqual({ keep: 1, added: true });
			expect(row.title).toBe('Renamed');
			expect(updated).toMatchObject({
				id: 'thread-1',
				title: 'Renamed',
				metadata: { keep: 1, added: true },
			});
		});

		it('keeps the title when the patch only sets metadata', async () => {
			const row = seedThread({ count: 1 });

			await memory.patchThread({
				threadId: 'thread-1',
				update: () => ({ metadata: {} }),
			});

			expect(row.title).toBe('Chat');
			expect(row.metadata).toBe('{}');
		});

		it('returns the current thread without a write when the update returns null', async () => {
			seedThread({ count: 1 });

			const result = await memory.patchThread({ threadId: 'thread-1', update: () => null });

			expect(result).toMatchObject({ id: 'thread-1', title: 'Chat', metadata: { count: 1 } });
			expect(writes).toBe(0);
		});

		it('returns null for a missing thread without calling the update', async () => {
			seedThread({});
			const update = vi.fn();

			expect(await memory.patchThread({ threadId: 'missing', update })).toBeNull();
			expect(update).not.toHaveBeenCalled();
			expect(writes).toBe(0);
		});

		it('passes a root operation context to the repository by default', async () => {
			seedThread({});

			await memory.patchThread({ threadId: 'thread-1', update: () => null });

			expect(threadRepository.patchThread).toHaveBeenCalledWith(
				'thread-1',
				expect.any(Function),
				{},
			);
		});

		it("passes the caller's operation context to the repository", async () => {
			seedThread({});
			const ctx: OperationContext = { trx: mock<Transaction>() };

			await memory.patchThread({ threadId: 'thread-1', update: () => null }, ctx);

			expect(threadRepository.patchThread).toHaveBeenCalledWith(
				'thread-1',
				expect.any(Function),
				ctx,
			);
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
			expect(transactionDelete).toHaveBeenNthCalledWith(4, AgentThreadEntity, { id: 'thread-1' });
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
			expect(transactionDelete).toHaveBeenNthCalledWith(4, AgentThreadEntity, {
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
			(observationRepository.save as unknown as Mock).mockImplementation(
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
					tokenCount: 1,
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
					tokenCount: 3,
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
				update: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				setParameters: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue({ affected: updateAffected }),
			};
			const insertQueryBuilder = {
				insert: vi.fn().mockReturnThis(),
				into: vi.fn().mockReturnThis(),
				values: vi.fn().mockReturnThis(),
				orIgnore: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue({ raw: {}, generatedMaps: [], identifiers: [] }),
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
				update: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				andWhere: vi.fn().mockReturnThis(),
				setParameters: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue({ affected: updateAffected }),
			};
			const insertQueryBuilder = {
				insert: vi.fn().mockReturnThis(),
				into: vi.fn().mockReturnThis(),
				values: vi.fn().mockReturnThis(),
				orIgnore: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue({ raw: {}, generatedMaps: [], identifiers: [] }),
			};

			memoryEntryLockRepository.createQueryBuilder
				.mockReturnValueOnce(updateQueryBuilder as never)
				.mockReturnValueOnce(insertQueryBuilder as never);
			memoryEntryLockRepository.findOneBy.mockResolvedValue(claimed ?? null);

			return { updateQueryBuilder, insertQueryBuilder };
		};

		it('locks integration runs on the thread scope shared by every author', async () => {
			const { insertQueryBuilder } = mockEpisodicLockWrite({
				updateAffected: 0,
				claimed: {
					agentId: 'agent-1',
					resourceId: 'thread:thread-1',
					holderId: 'A',
					heldUntil: new Date(Date.now() + 60_000),
				} as AgentMemoryEntryLockEntity,
			});

			const handle = await memory.episodic.taskLock?.acquire(
				{ resourceId: 'integration:slack:U_ALICE', threadId: 'thread-1' },
				{ ttlMs: 60_000, holderId: 'A' },
			);

			expect(handle).toMatchObject({ resourceId: 'thread:thread-1', holderId: 'A' });
			expect(insertQueryBuilder.values).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					resourceId: 'thread:thread-1',
					holderId: 'A',
				}),
			);
			expect(observationLockRepository.createQueryBuilder).not.toHaveBeenCalled();
		});

		it('uses the bound agent id for episodic task lock isolation', async () => {
			const agentTwoMemory = memoryService.getImplementation('agent-2');
			const { updateQueryBuilder } = mockEpisodicLockWrite({ updateAffected: 1 });

			const handle = await agentTwoMemory.episodic.taskLock?.acquire(
				{ resourceId: 'resource-1', threadId: 'thread-1' },
				{ ttlMs: 60_000, holderId: 'B' },
			);

			expect(handle).toMatchObject({ resourceId: 'resource-1', holderId: 'B' });
			expect(updateQueryBuilder.setParameters).toHaveBeenCalledWith(
				expect.objectContaining({ agentId: 'agent-2', resourceId: 'resource-1' }),
			);
		});

		it('refuses episodic task locks held by another live holder', async () => {
			mockEpisodicLockWrite({ updateAffected: 0 });

			const handle = await memory.episodic.taskLock?.acquire(
				{ resourceId: 'resource-1', threadId: 'thread-1' },
				{ ttlMs: 60_000, holderId: 'B' },
			);

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

		it('stores an integration entry once, under the thread it was said in', async () => {
			const result = await memory.episodic.saveEntryWithSources(
				{
					resourceId: 'integration:slack:U_BOB',
					content: 'The Flan recipe uses three eggs.',
					embedding: [1, 0],
					embeddingModel: 'openai/text-embedding-3-small',
				},
				[{ candidateId: 'candidate-1', threadId: 'thread-1', evidenceText: 'Use three eggs.' }],
			);

			expect(transactionMemoryEntryCreate).toHaveBeenCalledTimes(1);
			expect(transactionMemoryEntryCreate).toHaveBeenCalledWith(
				expect.objectContaining({ agentId: 'agent-1', resourceId: 'thread:thread-1' }),
			);
			expect(resourceInsertQueryBuilder.values).toHaveBeenCalledWith({
				id: 'thread:thread-1',
				metadata: null,
			});
			expect(result).toMatchObject({ id: 'merged-memory-1', resourceId: 'thread:thread-1' });
		});

		it('enqueues and drains capture candidates under the thread scope', async () => {
			const scope = { resourceId: 'integration:slack:U_BOB', threadId: 'thread-1' };
			memoryEntryCandidateRepository.enqueueCandidate.mockImplementation(
				async (input) =>
					({
						...input,
						id: 'candidate-1',
						status: 'pending',
						attemptCount: 0,
						createdAt: new Date('2026-05-12T10:00:00Z'),
						updatedAt: new Date('2026-05-12T10:00:00Z'),
					}) as AgentMemoryEntryCandidateEntity,
			);
			memoryEntryCandidateRepository.findPendingForResource.mockResolvedValue([]);

			const candidate = await memory.episodic.enqueueCaptureCandidate({
				...scope,
				sourceMessageId: null,
				runId: 'run-1',
				toolCallId: 'call-1',
				content: 'The Flan recipe uses three eggs.',
				evidenceText: 'Use three eggs.',
				kind: 'fact',
			});
			await memory.episodic.getPendingCaptureCandidates(scope);

			expect(candidate.resourceId).toBe('thread:thread-1');
			expect(memoryEntryCandidateRepository.findPendingForResource).toHaveBeenCalledWith(
				'agent-1',
				'thread:thread-1',
				100,
			);
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
				{ resourceId: 'resource-1', threadId: 'thread-1' },
				'Postgres memory store',
				{ queryEmbedding: [1, 0], topK: 1 },
			);

			expect(memoryEntryRepository.find).toHaveBeenCalledWith({
				where: {
					agentId: 'agent-1',
					resourceId: In(['resource-1']),
					status: In(['active']),
				},
			});
			expect(messageRepository.findRecentThreadIdsByResourceId).not.toHaveBeenCalled();
			expect(results.map((result) => result.id)).toEqual(['memory-1']);
		});

		it('limits integration write-scope searches to the current thread', async () => {
			memoryEntryRepository.find.mockResolvedValue([]);

			await memory.episodic.searchEntries(
				{ resourceId: 'integration:slack:U1', threadId: 'thread-1' },
				'shared fact',
				{ writeScopeOnly: true },
			);

			expect(memoryEntryRepository.find).toHaveBeenCalledWith({
				where: {
					agentId: 'agent-1',
					resourceId: In(['thread:thread-1']),
					status: In(['active']),
				},
			});
			expect(messageRepository.findRecentThreadIdsByResourceId).not.toHaveBeenCalled();
		});

		it('recalls from the author scope, the current thread and the threads they posted in', async () => {
			messageRepository.findRecentThreadIdsByResourceId.mockResolvedValue([
				'thread-1',
				'thread-old',
			]);
			memoryEntryRepository.find.mockResolvedValue([
				makeMemoryEntryEntity({
					id: 'memory-old',
					resourceId: 'thread:thread-old',
					contentHash: 'dog-hash',
					content: "Robin's dog is called Phoebe.",
					lastSeenAt: new Date('2026-05-01T00:00:00Z'),
				}),
				makeMemoryEntryEntity({
					id: 'memory-current',
					resourceId: 'thread:thread-1',
					contentHash: 'dog-hash',
					content: "Robin's dog is called Phoebe.",
					lastSeenAt: new Date('2026-05-09T00:00:00Z'),
				}),
			]);

			const results = await memory.episodic.searchEntries(
				{ resourceId: 'integration:slack:U_SINDHUJA', threadId: 'thread-1' },
				'Phoebe dog',
			);

			expect(messageRepository.findRecentThreadIdsByResourceId).toHaveBeenCalledWith(
				'agent-1',
				'integration:slack:U_SINDHUJA',
				200,
			);
			expect(memoryEntryRepository.find).toHaveBeenCalledWith({
				where: {
					agentId: 'agent-1',
					resourceId: In(['integration:slack:U_SINDHUJA', 'thread:thread-1', 'thread:thread-old']),
					status: In(['active']),
				},
			});
			expect(results.map((result) => result.id)).toEqual(['memory-current']);
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

		it('applies episodic reflection inside the thread scope and copies source links to replacements', async () => {
			// The lookup is scoped to the thread, so an id recalled from another thread is not active here.
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
				{ resourceId: 'integration:slack:U_ALICE', threadId: 'thread-1' },
				{
					drop: ['noise', 'other-thread-entry'],
					merge: [
						{
							supersedes: ['memory-1', 'memory-2'],
							entry: {
								resourceId: 'integration:slack:U_ALICE',
								content: 'User switched memory store from SQLite to Postgres.',
								embedding: [1, 0],
								embeddingModel: 'openai/text-embedding-3-small',
							},
						},
					],
				},
			);

			expect(memoryEntryRunInTransaction).toHaveBeenCalledWith(expect.any(Function));
			expect(transactionMemoryEntryFind).toHaveBeenCalledWith({
				where: expect.objectContaining({ resourceId: 'thread:thread-1' }),
			});
			expect(transactionMemoryEntryUpdate).toHaveBeenCalledWith(
				{ agentId: 'agent-1', resourceId: 'thread:thread-1', id: In(['noise']), status: 'active' },
				{ status: 'dropped', supersededBy: null },
			);
			expect(transactionMemoryEntrySave).toHaveBeenCalledWith([
				expect.objectContaining({
					resourceId: 'thread:thread-1',
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
					resourceId: 'thread:thread-1',
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
				{ resourceId: 'resource-1', threadId: 'thread-1' },
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
	});
});
