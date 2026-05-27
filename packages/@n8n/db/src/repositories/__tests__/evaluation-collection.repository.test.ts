import { Container } from '@n8n/di';

import { EvaluationCollection } from '../../entities/evaluation-collection.ee';
import { TestRun } from '../../entities/test-run.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { EvaluationCollectionRepository } from '../evaluation-collection.repository';

describe('EvaluationCollectionRepository', () => {
	const entityManager = mockEntityManager(EvaluationCollection);
	const repo = Container.get(EvaluationCollectionRepository);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('createCollection', () => {
		it('persists the collection with insightsCache initialised to null', async () => {
			(entityManager.create as jest.Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as EvaluationCollection,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createCollection({
				id: 'col-1',
				name: 'C',
				description: null,
				workflowId: 'wf-1',
				evaluationConfigId: 'cfg-1',
				createdById: 'user-1',
			});

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				id: 'col-1',
				name: 'C',
				description: null,
				workflowId: 'wf-1',
				evaluationConfigId: 'cfg-1',
				createdById: 'user-1',
				insightsCache: null,
			});
		});
	});

	describe('findByIdAndWorkflowId', () => {
		it('scopes the lookup to the route workflowId so foreign-workflow ids 404 the same as missing ids', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			const result = await repo.findByIdAndWorkflowId('col-x', 'wf-1');

			expect(result).toBeNull();
			const callArgs = entityManager.findOne.mock.calls[0];
			expect(callArgs?.[1]).toEqual({ where: { id: 'col-x', workflowId: 'wf-1' } });
		});
	});

	describe('listByWorkflowId', () => {
		it('joins runCount onto each collection with one aggregate query', async () => {
			const collections = [
				{ id: 'col-a', workflowId: 'wf-1', createdAt: new Date() },
				{ id: 'col-b', workflowId: 'wf-1', createdAt: new Date() },
			] as EvaluationCollection[];
			entityManager.find.mockResolvedValueOnce(collections);
			const qb = {
				select: jest.fn().mockReturnThis(),
				addSelect: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				groupBy: jest.fn().mockReturnThis(),
				getRawMany: jest.fn().mockResolvedValueOnce([
					{ collectionId: 'col-a', count: '3' },
					{ collectionId: 'col-b', count: '0' },
				]),
			};
			entityManager.createQueryBuilder.mockReturnValueOnce(qb as never);

			const result = await repo.listByWorkflowId('wf-1');

			expect(entityManager.createQueryBuilder).toHaveBeenCalledTimes(1);
			expect(result.map((c) => c.runCount)).toEqual([3, 0]);
		});

		it('returns an empty array without an aggregate query when no collections exist', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			const result = await repo.listByWorkflowId('wf-1');

			expect(result).toEqual([]);
			expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
		});
	});

	describe('addRunsToCollection', () => {
		it('updates TestRun.collectionId in bulk by id', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 2, generatedMaps: [], raw: [] });

			await repo.addRunsToCollection('col-1', ['tr-a', 'tr-b']);

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[0]).toBe(TestRun);
			expect(callArgs?.[2]).toEqual({ collectionId: 'col-1' });
		});

		it('is a no-op when given an empty id list', async () => {
			await repo.addRunsToCollection('col-1', []);
			expect(entityManager.update).not.toHaveBeenCalled();
		});
	});

	describe('removeRunFromCollection', () => {
		it('only unlinks runs that are actually in the named collection', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			const affected = await repo.removeRunFromCollection('col-1', 'tr-a');

			expect(affected).toBe(1);
			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[1]).toEqual({ id: 'tr-a', collectionId: 'col-1' });
			expect(callArgs?.[2]).toEqual({ collectionId: null });
		});

		it('returns 0 when the run is not part of the collection', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 0, generatedMaps: [], raw: [] });

			expect(await repo.removeRunFromCollection('col-1', 'tr-missing')).toBe(0);
		});
	});

	describe('deleteByIdAndWorkflowId', () => {
		it('counts runs before delete so callers can report runs_unlinked for telemetry', async () => {
			entityManager.findOne.mockResolvedValueOnce({ id: 'col-1' } as EvaluationCollection);
			entityManager.count.mockResolvedValueOnce(4);
			entityManager.delete.mockResolvedValueOnce({ affected: 1, raw: [] });

			const result = await repo.deleteByIdAndWorkflowId('col-1', 'wf-1');

			expect(result).toEqual({ deleted: true, runsUnlinked: 4 });
		});

		it('returns { deleted: false } without touching delete when the collection does not exist', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			const result = await repo.deleteByIdAndWorkflowId('col-missing', 'wf-1');

			expect(result).toEqual({ deleted: false, runsUnlinked: 0 });
			expect(entityManager.delete).not.toHaveBeenCalled();
		});
	});

	describe('updateInsightsCache', () => {
		it('updates the insightsCache JSON column on the row', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.updateInsightsCache('col-1', { winner: { versionLabel: 'A' } } as never);

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[1]).toBe('col-1');
			expect(callArgs?.[2]).toEqual({ insightsCache: { winner: { versionLabel: 'A' } } });
		});

		it('accepts null to clear the cache', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 1, generatedMaps: [], raw: [] });

			await repo.updateInsightsCache('col-1', null);

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[2]).toEqual({ insightsCache: null });
		});
	});

	describe('updateMeta', () => {
		it('returns null without writing when the collection does not exist', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);

			const result = await repo.updateMeta('col-x', 'wf-1', { name: 'New' });

			expect(result).toBeNull();
			expect(entityManager.save).not.toHaveBeenCalled();
		});

		it('merges name + description onto the existing entity', async () => {
			const existing = {
				id: 'col-1',
				name: 'Old',
				description: 'old desc',
				workflowId: 'wf-1',
			} as EvaluationCollection;
			entityManager.findOne.mockResolvedValueOnce(existing);
			(entityManager.create as jest.Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as EvaluationCollection,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.updateMeta('col-1', 'wf-1', { name: 'New', description: null });

			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				id: 'col-1',
				name: 'New',
				description: null,
			});
		});

		it('preserves description when only name is provided', async () => {
			const existing = {
				id: 'col-1',
				name: 'Old',
				description: 'old desc',
				workflowId: 'wf-1',
			} as EvaluationCollection;
			entityManager.findOne.mockResolvedValueOnce(existing);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.updateMeta('col-1', 'wf-1', { name: 'New' });

			const savedEntity = entityManager.save.mock.calls[0]?.[1] as EvaluationCollection;
			expect(savedEntity.name).toBe('New');
			expect(savedEntity.description).toBe('old desc');
		});

		it('preserves existing fields when payload props are undefined', async () => {
			const existing = {
				id: 'col-1',
				name: 'Old',
				description: 'old desc',
				workflowId: 'wf-1',
			} as EvaluationCollection;
			entityManager.findOne.mockResolvedValueOnce(existing);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.updateMeta('col-1', 'wf-1', { name: undefined, description: undefined });

			const savedEntity = entityManager.save.mock.calls[0]?.[1] as EvaluationCollection;
			expect(savedEntity.name).toBe('Old');
			expect(savedEntity.description).toBe('old desc');
		});
	});
});
