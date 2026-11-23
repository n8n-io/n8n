import { testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';

import { ledgerRow } from '../../../__tests__/ledger-rows';
import { ExecutionLedgerParkedEntity } from '../../entities/execution-ledger-parked.entity';
import type { RawLedgerRow } from '../../ledger-row.parser';
import { ExecutionLedgerParkedRepository } from '../execution-ledger-parked.repository';

const rawRow = (id: number, overrides: Partial<RawLedgerRow> = {}): RawLedgerRow => ({
	id: String(id),
	...ledgerRow({ executionId: `exec-${id}` }),
	...overrides,
});

describe('ExecutionLedgerParkedRepository', () => {
	let parked: ExecutionLedgerParkedRepository;
	let txRunner: TransactionRunner;

	const park = async (step: string, rows: RawLedgerRow[], error = 'step failed') =>
		await txRunner.run({}, async (ctx) => await parked.park(step, rows, error, ctx));

	const parkedRows = async () =>
		await Container.get(DataSource)
			.getRepository(ExecutionLedgerParkedEntity)
			.find({ order: { id: 'ASC' } });

	beforeAll(async () => {
		await testModules.loadModules(['execution-ledger'], {
			'execution-ledger': async () => await import('../../../execution-ledger.module.js'),
		});
		await testDb.init();
		parked = Container.get(ExecutionLedgerParkedRepository);
		txRunner = Container.get(TransactionRunner);
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionLedgerParkedEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('writes every ledger column, the original ledger id, the step, the error and the park time', async () => {
		const row = rawRow(
			42,
			ledgerRow({
				event: 'ended',
				outcome: 'blocked',
				blockedBy: 'policy',
				runtimeMs: 1234,
				timeSavedMin: 5,
				source: 'instance_ai',
				origin: 'v2',
			}),
		);
		const before = Date.now();

		await park('usage_counts', [row], 'upsert failed');

		const [saved] = await parkedRows();
		expect(saved).toMatchObject({
			ledgerId: '42',
			step: 'usage_counts',
			error: 'upsert failed',
			executionId: row.executionId,
			entityType: 'workflow',
			entityName: 'Nightly sync',
			entityId: 'wf-1',
			projectId: 'project-1',
			mode: 'trigger',
			source: 'instance_ai',
			event: 'ended',
			outcome: 'blocked',
			blockedBy: 'policy',
			runtimeMs: 1234,
			timeSavedMin: 5,
			origin: 'v2',
			eventId: row.eventId,
		});
		expect(saved.occurredAt.getTime()).toBe((row.occurredAt as Date).getTime());
		expect(saved.parkedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
		expect(saved.parkedAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
	});

	it('parks a row with a value that this version does not know', async () => {
		await park('_unreadable', [rawRow(1, { outcome: 'unknown_outcome' })]);

		expect((await parkedRows())[0]).toMatchObject({ outcome: 'unknown_outcome' });
	});

	it('parks a row with no project', async () => {
		await park('first', [rawRow(1, { projectId: null })]);

		expect((await parkedRows())[0].projectId).toBeNull();
	});

	it('parks 1,200 rows in one call', async () => {
		const rows = Array.from({ length: 1200 }, (_, i) => rawRow(i + 1));

		await park('big', rows);

		const saved = await parkedRows();
		expect(saved).toHaveLength(1200);
		expect(saved.map((r) => r.ledgerId)).toEqual(rows.map((r) => String(r.id)));
		expect(new Set(saved.map((r) => r.step))).toEqual(new Set(['big']));
	});

	it('parks nothing and does not fail for an empty list', async () => {
		await park('first', []);

		expect(await parkedRows()).toEqual([]);
	});

	it('truncates an error longer than 255 characters', async () => {
		await park('first', [rawRow(1)], 'x'.repeat(400));

		const [saved] = await parkedRows();
		expect(saved.error).toBe('x'.repeat(255));
	});

	it('throws UnexpectedError without a transaction', async () => {
		await expect(parked.park('first', [rawRow(1)], 'failed', {})).rejects.toThrow(UnexpectedError);

		expect(await parkedRows()).toEqual([]);
	});

	it('leaves nothing parked when the transaction rolls back', async () => {
		await expect(
			txRunner.run({}, async (ctx) => {
				await parked.park('first', [rawRow(1), rawRow(2)], 'failed', ctx);
				throw new Error('fold failed');
			}),
		).rejects.toThrow('fold failed');

		expect(await parkedRows()).toEqual([]);
	});

	it('keeps the first park of a row that is parked again for the same step', async () => {
		await park('first', [rawRow(1)], 'first error');

		await park('first', [rawRow(1), rawRow(2)], 'second error');

		const saved = await parkedRows();
		expect(saved.map((r) => [r.ledgerId, r.error])).toEqual([
			['1', 'first error'],
			['2', 'second error'],
		]);
	});

	it('parks the same rows for two different steps', async () => {
		const rows = [rawRow(1), rawRow(2)];

		await park('first', rows);
		await park('second', rows);

		const saved = await parkedRows();
		expect(saved.map((r) => [r.step, r.ledgerId])).toEqual([
			['first', '1'],
			['first', '2'],
			['second', '1'],
			['second', '2'],
		]);
	});
});
