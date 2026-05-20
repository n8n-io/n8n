import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiObservationEntity } from '../entities/instance-ai-observation.entity';

@Service()
export class InstanceAiObservationRepository extends Repository<InstanceAiObservationEntity> {
	constructor(dataSource: DataSource) {
		super(InstanceAiObservationEntity, dataSource.manager);
	}
}
