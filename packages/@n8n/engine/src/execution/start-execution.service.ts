import { AdmittanceRejectedError, type AdmittanceService } from '../admittance';
import type { JsonObject } from '../common';
import type { WorkflowGraph } from '../graph';
import type { WorkQueue } from '../queue';
import type { ExecutionStore } from './execution-store';
import type { ExecutionMode } from './execution.types';

export interface StartExecutionRequest {
	workflowId: string;
	graph: WorkflowGraph;
	triggerPayload?: JsonObject | null;
	mode?: ExecutionMode;
}

export interface StartExecutionResult {
	executionId: string;
}

export class StartExecutionService {
	constructor(
		private readonly admittance: AdmittanceService,
		private readonly executionStore: ExecutionStore,
		private readonly workQueue: WorkQueue,
	) {}

	async start(request: StartExecutionRequest): Promise<StartExecutionResult> {
		const decision = await this.admittance.evaluate({ workflowId: request.workflowId });
		if (!decision.accept) {
			throw new AdmittanceRejectedError(decision.reason);
		}

		const { id } = await this.executionStore.createExecution({
			workflowId: request.workflowId,
			// admitted; a worker flips this to 'running' when it starts
			status: 'queued',
			mode: request.mode ?? 'production',
			graph: request.graph,
			triggerPayload: request.triggerPayload ?? null,
		});

		// TODO(CAT-2938): the persist above and this publish aren't atomic — a
		// crash between them leaves the execution 'queued' until the
		// reconciliation sweep (not yet built) re-dispatches it.
		await this.workQueue.publish({
			type: 'execution:enqueued',
			executionId: id,
		});

		return { executionId: id };
	}
}
