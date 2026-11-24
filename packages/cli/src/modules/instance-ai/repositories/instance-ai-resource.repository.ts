import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiResource } from '../entities/instance-ai-resource.entity';

@Service()
export class InstanceAiResourceRepository extends Repository<InstanceAiResource> {
	constructor(dataSource: DataSource) {
		super(InstanceAiResource, dataSource.manager);
	}
}
