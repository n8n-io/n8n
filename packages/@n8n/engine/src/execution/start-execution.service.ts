import type { Repository } from '@n8n/typeorm';

import type { AdmittanceService } from '../admittance';
import type { ExecutionMode, WorkflowExecution } from '../database';
import type { WorkflowGraph } from '../graph';
import type { WorkQueue } from '../queue';

export interface StartExecutionRequest {
	workflowId: string;
	graph: WorkflowGraph;
	triggerPayload?: unknown;
	mode?: ExecutionMode;
}

export interface StartExecutionResult {
	executionId: string;
}

export class AdmittanceRejectedError extends Error {
	constructor(readonly reason: string) {
		super(`Execution admittance rejected: ${reason}`);
		this.name = 'AdmittanceRejectedError';
	}
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
			status: 'running',
			mode: request.mode ?? 'production',
			graph: request.graph,
			triggerPayload: request.triggerPayload ?? null,
			finishedAt: null,
		});
		await this.executionRepo.save(execution);

		await this.workQueue.publish({
			type: 'execution:started',
			executionId: execution.id,
		});

		return { executionId: execution.id };
	}
}
