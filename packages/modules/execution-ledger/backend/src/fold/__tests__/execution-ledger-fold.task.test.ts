import type { SchedulerConfig } from '@n8n/config';

import { ExecutionLedgerFoldTask } from '../execution-ledger-fold.task';
import type { ExecutionLedgerFoldService } from '../execution-ledger-fold.service';

describe('ExecutionLedgerFoldTask', () => {
	const build = (leaseDurationSeconds: number) => {
		const fold = vi.fn().mockResolvedValue(undefined);
		const task = new ExecutionLedgerFoldTask(
			{ fold } as unknown as ExecutionLedgerFoldService,
			{ leaseDurationSeconds } as SchedulerConfig,
		);
		return { task, fold };
	};

	it('is named execution-ledger-fold', () => {
		expect(build(30).task.name).toBe('execution-ledger-fold');
	});

	it('runs every 5 seconds', () => {
		expect(build(30).task.schedule).toMatchObject({ kind: 'interval', intervalSeconds: 5 });
	});

	it.each([
		{ lease: 30, budget: 4000 },
		{ lease: 3, budget: 2000 },
	])('passes a $budget ms budget to the fold with a $lease s lease', async ({ lease, budget }) => {
		const { task, fold } = build(lease);
		const signal = new AbortController().signal;

		await task.run(signal);

		expect(fold).toHaveBeenCalledWith(signal, budget);
	});
});
