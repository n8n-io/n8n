import { testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

import { LedgerCheckBypass, unknownOutcomeRow } from '../../../__tests__/ledger-check-bypass';
import { ledgerRow } from '../../../__tests__/ledger-rows';
import { ExecutionLedgerRepository } from '../execution-ledger.repository';

describe('ExecutionLedgerRepository', () => {
	let repository: ExecutionLedgerRepository;
	let txRunner: TransactionRunner;
	let bypass: LedgerCheckBypass;

	const claim = async (limit: number) =>
		await txRunner.run({}, async (ctx) => (await repository.claimBatch(limit, ctx)).rows);

	const appendMany = async (count: number) => {
		for (let i = 0; i < count; i++) {
			await repository.append(ledgerRow({ executionId: `exec-${i}` }), {});
		}
	};

	beforeAll(async () => {
		await testModules.loadModules(['execution-ledger'], {
			'execution-ledger': async () => await import('../../../execution-ledger.module.js'),
		});
		await testDb.init();
		repository = Container.get(ExecutionLedgerRepository);
		txRunner = Container.get(TransactionRunner);
		bypass = new LedgerCheckBypass();
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionLedgerEntity']);
	});

	afterEach(async () => {
		await bypass.restore();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('returns every field of an appended row', async () => {
		const row = ledgerRow();
		await repository.append(row, {});

		const [claimed] = await claim(10);

		expect(claimed).toEqual({ ...row, id: expect.any(String) });
		expect(claimed.occurredAt.getTime()).toBe(row.occurredAt.getTime());
	});

	it('returns a blocked ended row', async () => {
		const row = ledgerRow({
			event: 'ended',
			outcome: 'blocked',
			blockedBy: 'policy',
			runtimeMs: 42,
			timeSavedMin: 3,
			source: 'instance_ai',
		});
		await repository.append(row, {});

		expect(await claim(10)).toEqual([{ ...row, id: expect.any(String) }]);
	});

	it('returns a null project for a row with no project', async () => {
		await repository.append(ledgerRow({ projectId: null }), {});

		const [claimed] = await claim(10);

		expect(claimed.projectId).toBeNull();
	});

	it('claims the oldest rows in id order and leaves the rest', async () => {
		await appendMany(5);

		const first = await claim(2);
		const rest = await claim(10);

		expect(first.map((r) => r.executionId)).toEqual(['exec-0', 'exec-1']);
		expect(rest.map((r) => r.executionId)).toEqual(['exec-2', 'exec-3', 'exec-4']);
		expect(Number(first[1].id)).toBeLessThan(Number(rest[0].id));
	});

	it('returns no rows from an empty ledger', async () => {
		expect(await claim(10)).toEqual([]);
	});

	it('puts claimed rows back when the transaction rolls back', async () => {
		await appendMany(3);

		await expect(
			txRunner.run({}, async (ctx) => {
				await repository.claimBatch(2, ctx);
				throw new Error('fold failed');
			}),
		).rejects.toThrow('fold failed');

		expect((await claim(10)).map((r) => r.executionId)).toEqual(['exec-0', 'exec-1', 'exec-2']);
	});

	it('writes nothing when the transaction of an append rolls back', async () => {
		await expect(
			txRunner.run({}, async (ctx) => {
				await repository.append(ledgerRow(), ctx);
				throw new Error('execution insert failed');
			}),
		).rejects.toThrow('execution insert failed');

		expect(await claim(10)).toEqual([]);
	});

	it('returns a row with an unknown outcome as unreadable and the others as rows', async () => {
		await repository.append(ledgerRow({ executionId: 'exec-0' }), {});
		await bypass.insert(unknownOutcomeRow({ executionId: 'exec-1' }));
		await repository.append(ledgerRow({ executionId: 'exec-2' }), {});

		const batch = await txRunner.run({}, async (ctx) => await repository.claimBatch(10, ctx));

		expect(batch.rows.map((r) => r.executionId)).toEqual(['exec-0', 'exec-2']);
		expect(batch.unreadable).toHaveLength(1);
		expect(batch.unreadable[0]).toMatchObject({
			executionId: 'exec-1',
			outcome: 'unknown_outcome',
		});
	});

	it('removes the unreadable row from the ledger when the claim commits', async () => {
		await bypass.insert(unknownOutcomeRow());
		await repository.append(ledgerRow(), {});
		await txRunner.run({}, async (ctx) => await repository.claimBatch(10, ctx));

		expect(await claim(10)).toEqual([]);
		expect((await repository.getBacklogStats()).oldestOccurredAt).toBeNull();
	});

	it('puts the unreadable row back when the claim rolls back', async () => {
		await bypass.insert(unknownOutcomeRow({ executionId: 'exec-1' }));

		await expect(
			txRunner.run({}, async (ctx) => {
				await repository.claimBatch(10, ctx);
				throw new Error('fold failed');
			}),
		).rejects.toThrow('fold failed');

		const batch = await txRunner.run({}, async (ctx) => await repository.claimBatch(10, ctx));
		expect(batch.unreadable.map((r) => r.executionId)).toEqual(['exec-1']);
	});

	it('requires a transaction to claim', async () => {
		await expect(repository.claimBatch(10, {})).rejects.toThrow(UnexpectedError);
	});

	it.each([0, -1, 1.5])('rejects the limit %s', async (limit) => {
		await expect(claim(limit)).rejects.toThrow('The claim limit must be a positive integer');
	});

	describe('getBacklogStats', () => {
		it('returns no rows and no oldest time for an empty table', async () => {
			expect(await repository.getBacklogStats()).toEqual({ rows: 0, oldestOccurredAt: null });
		});

		it('counts the rows and returns the occurredAt of the lowest id', async () => {
			const times = [
				'2026-10-28T10:00:00.000Z',
				'2026-10-27T08:30:00.000Z',
				'2026-10-29T12:00:00.000Z',
			];
			for (const time of times) {
				await repository.append(ledgerRow({ occurredAt: new Date(time) }), {});
			}

			const stats = await repository.getBacklogStats();

			expect(stats.rows).toBe(3);
			expect(stats.oldestOccurredAt?.getTime()).toBe(new Date(times[0]).getTime());
		});

		it('drops the count after rows are claimed', async () => {
			await appendMany(5);
			await claim(2);

			expect((await repository.getBacklogStats()).rows).toBe(3);
		});

		it('never undercounts when a rolled-back append leaves an id gap', async () => {
			await appendMany(2);
			await expect(
				txRunner.run({}, async (ctx) => {
					await repository.append(ledgerRow(), ctx);
					throw new Error('rollback');
				}),
			).rejects.toThrow('rollback');
			await appendMany(1);

			// Postgres burns the rolled-back id, SQLite reuses it.
			const { rows } = await repository.getBacklogStats();
			expect(rows).toBeGreaterThanOrEqual(3);
			expect(rows).toBeLessThanOrEqual(4);
		});
	});
});
