import { type ExecutionLedgerRow, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';

import { ExecutionLedgerRepository } from './database/repositories/execution-ledger.repository';
import { ExecutionLedgerFoldService } from './fold/execution-ledger-fold.service';

/** Claims, and so removes, every ledger row. For tests only. */
export async function claimAllLedgerRows(): Promise<ExecutionLedgerRow[]> {
	const rows: ExecutionLedgerRow[] = [];
	for (;;) {
		const batch = await Container.get(TransactionRunner).run(
			{},
			async (ctx) => await Container.get(ExecutionLedgerRepository).claimBatch(10_000, ctx),
		);
		if (batch.length === 0) return rows;
		rows.push(...batch);
	}
}

/** Folds every ledger row into the registered fold steps. For tests only. */
export async function foldAllLedgerRows(): Promise<number> {
	let folded = 0;
	for (;;) {
		const batch = await Container.get(ExecutionLedgerFoldService).foldBatch();
		folded += batch;
		if (batch === 0) return folded;
	}
}
