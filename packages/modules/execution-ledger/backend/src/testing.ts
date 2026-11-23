import { type ExecutionLedgerRow, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';

import { ExecutionLedgerRepository } from './database/repositories/execution-ledger.repository';

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
