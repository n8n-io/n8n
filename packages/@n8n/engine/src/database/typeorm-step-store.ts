import type { Repository } from '@n8n/typeorm';

import type { WorkflowStepExecution } from './entities';
import type { NewStepRecord, StepStore } from '../execution/step-store';

/** TypeORM-backed `StepStore` adapter. */
export class TypeOrmStepStore implements StepStore {
	constructor(private readonly repo: Repository<WorkflowStepExecution>) {}

	async createStep(record: NewStepRecord): Promise<{ id: string }> {
		const step = this.repo.create(record);
		await this.repo.save(step);
		return { id: step.id };
	}
}
