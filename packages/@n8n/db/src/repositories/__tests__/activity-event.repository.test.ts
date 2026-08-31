import { Container } from '@n8n/di';
import { And, In, LessThan, LessThanOrEqual, MoreThan } from '@n8n/typeorm';

import { ActivityEvent } from '../../entities';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import {
	activityDataMaxLength,
	activityResourceNameMaxLength,
	ActivityEventRepository,
} from '../activity-event.repository';

describe('ActivityEventRepository', () => {
	const entityManager = mockEntityManager(ActivityEvent);
	const repository = Container.get(ActivityEventRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('record', () => {
		it('fills the nullable pointer fields so a row shape is never partial', async () => {
			await repository.record({ category: 'workflow', action: 'deleted' });

			expect(entityManager.insert).toHaveBeenCalledWith(ActivityEvent, {
				category: 'workflow',
				action: 'deleted',
				userId: null,
				projectId: null,
				resourceType: null,
				resourceId: null,
				resourceName: null,
				data: null,
			});
		});

		it('truncates a resource name too long to belong in a list', async () => {
			await repository.record({
				category: 'workflow',
				action: 'saved',
				resourceName: 'x'.repeat(activityResourceNameMaxLength + 50),
			});

			expect(entityManager.insert).toHaveBeenCalledWith(
				ActivityEvent,
				expect.objectContaining({
					resourceName: 'x'.repeat(activityResourceNameMaxLength),
				}),
			);
		});

		it('replaces oversized detail with a marker rather than storing half of it', async () => {
			await repository.record({
				category: 'execution',
				action: 'failed',
				data: { error: 'y'.repeat(activityDataMaxLength) },
			});

			expect(entityManager.insert).toHaveBeenCalledWith(
				ActivityEvent,
				expect.objectContaining({ data: { truncated: true } }),
			);
		});

		it('keeps detail that fits', async () => {
			await repository.record({
				category: 'execution',
				action: 'failed',
				data: { failedNode: 'HTTP Request' },
			});

			expect(entityManager.insert).toHaveBeenCalledWith(
				ActivityEvent,
				expect.objectContaining({ data: { failedNode: 'HTTP Request' } }),
			);
		});
	});

	describe('findFeed', () => {
		it('reads newest first, which is both the render order and the index order', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repository.findFeed({ projectIds: ['project1'], limit: 30 });

			expect(entityManager.find).toHaveBeenCalledWith(ActivityEvent, {
				where: { projectId: In(['project1']) },
				order: { id: 'DESC' },
				take: 30,
			});
		});

		it('reads nothing at all when the caller may see no project', async () => {
			const entries = await repository.findFeed({ projectIds: [], limit: 30 });

			expect(entries).toEqual([]);
			expect(entityManager.find).not.toHaveBeenCalled();
		});

		it('combines both id bounds instead of letting one overwrite the other', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repository.findFeed({
				projectIds: ['project1'],
				limit: 10,
				afterId: 5,
				beforeId: 40,
			});

			expect(entityManager.find).toHaveBeenCalledWith(ActivityEvent, {
				where: { projectId: In(['project1']), id: And(MoreThan(5), LessThan(40)) },
				order: { id: 'DESC' },
				take: 10,
			});
		});
	});

	describe('limits', () => {
		it.each([0, -1, 1.5])(
			'reads nothing for a limit of %s rather than the whole table',
			async (limit) => {
				const entries = await repository.findFeed({ projectIds: ['project1'], limit });

				expect(entries).toEqual([]);
				expect(entityManager.find).not.toHaveBeenCalled();
			},
		);

		it('reads nothing from a resource history asked for a zero limit', async () => {
			const entries = await repository.findByResource('workflow', 'workflow1', 0);

			expect(entries).toEqual([]);
			expect(entityManager.find).not.toHaveBeenCalled();
		});
	});

	describe('deleteOlderThan', () => {
		const cutoff = new Date('2026-08-01T00:00:00.000Z');

		it('deletes up to the end of a batch, bounded by the cutoff', async () => {
			entityManager.find.mockResolvedValueOnce([{ id: 40 } as ActivityEvent]);
			entityManager.delete.mockResolvedValueOnce({ affected: 12, raw: [] });

			const deleted = await repository.deleteOlderThan(cutoff);

			expect(entityManager.delete).toHaveBeenCalledWith(ActivityEvent, {
				id: LessThanOrEqual(40),
				createdAt: LessThan(cutoff),
			});
			expect(deleted).toBe(12);
		});

		it('keeps sweeping while a batch comes back full, so a backlog drains', async () => {
			const fullBatch = Array.from({ length: 500 }, (_, i) => ({ id: i + 1 }) as ActivityEvent);
			entityManager.find
				.mockResolvedValueOnce(fullBatch)
				.mockResolvedValueOnce([{ id: 501 } as ActivityEvent]);
			entityManager.delete
				.mockResolvedValueOnce({ affected: 500, raw: [] })
				.mockResolvedValueOnce({ affected: 1, raw: [] });

			const deleted = await repository.deleteOlderThan(cutoff);

			expect(entityManager.delete).toHaveBeenCalledTimes(2);
			expect(deleted).toBe(501);
		});

		it('stops without deleting when nothing is old enough', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			const deleted = await repository.deleteOlderThan(cutoff);

			expect(entityManager.delete).not.toHaveBeenCalled();
			expect(deleted).toBe(0);
		});

		it('reports nothing deleted when the driver does not count affected rows', async () => {
			entityManager.find.mockResolvedValueOnce([{ id: 40 } as ActivityEvent]);
			entityManager.delete.mockResolvedValueOnce({ affected: null, raw: [] });

			const deleted = await repository.deleteOlderThan(cutoff);

			expect(deleted).toBe(0);
		});
	});

	describe('deleteBeyondNewest', () => {
		it('deletes below the oldest entry worth keeping', async () => {
			entityManager.find
				.mockResolvedValueOnce([{ id: 120 } as ActivityEvent])
				.mockResolvedValueOnce([{ id: 113 } as ActivityEvent]);
			entityManager.delete.mockResolvedValueOnce({ affected: 7, raw: [] });

			const deleted = await repository.deleteBeyondNewest(500);

			expect(entityManager.find).toHaveBeenNthCalledWith(1, ActivityEvent, {
				order: { id: 'DESC' },
				skip: 499,
				take: 1,
				select: { id: true },
			});
			// Scoped to everything below the boundary, then deleted a batch at a time.
			expect(entityManager.find).toHaveBeenNthCalledWith(2, ActivityEvent, {
				where: { id: LessThan(120) },
				order: { id: 'ASC' },
				take: 500,
				select: { id: true },
			});
			expect(entityManager.delete).toHaveBeenCalledWith(ActivityEvent, {
				id: LessThanOrEqual(113),
			});
			expect(deleted).toBe(7);
		});

		it('deletes everything when the cap is zero, rather than asking for a negative offset', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 3, raw: [] });

			const deleted = await repository.deleteBeyondNewest(0);

			expect(entityManager.find).not.toHaveBeenCalled();
			expect(entityManager.delete).toHaveBeenCalledWith(ActivityEvent, {});
			expect(deleted).toBe(3);
		});

		it('does nothing when the table holds fewer entries than the cap', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			const deleted = await repository.deleteBeyondNewest(500);

			expect(entityManager.delete).not.toHaveBeenCalled();
			expect(deleted).toBe(0);
		});
	});
});
