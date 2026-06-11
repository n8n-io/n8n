import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiThread } from '../entities/instance-ai-thread.entity';

@Service()
export class InstanceAiThreadRepository extends Repository<InstanceAiThread> {
	constructor(dataSource: DataSource) {
		super(InstanceAiThread, dataSource.manager);
	}
}
