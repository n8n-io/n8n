import { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UserError } from '@n8n/errors';
import type { IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

import { runsOnQueueWorker } from '@/workflow-runner';

/**
 * An instrumented run (a test run or an eval) would leave the main process, or pause and
 * resume later. Its hooks live in a closure on main, so the run would go on without them and
 * call real services. The run is refused instead.
 */
export class InstrumentedRunUnsupportedError extends UserError {
	constructor(message: string) {
		super(message);
		this.name = 'InstrumentedRunUnsupportedError';
	}
}

/**
 * Why an instrumented workflow run would not run in this main process, or `undefined` when it
 * would. The hooks are a closure: `WorkflowRunner.run` applies them only in `runMainProcess`,
 * never on a queue worker or on the Engine v2 data plane. The tool list asks this too.
 */
export function instrumentedRunGap(
	workflow: Pick<IWorkflowBase, 'settings'>,
	executionMode: WorkflowExecuteMode,
): string | undefined {
	// Stricter than `EngineV2Dispatcher.handlesWorkflow`, which takes only some modes: every v2
	// workflow is refused, so a later change to which modes v2 takes cannot let a run through.
	if (workflow.settings?.engineType === 'v2') {
		return 'Test runs and evaluations do not support Engine v2 workflows yet.';
	}
	if (runsOnQueueWorker(Container.get(ExecutionsConfig), executionMode)) {
		return 'This workflow would run on a queue worker, which test runs and evaluations cannot reach.';
	}
	return undefined;
}

export function assertInstrumentedRunStaysOnMain(
	workflow: Pick<IWorkflowBase, 'settings'>,
	executionMode: WorkflowExecuteMode,
): void {
	const gap = instrumentedRunGap(workflow, executionMode);
	if (gap) throw new InstrumentedRunUnsupportedError(gap);
}

/** A paused run resumes later without its hooks, so an instrumented run must not pause. */
export const PAUSED_INSTRUMENTED_RUN_MESSAGE =
	'This workflow paused to wait. A paused workflow resumes outside the test run, so it was stopped.';

/**
 * A run that the runner started without applying the hooks, so it left this process. Only
 * possible if `instrumentedRunGap` and `WorkflowRunner.run` disagree.
 */
export const UNINSTRUMENTED_RUN_MESSAGE =
	'This workflow run started outside the test run, without its mocks, so it was stopped. Its first requests may have reached real services.';

/**
 * Custom data on a workflow execution that an instrumented tool started. A label for the
 * executions list, not a trust signal: it takes one of the execution's custom data slots
 * (`KV_LIMIT`), and the workflow's own Execution Data node can overwrite it.
 */
export const SIMULATED_RUN_METADATA: Readonly<Record<string, string>> = { simulated: 'true' };
