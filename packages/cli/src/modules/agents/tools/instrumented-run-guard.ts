import { ExecutionsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UserError } from '@n8n/errors';
import type { IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

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
 * Throws when an instrumented workflow run would not run in this main process. The hooks are
 * a closure: `WorkflowRunner.run` applies them only in `runMainProcess`, never on a queue
 * worker or on the Engine v2 data plane.
 */
export function assertInstrumentedRunStaysOnMain(
	workflow: Pick<IWorkflowBase, 'settings'>,
	executionMode: WorkflowExecuteMode,
): void {
	// Engine v2 routes on this setting before anything else (`EngineV2Dispatcher.handlesWorkflow`).
	// Checked for every mode, so a later change to which modes v2 takes cannot let a run through.
	if (workflow.settings?.engineType === 'v2') {
		throw new InstrumentedRunUnsupportedError(
			'This workflow runs on Engine v2, which test runs and evaluations cannot reach yet.',
		);
	}
	// Mirrors the queue decision in `WorkflowRunner.run`.
	const queueMode = Container.get(ExecutionsConfig).mode === 'queue';
	const offloadsManual = process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true';
	if (queueMode && (offloadsManual || executionMode !== 'manual')) {
		throw new InstrumentedRunUnsupportedError(
			'This workflow would run on a queue worker, which test runs and evaluations cannot reach.',
		);
	}
}

/** A paused run resumes later without its hooks, so an instrumented run must not pause. */
export const PAUSED_INSTRUMENTED_RUN_MESSAGE =
	'This workflow paused to wait. A paused workflow resumes outside the test run, so it was stopped.';
