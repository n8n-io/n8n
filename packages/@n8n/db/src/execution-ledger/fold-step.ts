import { UnexpectedError } from 'n8n-workflow';

import type { ExecutionLedgerRow } from './execution-ledger-row';
import type { OperationContext } from '../services/transaction';

/** Work a fold step runs after the fold transaction commits, at most once. */
export type AfterFoldCommit = () => Promise<void>;

/**
 * Turns a batch of claimed ledger rows into one feature's summary table. It writes only
 * through `ctx`, so its writes commit or roll back with the claim.
 */
export interface ExecutionLedgerFoldStep {
	/** Stable id used in logs, alerts and the parked table. Must match {@link FOLD_STEP_NAME_PATTERN}. */
	readonly name: string;
	fold(
		rows: readonly ExecutionLedgerRow[],
		ctx: OperationContext,
	): Promise<AfterFoldCommit | undefined>;
}

/** Also used unquoted as a savepoint name, so it stays lowercase ASCII and short. */
export const FOLD_STEP_NAME_PATTERN = /^[a-z][a-z0-9_]{0,47}$/;

export function assertValidFoldStepName(name: string): void {
	if (!FOLD_STEP_NAME_PATTERN.test(name)) {
		throw new UnexpectedError(`Invalid fold step name "${name}"`, {
			extra: { pattern: FOLD_STEP_NAME_PATTERN.source },
		});
	}
}
