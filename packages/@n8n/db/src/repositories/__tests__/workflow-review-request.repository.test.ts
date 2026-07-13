import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';
import type { Mock } from 'vitest';

import { WorkflowReviewRequestReviewer } from '../../entities/workflow-review-request-reviewer.ee';
import { WorkflowReviewRequestWorkflow } from '../../entities/workflow-review-request-workflow.ee';
import { WorkflowReviewRequest } from '../../entities/workflow-review-request.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { WorkflowReviewRequestReviewerRepository } from '../workflow-review-request-reviewer.repository';
import { WorkflowReviewRequestWorkflowRepository } from '../workflow-review-request-workflow.repository';
import { WorkflowReviewRequestRepository } from '../workflow-review-request.repository';

describe('WorkflowReviewRequestRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequest);
	const repo = Container.get(WorkflowReviewRequestRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('createRequest', () => {
		it('persists a pending request with audit and publish fields initialised', async () => {
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
				status: 'pending',
				title: 'Review title',
				description: 'Optional description',
				createdById: 'user-1',
				updatedById: 'user-1',
				archivedById: null,
				archivedAt: null,
				publishError: null,
				publishErrorAt: null,
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

describe('WorkflowReviewRequestWorkflowRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequestWorkflow);
	const repo = Container.get(WorkflowReviewRequestWorkflowRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('createWorkflowRow', () => {
		it('persists a child row with the pinned workflow version', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestWorkflow,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createWorkflowRow({
				id: 'child-1',
				workflowReviewRequestId: 'req-1',
				workflowId: 'wf-1',
				workflowVersionId: 'ver-1',
			});

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				id: 'child-1',
				workflowReviewRequestId: 'req-1',
				workflowId: 'wf-1',
				workflowVersionId: 'ver-1',
			});
		});

		it('allows a null workflowVersionId for future git-backed reviews', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestWorkflow,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createWorkflowRow({
				workflowReviewRequestId: 'req-1',
				workflowId: 'wf-1',
			});

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				workflowVersionId: null,
			});
		});
	});

	describe('findByRequestId', () => {
		it('returns child rows ordered by id ascending', async () => {
			const rows = [{ id: 'child-1' }] as WorkflowReviewRequestWorkflow[];
			entityManager.find.mockResolvedValueOnce(rows);

			expect(await repo.findByRequestId('req-1')).toBe(rows);
			const callArgs = entityManager.find.mock.calls[0];
			expect(callArgs?.[1]).toEqual({
				where: { workflowReviewRequestId: 'req-1' },
				order: { id: 'ASC' },
			});
		});
	});
});

describe('WorkflowReviewRequestReviewerRepository', () => {
	const entityManager = mockEntityManager(WorkflowReviewRequestReviewer);
	const repo = Container.get(WorkflowReviewRequestReviewerRepository);

	beforeEach(() => {
		vi.resetAllMocks();
		entityManager.transaction.mockImplementation(async (fn: unknown) => {
			return await (fn as (em: typeof entityManager) => Promise<unknown>)(entityManager);
		});
	});

	describe('setReviewers', () => {
		it('replaces the notify list for the request in a transaction', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as WorkflowReviewRequestReviewer,
			);
			entityManager.save.mockResolvedValueOnce([
				{ workflowReviewRequestId: 'req-1', userId: 'user-1' },
				{ workflowReviewRequestId: 'req-1', userId: 'user-2' },
			]);

			const result = await repo.setReviewers('req-1', ['user-1', 'user-2', 'user-1']);

			expect(entityManager.transaction).toHaveBeenCalled();
			expect(entityManager.delete).toHaveBeenCalledWith(WorkflowReviewRequestReviewer, {
				workflowReviewRequestId: 'req-1',
			});
			expect(entityManager.save).toHaveBeenCalledTimes(1);
			expect(result).toHaveLength(2);
		});

		it('clears the notify list and returns an empty array when given no reviewers', async () => {
			const result = await repo.setReviewers('req-1', []);

			expect(entityManager.delete).toHaveBeenCalledWith(WorkflowReviewRequestReviewer, {
				workflowReviewRequestId: 'req-1',
			});
			expect(entityManager.save).not.toHaveBeenCalled();
			expect(result).toEqual([]);
		});
	});

	describe('findByRequestId', () => {
		it('scopes the lookup to the request id', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repo.findByRequestId('req-1');

			const callArgs = entityManager.find.mock.calls[0];
			expect(callArgs?.[1]).toEqual({
				where: { workflowReviewRequestId: 'req-1' },
				order: { id: 'ASC' },
			});
		});
	});

	describe('findByRequestIds', () => {
		it('queries reviewers for the given request ids', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repo.findByRequestIds(['req-1', 'req-2']);

			const callArgs = entityManager.find.mock.calls[0];
			expect(callArgs?.[1]).toEqual({
				where: { workflowReviewRequestId: In(['req-1', 'req-2']) },
				order: { id: 'ASC' },
			});
		});
	});
});
