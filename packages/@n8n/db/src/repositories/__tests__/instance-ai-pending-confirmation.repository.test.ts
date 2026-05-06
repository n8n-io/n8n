import { Container } from '@n8n/di';
import { LessThan, MoreThan } from '@n8n/typeorm';

import { InstanceAiPendingConfirmation } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { InstanceAiPendingConfirmationRepository } from '../instance-ai-pending-confirmation.repository';

describe('InstanceAiPendingConfirmationRepository', () => {
	const entityManager = mockEntityManager(InstanceAiPendingConfirmation);
	const repository = Container.get(InstanceAiPendingConfirmationRepository);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('register', () => {
		it('upserts by requestId with the provided fields', async () => {
			const expiresAt = new Date('2030-01-01T00:00:00Z');

			await repository.register({
				requestId: 'req-1',
				threadId: 'thread-1',
				userId: 'user-1',
				kind: 'suspended',
				runId: 'run-1',
				mastraRunId: 'mastra-1',
				toolCallId: 'tool-1',
				messageGroupId: 'mg-1',
				checkpointTaskId: null,
				expiresAt,
			});

			expect(entityManager.upsert).toHaveBeenCalledWith(
				InstanceAiPendingConfirmation,
				{
					requestId: 'req-1',
					threadId: 'thread-1',
					userId: 'user-1',
					kind: 'suspended',
					runId: 'run-1',
					mastraRunId: 'mastra-1',
					toolCallId: 'tool-1',
					messageGroupId: 'mg-1',
					checkpointTaskId: null,
					expiresAt,
				},
				['requestId'],
			);
		});

		it('coerces missing optional fields to null', async () => {
			await repository.register({
				requestId: 'req-1',
				threadId: 'thread-1',
				userId: 'user-1',
				kind: 'inline',
				runId: 'run-1',
				expiresAt: new Date('2030-01-01T00:00:00Z'),
			});

			expect(entityManager.upsert).toHaveBeenCalledWith(
				InstanceAiPendingConfirmation,
				expect.objectContaining({
					mastraRunId: null,
					toolCallId: null,
					messageGroupId: null,
					checkpointTaskId: null,
				}),
				['requestId'],
			);
		});
	});

	describe('findByRequestId', () => {
		it('filters out expired rows via the expiresAt > now predicate', async () => {
			const findOneSpy = jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);
			const now = new Date('2030-01-01T00:00:00Z');

			await repository.findByRequestId('req-1', now);

			expect(findOneSpy).toHaveBeenCalledWith({
				where: { requestId: 'req-1', expiresAt: MoreThan(now) },
			});
		});
	});

	describe('existsSuspendedForThread', () => {
		it('queries for kind=suspended rows on the thread that have not expired', async () => {
			const existsBySpy = jest.spyOn(repository, 'existsBy').mockResolvedValueOnce(true);
			const now = new Date('2030-01-01T00:00:00Z');

			const result = await repository.existsSuspendedForThread('thread-1', now);

			expect(result).toBe(true);
			expect(existsBySpy).toHaveBeenCalledWith({
				threadId: 'thread-1',
				kind: 'suspended',
				expiresAt: MoreThan(now),
			});
		});

		it('returns false when no row exists', async () => {
			jest.spyOn(repository, 'existsBy').mockResolvedValueOnce(false);

			const result = await repository.existsSuspendedForThread('thread-1', new Date());

			expect(result).toBe(false);
		});
	});

	describe('findByThread', () => {
		it('returns all rows for the thread regardless of kind or expiry', async () => {
			const findSpy = jest.spyOn(repository, 'find').mockResolvedValueOnce([]);

			await repository.findByThread('thread-1');

			expect(findSpy).toHaveBeenCalledWith({ where: { threadId: 'thread-1' } });
		});
	});

	describe('claim', () => {
		it('returns true when the row was deleted (this caller wins)', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 1, raw: {} });

			const won = await repository.claim('req-1');

			expect(won).toBe(true);
			expect(entityManager.delete).toHaveBeenCalledWith(InstanceAiPendingConfirmation, {
				requestId: 'req-1',
			});
		});

		it('returns false when no row was deleted (concurrent claim or already gone)', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 0, raw: {} });

			const won = await repository.claim('req-1');

			expect(won).toBe(false);
		});

		it('returns false when affected is undefined', async () => {
			entityManager.delete.mockResolvedValueOnce({ raw: {} });

			const won = await repository.claim('req-1');

			expect(won).toBe(false);
		});
	});

	describe('deleteByThread', () => {
		it('deletes all rows for the given threadId', async () => {
			await repository.deleteByThread('thread-1');

			expect(entityManager.delete).toHaveBeenCalledWith(InstanceAiPendingConfirmation, {
				threadId: 'thread-1',
			});
		});
	});

	describe('deleteExpired', () => {
		it('deletes rows past the expiresAt cutoff and returns the affected count', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 3, raw: {} });
			const now = new Date('2030-01-01T00:00:00Z');

			const count = await repository.deleteExpired(now);

			expect(entityManager.delete).toHaveBeenCalledWith(InstanceAiPendingConfirmation, {
				expiresAt: LessThan(now),
			});
			expect(count).toBe(3);
		});

		it('returns 0 when affected is undefined', async () => {
			entityManager.delete.mockResolvedValueOnce({ raw: {} });

			const count = await repository.deleteExpired(new Date());

			expect(count).toBe(0);
		});
	});
});
