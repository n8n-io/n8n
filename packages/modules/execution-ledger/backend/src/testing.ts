import { type ExecutionLedgerRow, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';

import { ExecutionLedgerRepository } from './database/repositories/execution-ledger.repository';
import { ExecutionLedgerFoldService } from './fold/execution-ledger-fold.service';

/** Claims, and so removes, every ledger row. Returns the readable ones. For tests only. */
export async function claimAllLedgerRows(): Promise<ExecutionLedgerRow[]> {
	const rows: ExecutionLedgerRow[] = [];
	for (;;) {
		const { rows: batch, unreadable } = await Container.get(TransactionRunner).run(
			{},
			async (ctx) => await Container.get(ExecutionLedgerRepository).claimBatch(10_000, ctx),
		);
		rows.push(...batch);
		if (batch.length + unreadable.length === 0) return rows;
	}
}

/** Folds one batch through the registered fold steps, and returns its size. For tests only. */
export async function foldLedgerBatch(): Promise<number> {
	return await Container.get(ExecutionLedgerFoldService).foldBatch();
}

/** Folds every ledger row through the registered fold steps. For tests only. */
export async function foldAllLedgerRows(): Promise<number> {
	let total = 0;
	for (;;) {
		const folded = await foldLedgerBatch();
		if (folded === 0) return total;
		total += folded;
	}
}
