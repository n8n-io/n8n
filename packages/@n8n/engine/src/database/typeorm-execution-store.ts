import type { Repository } from '@n8n/typeorm';

import type { WorkflowExecution } from './entities';
import {
	ExecutionNotFoundError,
	type ExecutionRecord,
	type ExecutionStore,
	type NewExecutionRecord,
} from '../execution/execution-store';
import type { ExecutionStatus } from '../execution/execution.types';

/**
 * Insert payload accepted by the repository. Derived from the method rather than
 * imported: TypeORM's `QueryDeepPartialEntity` has no root export.
 */
type InsertValues = Parameters<Repository<WorkflowExecution>['insert']>[0];

/** TypeORM-backed `ExecutionStore` adapter. */
export class TypeOrmExecutionStore implements ExecutionStore {
	constructor(private readonly repo: Repository<WorkflowExecution>) {}

	async createExecution(record: NewExecutionRecord): Promise<void> {
		const execution = this.repo.create({ ...record, finishedAt: null });
		// The cast is needed because the insert payload type recurses into the
		// opaque `graph` jsonb and rejects `StepConfig`'s deliberate `unknown`.
		// NOTE: prefer insert to save for performance reasons.
		await this.repo.insert(execution as InsertValues);
	}

	/**
	 * Names its columns rather than returning the entity: this runs once per
	 * orchestration event, and the row also carries the workflow document, which
	 * the execution path never reads.
	 */
	async loadExecution(id: string): Promise<ExecutionRecord> {
		const row: ExecutionRecord | undefined = await this.repo
			.createQueryBuilder('execution')
			.select('execution.id', 'id')
			.addSelect('execution.workflow_id', 'workflowId')
			.addSelect('execution.status', 'status')
			.addSelect('execution.mode', 'mode')
			.addSelect('execution.graph', 'graph')
			.addSelect('execution.trigger_outputs', 'triggerOutputs')
			.where('execution.id = :id', { id })
			.getRawOne();
		if (!row) throw new ExecutionNotFoundError(id);
		return row;
	}

	async transitionStatus(id: string, from: ExecutionStatus, to: ExecutionStatus): Promise<boolean> {
		const result = await this.repo.update({ id, status: from }, { status: to });
		return result.affected === 1;
	}

	async finishExecution(id: string, status: 'completed' | 'failed'): Promise<boolean> {
		const result = await this.repo.update(
			{ id, status: 'running' },
			{ status, finishedAt: new Date() },
		);
		return result.affected === 1;
	}
}
