import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiObservationLock } from '../entities/instance-ai-observation-lock.entity';

@Service()
export class InstanceAiObservationLockRepository extends Repository<InstanceAiObservationLock> {
	constructor(dataSource: DataSource) {
		super(InstanceAiObservationLock, dataSource.manager);
	}
}
