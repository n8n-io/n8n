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

	async loadExecution(id: string): Promise<ExecutionRecord> {
		// NOTE: `findOne({ where })`, not `findOneBy`: the latter's overload exceeds
		// TypeScript's instantiation depth on the recursive `triggerOutputs` column type.
		const row = await this.repo.findOne({ where: { id } });
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
