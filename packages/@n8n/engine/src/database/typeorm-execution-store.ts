import type { Repository } from '@n8n/typeorm';

import type { WorkflowExecution } from './entities';
import {
	ExecutionNotFoundError,
	type ExecutionRecord,
	type ExecutionStore,
	type NewExecutionRecord,
} from '../execution/execution-store';
import type { ExecutionStatus } from '../execution/execution.types';

/** TypeORM-backed `ExecutionStore` adapter. */
export class TypeOrmExecutionStore implements ExecutionStore {
	constructor(private readonly repo: Repository<WorkflowExecution>) {}

	async createExecution(record: NewExecutionRecord): Promise<{ id: string }> {
		const execution = this.repo.create({ ...record, finishedAt: null });
		await this.repo.save(execution);
		return { id: execution.id };
	}

	async loadExecution(id: string): Promise<ExecutionRecord> {
		const row = await this.repo.findOneBy({ id });
		if (!row) throw new ExecutionNotFoundError(id);
		return row;
	}

	async transitionStatus(id: string, from: ExecutionStatus, to: ExecutionStatus): Promise<boolean> {
		const result = await this.repo.update({ id, status: from }, { status: to });
		return result.affected === 1;
	}
}
