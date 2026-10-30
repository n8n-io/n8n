import type { CrashedExecution } from '@n8n/db';
import type { IRun, IWorkflowBase, WorkflowExecutionSource } from 'n8n-workflow';
import { isTerminalExecutionStatus } from 'n8n-workflow';

import { toLedgerFact } from './counting-rules';
import type { ExecutionLedgerEndedFacts } from './execution-ledger-writer';
import { computeTimeSavedMinutes } from './time-saved';

/**
 * The `ended` facts of a run that has run data. Undefined when the run has not finished, or
 * when its workflow has no ID, for example an inline sub-workflow.
 */
export function toEndedFactsFromRun({
	executionId,
	workflow,
	run,
	source,
}: {
	executionId: string;
	workflow: IWorkflowBase;
	run: IRun;
	source?: WorkflowExecutionSource;
}): ExecutionLedgerEndedFacts | undefined {
	if (!isTerminalExecutionStatus(run.status) || !workflow.id) return undefined;

	return {
		executionId,
		workflowId: workflow.id,
		workflowName: workflow.name,
		mode: run.mode,
		source,
		occurredAt: run.stoppedAt ?? new Date(),
		outcome: run.status,
		runtimeMs: run.stoppedAt ? run.stoppedAt.getTime() - run.startedAt.getTime() : 0,
		timeSavedMin:
			computeTimeSavedMinutes({
				fact: toLedgerFact(run, source),
				settings: workflow.settings,
				nodeTimeSavedMinutes: run.nodeTimeSavedMinutes,
				runData: run.data.resultData?.runData,
			}) ?? 0,
	};
}

/** The `ended` facts of a row that a crash sweep claimed. A run that never started has no runtime. */
export function toEndedFactsFromCrash(
	execution: CrashedExecution,
	stoppedAtOverride?: Date,
): ExecutionLedgerEndedFacts {
	const stoppedAt = stoppedAtOverride ?? execution.stoppedAt;

	return {
		executionId: execution.id,
		workflowId: execution.workflowId,
		workflowName: execution.workflowName ?? '',
		mode: execution.mode,
		occurredAt: stoppedAt,
		outcome: 'crashed',
		runtimeMs: execution.startedAt ? stoppedAt.getTime() - execution.startedAt.getTime() : 0,
		timeSavedMin: 0,
	};
}
