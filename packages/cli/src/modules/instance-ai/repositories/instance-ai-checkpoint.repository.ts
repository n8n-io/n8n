import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiCheckpoint } from '../entities/instance-ai-checkpoint.entity';

@Service()
export class InstanceAiCheckpointRepository extends Repository<InstanceAiCheckpoint> {
	constructor(dataSource: DataSource) {
		super(InstanceAiCheckpoint, dataSource.manager);
	}
}
