import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { type PollerCursor, PollerStateRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

describe('PollerStateRepository', () => {
	let repository: PollerStateRepository;
	let workflowRepository: WorkflowRepository;
	let workflowId: string;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(PollerStateRepository);
		workflowRepository = Container.get(WorkflowRepository);
		({ id: workflowId } = await createWorkflow());
	});

	beforeEach(async () => {
		await testDb.truncate(['PollerState']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const seed = async (nodeId: string, cursor: PollerCursor, ofWorkflow = workflowId) =>
		// TypeORM's insert type deep-partialises the JSON column into a shape a plain
		// `Record<string, unknown>` cannot satisfy.
		await repository.insert({
			workflowId: ofWorkflow,
			nodeId,
			cursor: cursor as Record<string, object>,
		});

	describe('findCursor', () => {
		it('returns null for a node that has never polled', async () => {
			expect(await repository.findCursor(workflowId, 'node-1')).toBeNull();
		});

		it('distinguishes an empty cursor from a missing one', async () => {
			await seed('node-1', {});

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({});
		});

		// The cursor column is `json` on Postgres but `text` on SQLite, so the two
		// dialects reach the same value by different routes.
		it('returns a stored cursor unchanged', async () => {
			const cursor = {
				lastTimeChecked: '2026-07-28T10:00:00.000Z',
				possibleDuplicates: ['id-1', 'id-2'],
			};
			await seed('node-1', cursor);

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual(cursor);
		});
	});

	describe('table constraints', () => {
		it('keeps the cursors of two nodes in the same workflow separate', async () => {
			await seed('node-1', { lastItemId: 'a' });
			await seed('node-2', { lastItemId: 'b' });

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
			expect(await repository.findCursor(workflowId, 'node-2')).toEqual({ lastItemId: 'b' });
		});

		it('keeps the cursors of one node id in two workflows separate', async () => {
			const { id: otherWorkflowId } = await createWorkflow();
			await seed('node-1', { lastItemId: 'a' });
			await seed('node-1', { lastItemId: 'b' }, otherWorkflowId);

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
			expect(await repository.findCursor(otherWorkflowId, 'node-1')).toEqual({ lastItemId: 'b' });
		});

		it('rejects a second row for the same workflow and node', async () => {
			await seed('node-1', { lastItemId: 'a' });

			await expect(seed('node-1', { lastItemId: 'b' })).rejects.toThrow();
			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
		});

		it('rejects a cursor for a workflow that does not exist', async () => {
			await expect(seed('node-1', { lastItemId: 'a' }, 'does-not-exist')).rejects.toThrow();
			expect(await repository.findCursor('does-not-exist', 'node-1')).toBeNull();
		});

		it("drops a workflow's cursors when the workflow is deleted", async () => {
			const { id: doomedWorkflowId } = await createWorkflow();
			await seed('node-1', { lastItemId: 'a' }, doomedWorkflowId);
			await seed('node-2', { lastItemId: 'b' }, doomedWorkflowId);

			await workflowRepository.delete({ id: doomedWorkflowId });

			expect(await repository.findCursor(doomedWorkflowId, 'node-1')).toBeNull();
			expect(await repository.findCursor(doomedWorkflowId, 'node-2')).toBeNull();
		});
	});
});
