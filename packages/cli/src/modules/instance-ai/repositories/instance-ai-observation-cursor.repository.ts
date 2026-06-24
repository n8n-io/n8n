import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiObservationCursor } from '../entities/instance-ai-observation-cursor.entity';

@Service()
export class InstanceAiObservationCursorRepository extends Repository<InstanceAiObservationCursor> {
	constructor(dataSource: DataSource) {
		super(InstanceAiObservationCursor, dataSource.manager);
	}
}
