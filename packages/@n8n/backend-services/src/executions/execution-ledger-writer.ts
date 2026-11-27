import type { ExecutionLedgerBlockedBy, ExecutionLedgerOutcome, OperationContext } from '@n8n/db';
import type { WorkflowExecuteMode, WorkflowExecutionSource } from 'n8n-workflow';

type RunFacts = {
	executionId: string;
	workflowId: string;
	workflowName: string;
	mode: WorkflowExecuteMode;
	/** Unset for a regular run. The writer stores `none`. */
	source?: WorkflowExecutionSource;
	/** The owner project, when the caller already has it. The writer looks it up when unset. */
	projectId?: string;
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

/** `hasOwnerProject` is false when the row was written with no project. */
export type ExecutionLedgerWriteResult = { hasOwnerProject: boolean };

export type ExecutionLedgerBacklogStats = {
	/** Upper bound from the id range: each rolled-back append leaves a gap that counts. */
	rows: number;
	oldestOccurredAt: Date | null;
};

/** Implemented by the `execution-ledger` module. Core code calls `ExecutionLedger` instead. */
export interface ExecutionLedgerWriter {
	writeStarted(
		facts: ExecutionLedgerStartedFacts,
		ctx: OperationContext,
	): Promise<ExecutionLedgerWriteResult>;
	writeEnded(
		facts: ExecutionLedgerEndedFacts,
		ctx: OperationContext,
	): Promise<ExecutionLedgerWriteResult>;
	/** For monitoring. The writer owns the table, so it also reads its backlog. */
	getBacklogStats(): Promise<ExecutionLedgerBacklogStats>;
}
