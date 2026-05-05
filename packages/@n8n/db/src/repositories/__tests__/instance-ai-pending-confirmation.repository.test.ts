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
