import type { OperationContext, TransactionRunner } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import { InstanceAiObservationCursor } from '../../entities/instance-ai-observation-cursor.entity';
import { InstanceAiObservationCursorRepository } from '../instance-ai-observation-cursor.repository';

describe('InstanceAiObservationCursorRepository', () => {
	const ROOT: OperationContext = {};
	const entityManager = mockEntityManager(InstanceAiObservationCursor);
	let repository: InstanceAiObservationCursorRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = new InstanceAiObservationCursorRepository(
			entityManager.connection,
			mock<TransactionRunner>(),
		);
	});

	describe('findForThread', () => {
		it('returns the stored cursor scoped to the thread', async () => {
			const stored = Object.assign(new InstanceAiObservationCursor(), {
				observationScopeId: 'thread-1',
				lastObservedMessageId: 'message-1',
				lastObservedAt: new Date('2026-01-01T00:00:00.000Z'),
				updatedAt: new Date('2026-01-01T00:01:00.000Z'),
			});
			entityManager.findOneBy.mockResolvedValueOnce(stored);

			await expect(repository.findForThread('thread-1', ROOT)).resolves.toBe(stored);
			expect(entityManager.findOneBy).toHaveBeenCalledWith(InstanceAiObservationCursor, {
				observationScopeId: 'thread-1',
			});
		});

		it('returns null when no cursor exists for the thread', async () => {
			entityManager.findOneBy.mockResolvedValueOnce(null);

			await expect(repository.findForThread('thread-1', ROOT)).resolves.toBeNull();
		});
	});

	describe('upsertForThread', () => {
		it('upserts the cursor by observationScopeId without skipping unchanged updates', async () => {
			const cursor = {
				observationScopeId: 'thread-1',
				lastObservedMessageId: 'message-2',
				lastObservedAt: new Date('2026-01-01T00:00:00.000Z'),
				updatedAt: new Date('2026-01-01T00:01:00.000Z'),
			};
			entityManager.upsert.mockResolvedValueOnce({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});

			await expect(repository.upsertForThread(cursor, ROOT)).resolves.toBeUndefined();
			expect(entityManager.upsert).toHaveBeenCalledWith(InstanceAiObservationCursor, cursor, {
				conflictPaths: ['observationScopeId'],
				skipUpdateIfNoValuesChanged: false,
			});
		});
	});
});
