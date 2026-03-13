import type { DataSource } from '@n8n/typeorm';

import type { WorkflowGraph } from '../graph/workflow-graph';
import { StepStatus } from '../database/enums';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';

/**
 * Plans which steps to queue next after a step completes.
 * A successor step is only queued when ALL its predecessors have completed.
 * Uses ON CONFLICT DO NOTHING for idempotent insertion.
 */
export class StepPlannerService {
	/** Callback invoked after a step is queued. Used to wake the adaptive poller. */
	onStepQueued?: () => void;

	constructor(private readonly dataSource: DataSource) {}

	async planNextSteps(
		executionId: string,
		completedStepId: string,
		stepOutput: unknown,
		graph: WorkflowGraph,
	): Promise<void> {
		const successors = graph.getSuccessors(completedStepId, stepOutput);

		if (successors.length === 0) {
			// No successors to plan -- the step:completed event handler
			// will call checkExecutionComplete separately. Don't call it here
			// to avoid double-finalization race conditions.
			return;
		}

		const stepRepo = this.dataSource.getRepository(WorkflowStepExecution);

		for (const step of successors) {
			const predecessors = graph.getPredecessors(step.id);

			// Check if ALL predecessors have completed
			const completedPredCount = await stepRepo
				.createQueryBuilder('wse')
				.where('wse.executionId = :executionId', { executionId })
				.andWhere('wse.stepId IN (:...stepIds)', {
					stepIds: predecessors.map((p) => p.id),
				})
				.andWhere('wse.status = :status', { status: StepStatus.Completed })
				.getCount();

			if (completedPredCount < predecessors.length) {
				// Not all predecessors are done yet -- the last completing
				// predecessor will trigger this method and queue the step
				continue;
			}

			// Gather input from predecessor outputs
			const input = await this.gatherStepInput(executionId, step.id, graph);

			// Queue the step with ON CONFLICT DO NOTHING for idempotency
			await stepRepo
				.createQueryBuilder()
				.insert()
				.into(WorkflowStepExecution)
				.values({
					executionId,
					stepId: step.id,
					stepType: step.type,
					status: StepStatus.Queued,
					input,
				})
				.orIgnore()
				.execute();

			// Wake the adaptive poller so the new step is picked up quickly
			this.onStepQueued?.();
		}
	}

	async gatherStepInput(
		executionId: string,
		_stepId: string,
		_graph: WorkflowGraph,
	): Promise<Record<string, unknown>> {
		// Include outputs from ALL completed steps in this execution.
		// Compiled step code can reference any earlier step's output via
		// ctx.input[stepId] — not just direct graph predecessors. For example,
		// in a parallel fan-out/fan-in pattern (Prepare → [A, B] → Merge),
		// the Merge step references Prepare's output even though Prepare is
		// a grandparent, not a direct predecessor.
		const completedSteps = await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder('wse')
			.select(['wse.stepId', 'wse.output'])
			.where('wse.executionId = :executionId', { executionId })
			.andWhere('wse.status = :status', { status: StepStatus.Completed })
			.getMany();

		const input: Record<string, unknown> = {};
		for (const step of completedSteps) {
			input[step.stepId] = step.output;
		}
		return input;
	}
}
