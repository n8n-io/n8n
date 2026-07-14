import { Container } from '@n8n/di';
import type { Mock } from 'vitest';

import { WorkflowReviewRequest } from '../../entities/workflow-review-request.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowReviewRequestRepository } from '../workflow-review-request.repository';

describe('WorkflowReviewRequestRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequest);
	const repo = Container.get(WorkflowReviewRequestRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('createRequest', () => {
		it('persists an open pending request with audit fields initialised', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequest,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createRequest({
				id: 'req-1',
				projectId: 'proj-1',
				title: 'Review title',
				description: 'Optional description',
				createdById: 'user-1',
			});

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				id: 'req-1',
				projectId: 'proj-1',
				state: 'open',
				decision: 'pending',
				title: 'Review title',
				description: 'Optional description',
				createdById: 'user-1',
				updatedById: 'user-1',
				closedById: null,
				approvedAt: null,
			});
		});

		it('uses the explicit updatedById when provided', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequest,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createRequest({
				projectId: 'proj-1',
				title: 'Review title',
				createdById: 'user-1',
				updatedById: 'user-2',
			});

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				updatedById: 'user-2',
			});
		});
	});

	describe('findById', () => {
		it('returns the request when one exists', async () => {
			const row = { id: 'req-1' } as WorkflowReviewRequest;
			entityManager.findOne.mockResolvedValueOnce(row);

			expect(await repo.findById('req-1')).toBe(row);
		});
	});
});
