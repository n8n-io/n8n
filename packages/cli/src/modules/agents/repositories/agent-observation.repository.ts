import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentObservationEntity } from '../entities/agent-observation.entity';

@Service()
export class AgentObservationRepository extends Repository<AgentObservationEntity> {
	constructor(dataSource: DataSource) {
		super(AgentObservationEntity, dataSource.manager);
	}
}
