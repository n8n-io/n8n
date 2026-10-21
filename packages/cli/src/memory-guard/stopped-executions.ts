import { Service } from '@n8n/di';
import type { IRun, WorkflowOperationError } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';

interface StoppedExecution {
	error: WorkflowOperationError;
	runningNode: string | undefined;
}

/**
 * Executions that the memory guard stopped, and executions that are finishing. The
 * lifecycle hooks read this for every execution, so it has no dependencies.
 */
@Service()
export class StoppedExecutions {
	/** Set by the memory guard. Nothing is recorded while it is off. */
	enabled = false;

	private readonly stopped = new Map<string, StoppedExecution>();

	/** Executions whose `workflowExecuteAfter` hook started. */
	private readonly finishing = new Set<string>();

	markStopped(executionId: string, stop: StoppedExecution) {
		this.stopped.set(executionId, stop);
	}

	/** Forget a stopped execution. Call this only after its engine has ended. */
	forget(executionId: string) {
		this.stopped.delete(executionId);
	}

	isStopped(executionId: string) {
		return this.stopped.has(executionId);
	}

	isFinishing(executionId: string) {
		return this.finishing.has(executionId);
	}

	/** Forget finishing executions that `isActive` no longer reports. */
	pruneFinishing(isActive: (executionId: string) => boolean) {
		for (const executionId of this.finishing) {
			if (!isActive(executionId)) this.finishing.delete(executionId);
		}
	}

	/** A resumed execution keeps its ID, so clear its finishing mark from before the wait. */
	onWorkflowExecuteStart(executionId: string) {
		this.finishing.delete(executionId);
	}

	/**
	 * Run first in `workflowExecuteAfter`. A stopped execution fails with the stop error
	 * and keeps no run data, so that the hooks after this one neither report it as
	 * cancelled nor serialize its data near the memory limit.
	 */
	onWorkflowExecuteAfter(executionId: string, run: IRun) {
		if (!this.enabled) return;

		const stop = this.stopped.get(executionId);
		if (!stop) {
			this.finishing.add(executionId);
			return;
		}

		// Keep the small fields that later hooks read to tell where the execution comes from.
		const { parentExecution, parentAgentRun, manualData } = run.data;
		run.status = 'error';
		run.data = createRunExecutionData({
			resultData: { runData: {}, lastNodeExecuted: stop.runningNode, error: stop.error },
			executionData: null,
			parentExecution,
			parentAgentRun,
			manualData,
		});
	}
}
