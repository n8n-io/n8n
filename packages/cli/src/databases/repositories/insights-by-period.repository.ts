import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InsightsByPeriod } from '../../modules/insights/entities/insights-by-period';

@Service()
export class InsightsByPeriodRepository extends Repository<InsightsByPeriod> {
	constructor(dataSource: DataSource) {
		super(InsightsByPeriod, dataSource.manager);
	}
}
