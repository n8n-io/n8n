import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiObservationCursorEntity } from '../entities/instance-ai-observation-cursor.entity';

@Service()
export class InstanceAiObservationCursorRepository extends Repository<InstanceAiObservationCursorEntity> {
	constructor(dataSource: DataSource) {
		super(InstanceAiObservationCursorEntity, dataSource.manager);
	}
}
