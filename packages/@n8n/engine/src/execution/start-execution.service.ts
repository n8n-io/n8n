import type { Repository } from '@n8n/typeorm';

import { AdmittanceRejectedError, type AdmittanceService } from '../admittance';
import type { JsonObject } from '../common';
import type { ExecutionMode, WorkflowExecution } from '../database';
import type { WorkflowGraph } from '../graph';
import type { WorkQueue } from '../queue';

export interface StartExecutionRequest {
	workflowId: string;
	graph: WorkflowGraph;
	triggerPayload?: JsonObject;
	mode?: ExecutionMode;
}

export interface StartExecutionResult {
	executionId: string;
}

export class StartExecutionService {
	constructor(
		private readonly admittance: AdmittanceService,
		private readonly executionRepo: Repository<WorkflowExecution>,
		private readonly workQueue: WorkQueue,
	) {}

	async start(request: StartExecutionRequest): Promise<StartExecutionResult> {
		const decision = await this.admittance.evaluate({ workflowId: request.workflowId });
		if (!decision.accept) {
			throw new AdmittanceRejectedError(decision.reason);
		}

		const execution = this.executionRepo.create({
			workflowId: request.workflowId,
			// admitted and enqueued; a worker flips this to 'running' when it starts
			status: 'queued',
			mode: request.mode ?? 'production',
			graph: request.graph,
			triggerPayload: request.triggerPayload ?? null,
			finishedAt: null,
		});
		await this.executionRepo.save(execution);

		// TODO(CAT-2938): the save and publish aren't atomic — a crash in between
		// orphans the execution until the reconciliation sweep exists.
		await this.workQueue.publish({
			type: 'execution:started',
			executionId: execution.id,
		});

		return { executionId: execution.id };
	}
}
