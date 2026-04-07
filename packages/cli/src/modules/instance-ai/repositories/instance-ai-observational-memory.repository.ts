import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiObservationalMemory } from '../entities/instance-ai-observational-memory.entity';

@Service()
export class InstanceAiObservationalMemoryRepository extends Repository<InstanceAiObservationalMemory> {
	constructor(dataSource: DataSource) {
		super(InstanceAiObservationalMemory, dataSource.manager);
	}
}
