import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import {
	type PollerCursor,
	PollerStateRepository,
	TransactionRunner,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

describe('PollerStateRepository', () => {
	let repository: PollerStateRepository;
	let workflowRepository: WorkflowRepository;
	let txRunner: TransactionRunner;
	let workflowId: string;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(PollerStateRepository);
		workflowRepository = Container.get(WorkflowRepository);
		({ id: workflowId } = await createWorkflow());
		txRunner = Container.get(TransactionRunner);
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

	const readRow = async (nodeId: string) =>
		await repository.findOneOrFail({ where: { workflowId, nodeId } });

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

	describe('getOrCreateCursor', () => {
		it('creates the row with the given cursor and returns it', async () => {
			const cursor = await repository.getOrCreateCursor(
				workflowId,
				'node-1',
				{ lastTimeChecked: '2026-07-28' },
				{},
			);

			expect(cursor).toEqual({ lastTimeChecked: '2026-07-28' });
		});

		it('returns the stored cursor rather than the starting value when a row exists', async () => {
			await repository.getOrCreateCursor(workflowId, 'node-1', { lastItemId: 'first' }, {});

			const cursor = await repository.getOrCreateCursor(
				workflowId,
				'node-1',
				{ lastItemId: 'second' },
				{},
			);

			expect(cursor).toEqual({ lastItemId: 'first' });
		});

		it('returns one shared cursor when two callers race to create the row', async () => {
			const [first, second] = await Promise.all([
				repository.getOrCreateCursor(workflowId, 'node-1', { lastItemId: 'a' }, {}),
				repository.getOrCreateCursor(workflowId, 'node-1', { lastItemId: 'b' }, {}),
			]);

			expect([{ lastItemId: 'a' }, { lastItemId: 'b' }]).toContainEqual(first);
			expect(second).toEqual(first);
		});

		it('discards the new row when the surrounding transaction rolls back', async () => {
			await expect(
				txRunner.run({}, async (ctx) => {
					await repository.getOrCreateCursor(workflowId, 'node-1', { lastItemId: 'a' }, ctx);
					throw new Error('execution insert failed');
				}),
			).rejects.toThrow('execution insert failed');

			expect(await repository.findCursor(workflowId, 'node-1')).toBeNull();
		});
	});

	describe('advanceCursor', () => {
		it('replaces the cursor', async () => {
			await seed('node-1', { lastItemId: 'a' });

			await repository.advanceCursor(workflowId, 'node-1', { lastItemId: 'b' }, {});

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'b' });
		});

		it('moves updatedAt forward', async () => {
			await seed('node-1', { lastItemId: 'a' });
			// Backdated because the column's precision is coarser than the gap between
			// two statements issued back to back.
			const backdated = new Date(Date.now() - 60_000);
			await repository.update({ workflowId, nodeId: 'node-1' }, { updatedAt: backdated });

			await repository.advanceCursor(workflowId, 'node-1', { lastItemId: 'b' }, {});

			const { updatedAt } = await readRow('node-1');
			expect(updatedAt.getTime()).toBeGreaterThan(backdated.getTime());
		});

		it('throws when the node has no cursor row', async () => {
			await expect(
				repository.advanceCursor(workflowId, 'node-1', { lastItemId: 'a' }, {}),
			).rejects.toThrow('Poller cursor row disappeared');
		});

		it('commits the new cursor with the surrounding transaction', async () => {
			await seed('node-1', { lastItemId: 'a' });

			await txRunner.run({}, async (ctx) => {
				await repository.advanceCursor(workflowId, 'node-1', { lastItemId: 'b' }, ctx);
			});

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'b' });
		});

		it('discards the advance when the surrounding transaction rolls back', async () => {
			await seed('node-1', { lastItemId: 'a' });

			await expect(
				txRunner.run({}, async (ctx) => {
					await repository.advanceCursor(workflowId, 'node-1', { lastItemId: 'b' }, ctx);
					throw new Error('execution insert failed');
				}),
			).rejects.toThrow('execution insert failed');

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
		});
	});
});
