import type { CanceledExecution, CrashedExecution } from '@n8n/db';
import type { IRun, IWorkflowBase, WorkflowExecutionSource } from 'n8n-workflow';

import { toLedgerFact, toLedgerOutcome } from './counting-rules';
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
	const ended = toLedgerOutcome(run);
	if (ended.outcome === 'none' || !workflow.id) return undefined;

	const facts = {
		executionId,
		workflowId: workflow.id,
		workflowName: workflow.name,
		mode: run.mode,
		source,
		occurredAt: run.stoppedAt ?? new Date(),
	};
	if (ended.outcome === 'blocked') return { ...facts, ...ended };

	return {
		...facts,
		outcome: ended.outcome,
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

/** The `ended` facts of a row that a crash sweep claimed. A run that no runner took ends blocked. */
export function toEndedFactsFromCrash(execution: CrashedExecution): ExecutionLedgerEndedFacts {
	const { mode, startedAt, stoppedAt } = execution;
	const ended = toLedgerOutcome({ mode, status: 'crashed', startedAt });

	const facts = {
		executionId: execution.id,
		workflowId: execution.workflowId,
		workflowName: execution.workflowName ?? '',
		projectId: execution.project?.id,
		mode,
		occurredAt: stoppedAt,
	};
	if (ended.outcome === 'blocked') return { ...facts, ...ended };

	return {
		...facts,
		outcome: 'crashed',
		runtimeMs: startedAt ? stoppedAt.getTime() - startedAt.getTime() : 0,
		timeSavedMin: 0,
	};
}

/** The `ended` facts of a row that a cancel write moved to `canceled`. */
export function toEndedFactsFromCancel(execution: CanceledExecution): ExecutionLedgerEndedFacts {
	const { startedAt, stoppedAt } = execution;

	return {
		executionId: execution.id,
		workflowId: execution.workflowId,
		workflowName: execution.workflowName ?? '',
		mode: execution.mode,
		occurredAt: stoppedAt,
		outcome: 'canceled',
		runtimeMs: startedAt ? stoppedAt.getTime() - startedAt.getTime() : 0,
		timeSavedMin: 0,
	};
}
