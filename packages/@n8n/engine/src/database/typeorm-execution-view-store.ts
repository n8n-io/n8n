import type { Repository } from '@n8n/typeorm';

import type { WorkflowExecution, WorkflowStepExecution } from './entities';
import { ExecutionNotFoundError } from '../execution/execution-store';
import type {
	ExecutionViewStore,
	ExecutionView,
	StepView,
} from '../execution/execution-view-store';

/**
 * TypeORM-backed `ExecutionViewStore` adapter. It spans both tables, since a
 * read of an execution and a read of its steps are one concern.
 *
 * Both queries name their columns rather than returning entities, so the read
 * path pulls no payload it doesn't report — `trigger_outputs` today, and
 * whatever the execution path adds later.
 */
export class TypeOrmExecutionViewStore implements ExecutionViewStore {
	constructor(
		private readonly executions: Repository<WorkflowExecution>,
		private readonly steps: Repository<WorkflowStepExecution>,
	) {}

	async loadExecutionView(id: string): Promise<ExecutionView> {
		const row: ExecutionView | undefined = await this.executions
			.createQueryBuilder('execution')
			.select('execution.id', 'id')
			.addSelect('execution.workflow_id', 'workflowId')
			.addSelect('execution.status', 'status')
			.addSelect('execution.mode', 'mode')
			.addSelect('execution.graph', 'graph')
			.addSelect('execution.created_at', 'createdAt')
			.addSelect('execution.updated_at', 'updatedAt')
			.addSelect('execution.finished_at', 'finishedAt')
			.where('execution.id = :id', { id })
			.getRawOne();
		if (!row) throw new ExecutionNotFoundError(id);
		return row;
	}

	async loadStepViews(executionId: string): Promise<StepView[]> {
		const rows: StepView[] = await this.steps
			.createQueryBuilder('step')
			.select('step.id', 'id')
			.addSelect('step.node_id', 'nodeId')
			.addSelect('step.iteration', 'iteration')
			.addSelect('step.status', 'status')
			.addSelect('step.outputs', 'outputs')
			.addSelect('step.error', 'error')
			.addSelect('step.created_at', 'createdAt')
			.addSelect('step.updated_at', 'updatedAt')
			.where('step.execution_id = :executionId', { executionId })
			.orderBy('step.created_at', 'ASC')
			.addOrderBy('step.node_id', 'ASC')
			.addOrderBy('step.iteration', 'ASC')
			.getRawMany();
		return rows;
	}
}
