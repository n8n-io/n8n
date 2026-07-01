import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ScheduledJob } from '../entities/scheduled-job';

@Service()
export class ScheduledJobRepository extends Repository<ScheduledJob> {
	constructor(dataSource: DataSource) {
		super(ScheduledJob, dataSource.manager);
	}

	async findAll(): Promise<ScheduledJob[]> {
		return await this.find();
	}
}
