import type { WorkflowExecuteMode, WorkflowExecutionSource } from 'n8n-workflow';

import type { ExecutionLedgerBlockedBy, ExecutionLedgerOutcome } from './execution-ledger-row';
import type { OperationContext } from '../services/transaction';

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

export type ExecutionLedgerEndedFacts = RunFacts & {
	runtimeMs: number;
	timeSavedMin: number;
} & (
		| { outcome: 'blocked'; blockedBy: ExecutionLedgerBlockedReason }
		| { outcome: Exclude<ExecutionLedgerOutcome, 'none' | 'blocked'>; blockedBy?: never }
	);

/** A missing owner project is a result, not an error: a failed insert would abort a Postgres transaction. */
export type ExecutionLedgerWriteResult =
	| { recorded: true }
	| { recorded: false; reason: 'noOwnerProject' };

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
}
