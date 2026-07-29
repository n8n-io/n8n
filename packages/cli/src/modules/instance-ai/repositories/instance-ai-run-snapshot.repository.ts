import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiRunSnapshot } from '../entities/instance-ai-run-snapshot.entity';

@Service()
export class InstanceAiRunSnapshotRepository extends Repository<InstanceAiRunSnapshot> {
	constructor(dataSource: DataSource) {
		super(InstanceAiRunSnapshot, dataSource.manager);
	}
}
