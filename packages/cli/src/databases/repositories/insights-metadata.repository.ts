import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InsightsMetadata } from '../../insights/entities/insights-metadata';

@Service()
export class InsightsMetadataRepository extends Repository<InsightsMetadata> {
	constructor(dataSource: DataSource) {
		super(InsightsMetadata, dataSource.manager);
	}
}
