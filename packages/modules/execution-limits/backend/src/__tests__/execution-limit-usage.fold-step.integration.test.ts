import { testDb, testModules } from '@n8n/backend-test-utils';
import {
	EXECUTION_LEDGER_OUTCOMES,
	type ExecutionLedgerRow,
	TransactionRunner,
	withSavepoint,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { ExecutionLimitInstanceUsage } from '../execution-limit-instance-usage.entity';
import { toUsageDeltas } from '../execution-limit-usage.deltas';
import { ExecutionLimitUsage } from '../execution-limit-usage.entity';
import { ExecutionLimitUsageFoldStep } from '../execution-limit-usage.fold-step';
import { ExecutionLimitUsageRepository } from '../execution-limit-usage.repository';
import { ledgerRow } from './ledger-rows';

const COUNTED_MODES = ['cli', 'retry', 'trigger', 'webhook', 'evaluation', 'agent'];
const UNCOUNTED_MODES = ['integrated', 'error', 'internal', 'manual', 'chat'];

describe('ExecutionLimitUsageFoldStep', () => {
	let usage: Repository<ExecutionLimitUsage>;
	let instanceUsage: Repository<ExecutionLimitInstanceUsage>;
	let step: ExecutionLimitUsageFoldStep;

	const fold = async (...rows: ExecutionLedgerRow[]) =>
		await Container.get(TransactionRunner).run({}, async (ctx) => await step.fold(rows, ctx));

	const total = (found: Array<{ startedCount: number; blockedCount: number }>) => ({
		started: found.reduce((sum, r) => sum + r.startedCount, 0),
		blocked: found.reduce((sum, r) => sum + r.blockedCount, 0),
	});

	const totalOf = async (projectId: string) => total(await usage.findBy({ projectId }));

	const instanceTotal = async () => total(await instanceUsage.find());

	const expectProjectAndInstanceTotal = async (expected: { started: number; blocked: number }) => {
		expect(await totalOf('project-1')).toEqual(expected);
		expect(await instanceTotal()).toEqual(expected);
	};

	beforeAll(async () => {
		await testModules.loadModules(['execution-limits'], {
			'execution-limits': async () => await import('../execution-limits.module.js'),
		});
		await testDb.init();
		usage = Container.get(DataSource).getRepository(ExecutionLimitUsage);
		instanceUsage = Container.get(DataSource).getRepository(ExecutionLimitInstanceUsage);
		step = Container.get(ExecutionLimitUsageFoldStep);
	});

	beforeEach(async () => {
		await usage.clear();
		await instanceUsage.clear();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('modes', () => {
		it.each(COUNTED_MODES)('counts a started run of mode %s', async (mode) => {
			await fold(ledgerRow({ mode }));

			await expectProjectAndInstanceTotal({ started: 1, blocked: 0 });
		});

		it.each(UNCOUNTED_MODES)('writes no rows for a started run of mode %s', async (mode) => {
			await fold(ledgerRow({ mode }));

			expect(await usage.count()).toBe(0);
		});
	});

	describe('sources', () => {
		it.each([
			['none', 1],
			['user', 1],
			['instance_ai', 0],
		])('counts %s as %i started runs', async (source, expected) => {
			await fold(ledgerRow({ mode: 'webhook', source }));

			await expectProjectAndInstanceTotal({ started: expected, blocked: 0 });
			expect(await usage.count()).toBe(expected);
			expect(await instanceUsage.count()).toBe(expected);
		});
	});

	describe('outcomes', () => {
		it.each(EXECUTION_LEDGER_OUTCOMES.filter((o) => o !== 'none'))(
			'counts the start and the %s end of one run in one batch',
			async (outcome) => {
				const executionId = 'exec-1';
				await fold(
					ledgerRow({ executionId, event: 'started' }),
					ledgerRow({ executionId, event: 'ended', outcome }),
				);

				await expectProjectAndInstanceTotal({
					started: 1,
					blocked: outcome === 'blocked' ? 1 : 0,
				});
			},
		);

		it('counts a blocked run whose start and end come in two fold calls', async () => {
			const executionId = 'exec-1';
			await fold(ledgerRow({ executionId, event: 'started' }));
			await fold(ledgerRow({ executionId, event: 'ended', outcome: 'blocked' }));

			await expectProjectAndInstanceTotal({ started: 1, blocked: 1 });
		});
	});

	it('makes the instance total the sum of two projects', async () => {
		await fold(
			ledgerRow({ projectId: 'project-a' }),
			ledgerRow({ projectId: 'project-a' }),
			ledgerRow({ projectId: 'project-b' }),
		);

		expect(await totalOf('project-a')).toEqual({ started: 2, blocked: 0 });
		expect(await totalOf('project-b')).toEqual({ started: 1, blocked: 0 });
		expect(await instanceTotal()).toEqual({ started: 3, blocked: 0 });
	});

	it('adds to existing rows on a second fold and moves updatedAt forward', async () => {
		const past = new Date('2020-01-01T00:00:00Z');
		await fold(ledgerRow());
		await usage.update({ projectId: 'project-1' }, { updatedAt: past });

		await fold(ledgerRow(), ledgerRow());
		const row = await usage.findOneByOrFail({ projectId: 'project-1' });

		expect(row.startedCount).toBe(3);
		expect(row.updatedAt.getTime()).toBeGreaterThan(past.getTime());
	});

	it('counts a run with no project for the instance only', async () => {
		await fold(ledgerRow({ projectId: null as unknown as string }), ledgerRow());

		expect(await usage.count()).toBe(1);
		expect(await instanceTotal()).toEqual({ started: 2, blocked: 0 });
	});

	it('splits a run that starts at 23:59Z and is blocked at 00:01Z over two days', async () => {
		const executionId = 'exec-1';
		await fold(
			ledgerRow({ executionId, event: 'started', occurredAt: new Date('2026-11-19T23:59:00Z') }),
			ledgerRow({
				executionId,
				event: 'ended',
				outcome: 'blocked',
				occurredAt: new Date('2026-11-20T00:01:00Z'),
			}),
		);

		expect(await usage.find({ where: { projectId: 'project-1' }, order: { day: 'ASC' } })).toEqual([
			expect.objectContaining({ day: '2026-11-19', startedCount: 1, blockedCount: 0 }),
			expect.objectContaining({ day: '2026-11-20', startedCount: 0, blockedCount: 1 }),
		]);
	});

	it.todo('adds the blocked count to the start project when the ended row names it');

	it('writes 2,500 projects in one fold call', async () => {
		const rows = Array.from({ length: 2500 }, (_, i) => ledgerRow({ projectId: `project-${i}` }));

		await fold(...rows);

		expect(await usage.count()).toBe(2500);
		expect(await instanceUsage.count()).toBe(1);
		expect(await instanceTotal()).toEqual({ started: 2500, blocked: 0 });
	}, 30_000);

	it('keeps only the counts of the second fold when the first one rolls back to a savepoint', async () => {
		await Container.get(TransactionRunner).run({}, async (ctx) => {
			await expect(
				withSavepoint(ctx, step.name, async (savepointCtx) => {
					await step.fold([ledgerRow({ projectId: 'project-lost' })], savepointCtx);
					throw new Error('step failed');
				}),
			).rejects.toThrow('step failed');

			await step.fold([ledgerRow({ projectId: 'project-kept' })], ctx);
		});

		expect(await totalOf('project-lost')).toEqual({ started: 0, blocked: 0 });
		expect(await totalOf('project-kept')).toEqual({ started: 1, blocked: 0 });
		expect(await instanceTotal()).toEqual({ started: 1, blocked: 0 });
	});

	it('rejects addUsage without a transaction', async () => {
		const repository = Container.get(ExecutionLimitUsageRepository);

		await expect(repository.addUsage(toUsageDeltas([ledgerRow()]), {})).rejects.toThrow();
		expect(await usage.count()).toBe(0);
		expect(await instanceUsage.count()).toBe(0);
	});
});
