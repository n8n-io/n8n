import type { StepCompletedEvent, StepMessage, WorkQueue } from '../queue';
import type { ExecutionStore } from './execution-store';
import { finishExecutionIfDone } from './finish-execution';
import { StepPlanner } from './step-planner';
import type { StepStore } from './step-store';

/**
 * Handles the `step:completed` orchestration event: settles what the outcome
 * decides downstream — successors run or skip, per the planner — or records
 * the execution's outcome when there is nothing left to run.
 */
export class StepCompletedHandler {
	private readonly planner: StepPlanner;

	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		stepQueue: WorkQueue<StepMessage>,
	) {
		this.planner = new StepPlanner(stepStore, stepQueue);
	}

	async handle(event: StepCompletedEvent): Promise<void> {
		const [step, execution] = await Promise.all([
			this.stepStore.loadStep(event.stepId),
			this.executionStore.loadExecution(event.executionId),
		]);

		// A failed step settles its successors too: every edge out of it is dead,
		// so downstream nodes are recorded skipped rather than left dangling.
		const planned = await this.planner.settleSuccessors(execution, step.nodeId);

		// A planned step always runs eventually, so it will report its own completion
		// and the execution gets tested for completion then.
		if (planned > 0) return;

		await finishExecutionIfDone(this.executionStore, this.stepStore, execution.id);
	}
}
