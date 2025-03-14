import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InsightsRaw } from '../entities/insights-raw';

@Service()
export class InsightsRawRepository extends Repository<InsightsRaw> {
	constructor(dataSource: DataSource) {
		super(InsightsRaw, dataSource.manager);
	}
}
