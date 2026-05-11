import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiWorkflowSnapshot } from '../entities/instance-ai-workflow-snapshot.entity';

@Service()
export class InstanceAiWorkflowSnapshotRepository extends Repository<InstanceAiWorkflowSnapshot> {
	constructor(dataSource: DataSource) {
		super(InstanceAiWorkflowSnapshot, dataSource.manager);
	}
}
