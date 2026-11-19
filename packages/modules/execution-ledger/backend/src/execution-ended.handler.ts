import { ExecutionLedger, toEndedFactsFromRun } from '@n8n/backend-services';
import { OnLifecycleEvent, type WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';

/** Writes the `ended` row of a run from the hook run whose save finished it. */
@Service()
export class ExecutionEndedHandler {
	constructor(private readonly executionLedger: ExecutionLedger) {}

	@OnLifecycleEvent('workflowExecuteAfter')
	async handleWorkflowExecuteAfter(ctx: WorkflowExecuteAfterContext) {
		if (!ctx.executedInThisProcess || !ctx.endedByThisSave) return;
		// Canceled runs are not counted yet, so they get no `ended` row.
		if (ctx.runData.status === 'canceled') return;

		const facts = toEndedFactsFromRun({
			executionId: ctx.executionId,
			workflow: ctx.workflow,
			run: ctx.runData,
			source: ctx.source,
		});
		if (!facts) return;

		const recording = this.executionLedger.recordEnded(facts);
		// `n8n execute` exits soon after the run, so it waits for the row.
		if (ctx.mode === 'cli') await recording;
	}
}
