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

	it('passes a 4000 ms budget to the fold when the lease is long', async () => {
		const { task, fold } = build(30);
		const signal = new AbortController().signal;

		await task.run(signal);

		expect(fold).toHaveBeenCalledWith(signal, 4000);
	});

	it('passes a 2000 ms budget to the fold when the lease is short', async () => {
		const { task, fold } = build(3);
		const signal = new AbortController().signal;

		await task.run(signal);

		expect(fold).toHaveBeenCalledWith(signal, 2000);
	});
});
