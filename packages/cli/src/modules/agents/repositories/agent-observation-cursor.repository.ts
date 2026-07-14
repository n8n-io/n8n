import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentObservationCursorEntity } from '../entities/agent-observation-cursor.entity.js';

@Service()
export class AgentObservationCursorRepository extends Repository<AgentObservationCursorEntity> {
	constructor(dataSource: DataSource) {
		super(AgentObservationCursorEntity, dataSource.manager);
	}
}
