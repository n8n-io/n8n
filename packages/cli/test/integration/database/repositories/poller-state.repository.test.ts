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
		txRunner = Container.get(TransactionRunner);
	});

	beforeEach(async () => {
		await testDb.truncate(['PollerState', 'WorkflowEntity']);
		({ id: workflowId } = await createWorkflow());
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const readRow = async (nodeId: string) =>
		await repository.findOneOrFail({ where: { workflowId, nodeId } });

	const seed = async (nodeId: string, cursor: PollerCursor) =>
		await repository.ensureCursor(workflowId, nodeId, cursor, {});

	describe('findCursor', () => {
		it('returns null for a node that has never polled', async () => {
			expect(await repository.findCursor(workflowId, 'node-1')).toBeNull();
		});

		it('distinguishes an empty cursor from a missing one', async () => {
			await seed('node-1', {});

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({});
		});

		it('keeps the cursors of two nodes in the same workflow separate', async () => {
			await seed('node-1', { lastItemId: 'a' });
			await seed('node-2', { lastItemId: 'b' });

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual({ lastItemId: 'a' });
			expect(await repository.findCursor(workflowId, 'node-2')).toEqual({ lastItemId: 'b' });
		});

		it('round-trips nested objects, arrays and unicode', async () => {
			const cursor = {
				lastTimeChecked: '2026-07-28T10:00:00.000Z',
				possibleDuplicates: ['id-1', 'id-2'],
				page: { token: 'ünïcödé 🎉', depth: 3 },
				empty: [],
			};
			await seed('node-1', cursor);

			expect(await repository.findCursor(workflowId, 'node-1')).toEqual(cursor);
		});
	});

	describe('ensureCursor', () => {
		it('creates the row with the given cursor and returns it', async () => {
			const cursor = await repository.ensureCursor(
				workflowId,
				'node-1',
				{ lastTimeChecked: '2026-07-28' },
				{},
			);

			expect(cursor).toEqual({ lastTimeChecked: '2026-07-28' });
		});

		it('returns the stored cursor rather than the starting value when a row exists', async () => {
			await repository.ensureCursor(workflowId, 'node-1', { lastItemId: 'first' }, {});

			const cursor = await repository.ensureCursor(
				workflowId,
				'node-1',
				{ lastItemId: 'second' },
				{},
			);

			expect(cursor).toEqual({ lastItemId: 'first' });
		});

		it('returns one shared cursor when two callers race to create the row', async () => {
			const [first, second] = await Promise.all([
				repository.ensureCursor(workflowId, 'node-1', { lastItemId: 'a' }, {}),
				repository.ensureCursor(workflowId, 'node-1', { lastItemId: 'b' }, {}),
			]);

			expect([{ lastItemId: 'a' }, { lastItemId: 'b' }]).toContainEqual(first);
			expect(second).toEqual(first);
		});

		it('discards the new row when the surrounding transaction rolls back', async () => {
			await expect(
				txRunner.run({}, async (ctx) => {
					await repository.ensureCursor(workflowId, 'node-1', { lastItemId: 'a' }, ctx);
					throw new Error('execution insert failed');
				}),
			).rejects.toThrow('execution insert failed');

			expect(await repository.findCursor(workflowId, 'node-1')).toBeNull();
		});

		it('rejects a cursor for a workflow that does not exist', async () => {
			await expect(
				repository.ensureCursor('does-not-exist', 'node-1', { lastItemId: 'a' }, {}),
			).rejects.toThrow();
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

	describe('deleting rows', () => {
		it('drops one node without touching its siblings', async () => {
			await seed('node-1', { lastItemId: 'a' });
			await seed('node-2', { lastItemId: 'b' });

			await repository.deleteNode(workflowId, 'node-1', {});

			expect(await repository.findCursor(workflowId, 'node-1')).toBeNull();
			expect(await repository.findCursor(workflowId, 'node-2')).toEqual({ lastItemId: 'b' });
		});

		it('ignores a node that has no cursor row', async () => {
			await expect(repository.deleteNode(workflowId, 'node-1', {})).resolves.toBeUndefined();
		});

		it('drops every node of one workflow', async () => {
			await seed('node-1', { lastItemId: 'a' });
			await seed('node-2', { lastItemId: 'b' });

			await repository.deleteByWorkflowId(workflowId, {});

			expect(await repository.findCursor(workflowId, 'node-1')).toBeNull();
			expect(await repository.findCursor(workflowId, 'node-2')).toBeNull();
		});

		it("drops a workflow's cursors when the workflow is deleted", async () => {
			await seed('node-1', { lastItemId: 'a' });

			await workflowRepository.delete({ id: workflowId });

			expect(await repository.findCursor(workflowId, 'node-1')).toBeNull();
		});
	});
});
