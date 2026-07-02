import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ScheduledTask } from '../entities/scheduled-task';

@Service()
export class ScheduledTaskRepository extends Repository<ScheduledTask> {
	constructor(dataSource: DataSource) {
		super(ScheduledTask, dataSource.manager);
	}

	async findAll(): Promise<ScheduledTask[]> {
		return await this.find();
	}
}
