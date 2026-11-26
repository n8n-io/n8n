import { UnexpectedError } from '../common';
import type {
	ErrorWorkflowResolver,
	ErrorWorkflowSource,
	ErrorWorkflowStart,
} from '../dependencies';
import { GraphValidationError } from '../graph';
import type { EngineLogger } from '../logging';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import type { WorkflowDocument } from './execution.types';
import type { StartExecutionService } from './start-execution.service';
import type { StepStore } from './step-store';

/** What one try to start an error execution did. */
export type ErrorWorkflowStartOutcome =
	/** No error execution is due: none was expected, or an earlier try finished. */
	| 'not-due'
	/** The execution now has an error execution. */
	| 'started'
	/** The starter cleared the marker without a start, and will not try again. */
	| 'abandoned';

/**
 * Starts the error execution of an execution that failed. A cancelled
 * execution gets none, unlike in v1.
 *
 * The write that fails an execution sets a marker when the host expects an
 * error workflow for it. This service reads the marker, asks the host to
 * resolve the error workflow, and starts the error execution with an error
 * source link. The start clears the marker in the same transaction. An answer
 * of `none` clears it too, and so does a graph that the engine refuses. A
 * failure leaves it, so the reconciliation repair tries again.
 *
 * Two callers call it: the worker that failed the execution, and the repair.
 */
export class ErrorWorkflowStarter {
	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly startExecution: StartExecutionService,
		private readonly logger: EngineLogger,
		private readonly resolve?: ErrorWorkflowResolver,
	) {}

	/**
	 * For the worker that failed the execution. Never throws, so a failed try
	 * cannot stop the rest of that worker's work. The repair tries again.
	 */
	async startAfterFailure(executionId: string): Promise<void> {
		try {
			await this.start(executionId);
		} catch (error) {
			this.logger.warn(
				'Could not start the error workflow. The reconciliation sweep tries again.',
				{
					executionId,
					error,
				},
			);
		}
	}

	/** Throws on a failure that a later try can fix, and leaves the marker for it. */
	async start(executionId: string): Promise<ErrorWorkflowStartOutcome> {
		const state = await this.executionStore.loadErrorWorkflowState(executionId);
		if (state.dueAt === null) return 'not-due';

		// The start that wrote the link cleared the marker in its transaction, so a
		// set marker beside a link is only left over from a lost race.
		if (state.hasErrorExecution || this.resolve === undefined) {
			await this.executionStore.clearErrorWorkflowDue(executionId);
			return state.hasErrorExecution ? 'started' : 'abandoned';
		}

		const execution = await this.executionStore.loadExecution(executionId);
		const resolution = await this.resolve(await this.toSource(execution, state.workflow));
		// The host found no error workflow, or refused the one it found, and the answer is final.
		if (resolution.kind === 'none') {
			this.logger.debug('No error workflow runs for the execution', {
				executionId,
				reason: resolution.reason,
			});
			await this.executionStore.clearErrorWorkflowDue(executionId);
			return 'abandoned';
		}

		try {
			await this.startAs(execution, resolution);
		} catch (error) {
			// A graph the engine refuses stays refused, so asking again cannot help.
			if (!(error instanceof GraphValidationError)) throw error;
			this.logger.error('The resolved error workflow cannot run on the engine', {
				executionId,
				errorWorkflowId: resolution.workflowId,
				error,
			});
			await this.executionStore.clearErrorWorkflowDue(executionId);
			return 'abandoned';
		}
		return 'started';
	}

	private async startAs(execution: ExecutionRecord, resolution: ErrorWorkflowStart): Promise<void> {
		await this.startExecution.start({
			executionId: resolution.executionId,
			workflowId: resolution.workflowId,
			graph: resolution.graph,
			workflow: resolution.workflow,
			triggerOutputs: resolution.triggerOutputs,
			// Never the mode of the source: a sub-execution of a manual run is `manual`,
			// and an error execution with that mode would count as a manual run.
			mode: 'production',
			callerContext: resolution.callerContext,
			errorSource: { executionId: execution.id, workflowId: execution.workflowId },
			resolveErrorWorkflowOnFailure: resolution.resolveErrorWorkflowOnFailure,
		});
	}

	private async toSource(
		execution: ExecutionRecord,
		workflow: WorkflowDocument,
	): Promise<ErrorWorkflowSource> {
		if (execution.status !== 'failed') {
			// Only the write that fails an execution sets the marker.
			throw new UnexpectedError(
				`Execution ${execution.id} is ${execution.status}, so no error workflow can be due`,
			);
		}

		const source: ErrorWorkflowSource = {
			executionId: execution.id,
			workflowId: execution.workflowId,
			workflow,
			hostMode: execution.callerContext.hostMode,
			hasParent: execution.parent !== null,
		};
		const [step] = await this.stepStore.loadFailedSteps(execution.id);
		if (!step) return source;
		const node = execution.graph.nodes.find(({ id }) => id === step.nodeId);
		const { name, message, details } = step.error ?? {
			name: 'Error',
			message: `Execution ${execution.id} failed`,
		};
		return {
			...source,
			failedStep: { nodeName: node?.name ?? step.nodeId, error: { name, message, details } },
		};
	}
}
