import type { ExecutionLedgerRow } from '../repositories/execution-ledger.repository';
import type { OperationContext } from '../services/transaction';
import type { Constructable } from '@n8n/di';

/** Work to run after the fold transaction commits, e.g. events. At most once. */
export type AfterFoldCommit = () => Promise<void>;

/**
 * Folds a claimed batch of ledger rows into its own aggregates. Runs inside the fold
 * transaction, so a failure rolls back the whole batch and every participant retries it.
 */
export interface ExecutionLedgerParticipant {
	readonly name: string;
	fold(rows: ExecutionLedgerRow[], ctx: OperationContext): Promise<AfterFoldCommit | undefined>;
}

const participantClasses = new Set<Constructable<ExecutionLedgerParticipant>>();

/** Registers the class as a fold participant. The class must also be a `@Service()`. */
export const LedgerParticipant =
	() =>
	<T extends Constructable<ExecutionLedgerParticipant>>(target: T) => {
		participantClasses.add(target);
		return target;
	};

export function getLedgerParticipantClasses(): Array<Constructable<ExecutionLedgerParticipant>> {
	return [...participantClasses];
}
