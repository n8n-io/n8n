import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { ActivityEventRepository, activityDataMaxLength } from '@n8n/db';
import { Container } from '@n8n/di';

describe('ActivityEventRepository', () => {
	let repository: ActivityEventRepository;
	let project: Project;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(ActivityEventRepository);
		project = await createTeamProject();
	});
	afterEach(async () => await testDb.truncate(['ActivityEvent']));
	afterAll(async () => await testDb.terminate());

	/**
	 * The entity was once exported and migrated but left out of the `entities` collection, so the
	 * DataSource had no metadata for it and every write threw with no rows written. Registration is
	 * only provable by writing through the repository and reading the row back.
	 */
	it('persists a written entry and reads it back', async () => {
		await repository.record({
			category: 'workflow',
			action: 'saved',
			projectId: project.id,
			resourceType: 'workflow',
			resourceId: 'workflow-1',
			resourceName: 'Lead enrichment',
			data: { nodeCount: 4 },
		});

		const [entry] = await repository.findFeed({ projectIds: [project.id], limit: 10 });

		expect(entry).toMatchObject({
			category: 'workflow',
			action: 'saved',
			projectId: project.id,
			resourceType: 'workflow',
			resourceId: 'workflow-1',
			resourceName: 'Lead enrichment',
			data: { nodeCount: 4 },
			typeVersion: 1,
		});
		expect(entry.id).toEqual(expect.any(Number));
		expect(entry.createdAt).toBeInstanceOf(Date);
	});

	it('stores an entry pointing at a resource that does not exist, so entries outlive it', async () => {
		await repository.record({
			category: 'workflow',
			action: 'deleted',
			projectId: project.id,
			resourceType: 'workflow',
			resourceId: 'already-gone',
			resourceName: 'Lead enrichment',
		});

		const [entry] = await repository.findFeed({ projectIds: [project.id], limit: 10 });

		expect(entry).toMatchObject({ action: 'deleted', resourceId: 'already-gone' });
	});

	it('replaces oversized detail with a marker on the way into the column', async () => {
		await repository.record({
			category: 'execution',
			action: 'failed',
			projectId: project.id,
			data: { error: 'y'.repeat(activityDataMaxLength) },
		});

		const [entry] = await repository.findFeed({ projectIds: [project.id], limit: 10 });

		expect(entry.data).toEqual({ truncated: true });
	});

	describe('retention', () => {
		it('deletes entries older than the cutoff and keeps the rest', async () => {
			await repository.record({ category: 'workflow', action: 'old', projectId: project.id });
			await repository.record({ category: 'workflow', action: 'recent', projectId: project.id });

			// Newest first, so the second row is the one written first.
			const [newest, oldest] = await repository.findFeed({
				projectIds: [project.id],
				limit: 10,
			});
			// `createdAt` defaults to now for both, so age one row explicitly rather than
			// depending on sub-millisecond ordering.
			const cutoff = new Date(Date.now() - 60_000);
			await repository.update(oldest.id, { createdAt: new Date(cutoff.getTime() - 60_000) });

			const deleted = await repository.deleteOlderThan(cutoff);

			expect(deleted).toBe(1);
			const remaining = await repository.findFeed({ projectIds: [project.id], limit: 10 });
			expect(remaining.map((entry) => entry.id)).toEqual([newest.id]);
		});

		// The sweep deletes a bounded batch at a time, so a backlog larger than one batch only
		// drains if the loop keeps going. A single unbounded DELETE would pass this too; a loop
		// that stopped after one pass would not.
		it('drains a backlog larger than one batch', async () => {
			const entries = Array.from({ length: 601 }, (_, i) => ({
				category: 'execution' as const,
				action: `run-${i}`,
				projectId: project.id,
				typeVersion: 1,
			}));
			await repository.insert(entries);

			const deleted = await repository.deleteOlderThan(new Date(Date.now() + 60_000));

			expect(deleted).toBe(601);
			expect(await repository.count()).toBe(0);
		});

		it('keeps only the newest entries when the count backstop trips', async () => {
			for (const action of ['first', 'second', 'third']) {
				await repository.record({ category: 'workflow', action, projectId: project.id });
			}

			const deleted = await repository.deleteBeyondNewest(2);

			expect(deleted).toBe(1);
			const remaining = await repository.findFeed({ projectIds: [project.id], limit: 10 });
			expect(remaining.map((entry) => entry.action)).toEqual(['third', 'second']);
		});
	});
});
