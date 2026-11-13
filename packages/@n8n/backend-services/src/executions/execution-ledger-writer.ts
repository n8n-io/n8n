import type { ExecutionLedgerBlockedBy, ExecutionLedgerOutcome, OperationContext } from '@n8n/db';
import type { WorkflowExecuteMode, WorkflowExecutionSource } from 'n8n-workflow';

type RunFacts = {
	executionId: string;
	workflowId: string;
	workflowName: string;
	mode: WorkflowExecuteMode;
	/** Unset for a regular run. The writer stores `none`. */
	source?: WorkflowExecutionSource;
	occurredAt: Date;
};

export type ExecutionLedgerStartedFacts = RunFacts;

export type ExecutionLedgerBlockedReason = Exclude<ExecutionLedgerBlockedBy, 'none'>;

/** A blocked run did not start, so it has no runtime and saves no time. */
type BlockedRun = {
	outcome: 'blocked';
	blockedBy: ExecutionLedgerBlockedReason;
	runtimeMs?: never;
	timeSavedMin?: never;
};

type FinishedRun = {
	outcome: Exclude<ExecutionLedgerOutcome, 'none' | 'blocked'>;
	blockedBy?: never;
	runtimeMs: number;
	timeSavedMin: number;
};

export type ExecutionLedgerEndedFacts = RunFacts & (BlockedRun | FinishedRun);

/**
 * Implemented by the `execution-ledger` module. Core code calls `ExecutionLedger` instead.
 * A write resolves to `false` when the workflow has no owner project. It does not throw
 * for that case, because a failed insert would abort a Postgres transaction.
 */
export interface ExecutionLedgerWriter {
	writeStarted(facts: ExecutionLedgerStartedFacts, ctx: OperationContext): Promise<boolean>;
	writeEnded(facts: ExecutionLedgerEndedFacts, ctx: OperationContext): Promise<boolean>;
}
