import { Container } from '@n8n/di';
import { And, In, LessThan, MoreThan } from '@n8n/typeorm';

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

	describe('deleteOlderThan', () => {
		it('deletes every entry written before the cutoff', async () => {
			const cutoff = new Date('2026-08-01T00:00:00.000Z');
			entityManager.delete.mockResolvedValueOnce({ affected: 12, raw: [] });

			const deleted = await repository.deleteOlderThan(cutoff);

			expect(entityManager.delete).toHaveBeenCalledWith(ActivityEvent, {
				createdAt: LessThan(cutoff),
			});
			expect(deleted).toBe(12);
		});

		it('reports nothing deleted when the driver does not count affected rows', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: null, raw: [] });

			const deleted = await repository.deleteOlderThan(new Date());

			expect(deleted).toBe(0);
		});
	});

	describe('deleteBeyondNewest', () => {
		it('deletes below the oldest entry worth keeping', async () => {
			entityManager.find.mockResolvedValueOnce([{ id: 120 } as ActivityEvent]);
			entityManager.delete.mockResolvedValueOnce({ affected: 7, raw: [] });

			const deleted = await repository.deleteBeyondNewest(500);

			expect(entityManager.find).toHaveBeenCalledWith(ActivityEvent, {
				order: { id: 'DESC' },
				skip: 499,
				take: 1,
				select: { id: true },
			});
			expect(entityManager.delete).toHaveBeenCalledWith(ActivityEvent, { id: LessThan(120) });
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
