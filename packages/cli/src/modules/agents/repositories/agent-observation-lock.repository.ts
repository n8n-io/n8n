import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentObservationLockEntity } from '../entities/agent-observation-lock.entity';

@Service()
export class AgentObservationLockRepository extends Repository<AgentObservationLockEntity> {
	constructor(dataSource: DataSource) {
		super(AgentObservationLockEntity, dataSource.manager);
	}
}
