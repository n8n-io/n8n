import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiIterationLog } from '../entities/instance-ai-iteration-log.entity';

@Service()
export class InstanceAiIterationLogRepository extends Repository<InstanceAiIterationLog> {
	constructor(dataSource: DataSource) {
		super(InstanceAiIterationLog, dataSource.manager);
	}
}
