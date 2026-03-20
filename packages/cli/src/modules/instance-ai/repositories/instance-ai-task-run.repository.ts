import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiTaskRunEntity } from '../entities/instance-ai-task-run.entity';

@Service()
export class InstanceAiTaskRunRepository extends Repository<InstanceAiTaskRunEntity> {
	constructor(dataSource: DataSource) {
		super(InstanceAiTaskRunEntity, dataSource.manager);
	}
}
