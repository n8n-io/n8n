import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiObservation } from '../entities/instance-ai-observation.entity';

@Service()
export class InstanceAiObservationRepository extends Repository<InstanceAiObservation> {
	constructor(dataSource: DataSource) {
		super(InstanceAiObservation, dataSource.manager);
	}
}
