import type { Repository } from '@n8n/typeorm';

import type { WorkflowExecution } from './entities';
import type { ExecutionStore, NewExecutionRecord } from '../execution/execution-store';

/** TypeORM-backed `ExecutionStore` adapter. */
export class TypeOrmExecutionStore implements ExecutionStore {
	constructor(private readonly repo: Repository<WorkflowExecution>) {}

	async createExecution(record: NewExecutionRecord): Promise<{ id: string }> {
		const execution = this.repo.create({ ...record, finishedAt: null });
		await this.repo.save(execution);
		return { id: execution.id };
	}
}
